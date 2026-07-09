import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import * as fs from 'fs';

import { Database } from './db/Database';
import { CollectionRepository } from './db/CollectionRepository';
import { RequestRepository } from './db/RequestRepository';
import { EnvironmentRepository } from './db/EnvironmentRepository';
import { HistoryRepository } from './db/HistoryRepository';
import { HttpClient } from './services/HttpClient';
import { EnvironmentService } from './services/EnvironmentService';
import { RequestService } from './services/RequestService';
import {
  ApiRequest,
  BodyMode,
  Collection,
  Environment,
  ExportedCollection,
  FormDataPair,
  HeaderPair,
  IpcResult,
} from './models/types';
import { ValidationError } from './errors/AppError';

// --- COMPOSITION ROOT: satu-satunya tempat semua dependency dirakit ---
let collectionRepo: CollectionRepository;
let requestRepo: RequestRepository;
let environmentRepo: EnvironmentRepository;
let historyRepo: HistoryRepository;
let requestService: RequestService;
let environmentService: EnvironmentService;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  if (!app.isPackaged) win.webContents.openDevTools();
}

/** Bungkus operasi sinkron menjadi IpcResult yang aman dikirim lewat IPC. */
function guard<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    return toErrorResult(e);
  }
}

async function guardAsync<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return toErrorResult(e);
  }
}

function toErrorResult(e: unknown): IpcResult<never> {
  const err = e as { name?: string; code?: string; message?: string };

  return {
    ok: false,
    error: {
      name: err?.name ?? 'Error',
      code: err?.code ?? 'UNKNOWN',
      message: err?.message ?? String(e),
    },
  };
}

function normalizeName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Nama collection tidak boleh kosong');
  }

  return trimmed;
}

function ensureUniqueCollectionName(name: string): string {
  const existingNames = new Set(
    collectionRepo.findAll().map((c) => c.name.toLowerCase())
  );

  const base = normalizeName(name);

  if (!existingNames.has(base.toLowerCase())) return base;

  let counter = 1;
  let candidate = `${base} (Imported)`;

  while (existingNames.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (Imported ${counter})`;
  }

  return candidate;
}

function assertCollectionNameAvailable(name: string, ignoreId?: number): string {
  const normalized = normalizeName(name);

  const duplicate = collectionRepo
    .findAll()
    .some(
      (c) =>
        c.id !== ignoreId &&
        c.name.toLowerCase() === normalized.toLowerCase()
    );

  if (duplicate) {
    throw new ValidationError(`Collection dengan nama "${normalized}" sudah ada`);
  }

  return normalized;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'collection';
}

function isHeaderPair(value: unknown): value is HeaderPair {
  const h = value as Partial<HeaderPair>;

  return (
    typeof h === 'object' &&
    h !== null &&
    typeof h.key === 'string' &&
    typeof h.value === 'string' &&
    typeof h.enabled === 'boolean'
  );
}

function isFormDataPair(value: unknown): value is FormDataPair {
  const pair = value as Partial<FormDataPair>;

  return (
    typeof pair === 'object' &&
    pair !== null &&
    typeof pair.key === 'string' &&
    typeof pair.value === 'string' &&
    typeof pair.enabled === 'boolean'
  );
}

function parseBodyMode(value: unknown): BodyMode {
  if (value === 'form-data') return 'form-data';
  return 'raw';
}

function validateExportedCollection(value: unknown): ExportedCollection {
  const data = value as Partial<ExportedCollection>;

  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('File import harus berupa object JSON');
  }

  if (typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new ValidationError('File import harus memiliki field name');
  }

  if (!Array.isArray(data.requests)) {
    throw new ValidationError('File import harus memiliki field requests berupa array');
  }

  const allowedMethods = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

  const requests = data.requests.map((req, index) => {
    if (typeof req !== 'object' || req === null) {
      throw new ValidationError(`Request ke-${index + 1} tidak valid`);
    }

    const raw = req as Partial<ApiRequest>;
    const method = String(raw.method ?? '').toUpperCase();

    if (!allowedMethods.has(method)) {
      throw new ValidationError(`Method request ke-${index + 1} tidak valid`);
    }

    if (typeof raw.url !== 'string' || raw.url.trim().length === 0) {
      throw new ValidationError(`URL request ke-${index + 1} tidak boleh kosong`);
    }

    const headers = Array.isArray(raw.headers)
      ? raw.headers.filter(isHeaderPair)
      : [];

    const bodyMode = parseBodyMode(raw.bodyMode);

    const formData = Array.isArray(raw.formData)
      ? raw.formData.filter(isFormDataPair)
      : [];

    return {
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim()
          : raw.url.trim(),
      method,
      url: raw.url.trim(),
      headers,
      bodyMode,
      body: typeof raw.body === 'string' ? raw.body : '',
      formData,
    };
  });

  return {
    schemaVersion: 1,
    name: data.name.trim(),
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
    requests,
  };
}

function exportCollectionToJson(id: number): boolean {
  const collection = collectionRepo.findById(id);

  if (!collection) {
    throw new ValidationError('Collection tidak ditemukan');
  }

  const requests = requestRepo.listByCollection(id);

  const data: ExportedCollection = {
    schemaVersion: 1,
    name: collection.name,
    exportedAt: new Date().toISOString(),
    requests: requests.map((req) => ({
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyMode: req.bodyMode ?? 'raw',
      body: req.body,
      formData: req.formData ?? [],
    })),
  };

  const filePath = dialog.showSaveDialogSync({
    title: 'Export Collection JSON',
    defaultPath: `${sanitizeFileName(collection.name)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!filePath) return false;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  return true;
}

function importCollectionFromJson(): Collection | null {
  const files = dialog.showOpenDialogSync({
    title: 'Import Collection JSON',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!files || files.length === 0) return null;

  const raw = fs.readFileSync(files[0], 'utf-8');
  const parsed = validateExportedCollection(JSON.parse(raw));

  const collection = collectionRepo.insert({
    name: ensureUniqueCollectionName(parsed.name),
  });

  for (const req of parsed.requests) {
    requestRepo.insert({
      collectionId: collection.id ?? null,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyMode: req.bodyMode ?? 'raw',
      body: req.body,
      formData: req.formData ?? [],
    });
  }

  return collection;
}

function registerIpc(): void {
  // ---- HTTP ----
  ipcMain.handle('http:send', (_e, req: ApiRequest) =>
    guardAsync(() => requestService.send(req))
  );

  // ---- Collections ----
  ipcMain.handle('collections:list', () =>
    guard(() => collectionRepo.findAll())
  );

  ipcMain.handle('collections:create', (_e, name: string) =>
    guard(() =>
      collectionRepo.insert({
        name: assertCollectionNameAvailable(name),
      })
    )
  );

  ipcMain.handle('collections:rename', (_e, id: number, name: string) =>
    guard(() =>
      collectionRepo.update(id, {
        name: assertCollectionNameAvailable(name, id),
      })
    )
  );

  ipcMain.handle('collections:delete', (_e, id: number) =>
    guard(() => collectionRepo.delete(id))
  );

  ipcMain.handle('collections:export', (_e, id: number) =>
    guard(() => exportCollectionToJson(id))
  );

  ipcMain.handle('collections:import', () =>
    guard(() => importCollectionFromJson())
  );

  // ---- Requests (di dalam collection) ----
  ipcMain.handle('requests:listByCollection', (_e, collectionId: number) =>
    guard(() => requestRepo.listByCollection(collectionId))
  );

  ipcMain.handle('requests:save', (_e, req: ApiRequest) =>
    guard(() => (req.id ? requestRepo.update(req.id, req) : requestRepo.insert(req)))
  );

  ipcMain.handle('requests:delete', (_e, id: number) =>
    guard(() => requestRepo.delete(id))
  );

  // ---- Environments ----
  ipcMain.handle('environments:list', () =>
    guard(() => environmentService.list())
  );

  ipcMain.handle('environments:save', (_e, env: Environment) =>
    guard(() => environmentService.save(env))
  );

  ipcMain.handle('environments:delete', (_e, id: number) =>
    guard(() => environmentService.remove(id))
  );

  ipcMain.handle('environments:setActive', (_e, id: number) =>
    guard(() => environmentService.setActive(id))
  );

  // ---- History ----
  ipcMain.handle('history:list', () =>
    guard(() => historyRepo.findAll())
  );

  ipcMain.handle('history:clear', () =>
    guard(() => historyRepo.clear())
  );
}

app.whenReady().then(() => {
  const db = Database.getInstance();

  // Layer 1: repositories
  collectionRepo = new CollectionRepository(db);
  requestRepo = new RequestRepository(db);
  environmentRepo = new EnvironmentRepository(db);
  historyRepo = new HistoryRepository(db);

  // Layer 2: services
  environmentService = new EnvironmentService(environmentRepo);
  requestService = new RequestService(
    new HttpClient(),
    environmentService,
    historyRepo
  );

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  Database.close();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
