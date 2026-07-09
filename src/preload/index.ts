import { contextBridge, ipcRenderer } from 'electron';
import type {
  ApiRequest,
  ApiResponse,
  Collection,
  Environment,
  HistoryEntry,
  IpcResult,
} from '../main/models/types';

/**
 * PRELOAD — jembatan aman antara renderer dan main.
 * Renderer TIDAK bisa mengakses Node/DB langsung; hanya lewat window.api ini.
 */
const api = {
  send: (req: ApiRequest): Promise<IpcResult<ApiResponse>> =>
    ipcRenderer.invoke('http:send', req),

  collections: {
    list: (): Promise<IpcResult<Collection[]>> => ipcRenderer.invoke('collections:list'),
    create: (name: string): Promise<IpcResult<Collection>> =>
      ipcRenderer.invoke('collections:create', name),
    rename: (id: number, name: string): Promise<IpcResult<Collection | null>> =>
      ipcRenderer.invoke('collections:rename', id, name),
    delete: (id: number): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke('collections:delete', id),
    exportJson: (id: number): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke('collections:export', id),
    importJson: (): Promise<IpcResult<Collection | null>> =>
      ipcRenderer.invoke('collections:import'),
  },

  requests: {
    listByCollection: (collectionId: number): Promise<IpcResult<ApiRequest[]>> =>
      ipcRenderer.invoke('requests:listByCollection', collectionId),
    save: (req: ApiRequest): Promise<IpcResult<ApiRequest | null>> =>
      ipcRenderer.invoke('requests:save', req),
    delete: (id: number): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke('requests:delete', id),
  },

  environments: {
    list: (): Promise<IpcResult<Environment[]>> => ipcRenderer.invoke('environments:list'),
    save: (env: Environment): Promise<IpcResult<Environment>> =>
      ipcRenderer.invoke('environments:save', env),
    delete: (id: number): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke('environments:delete', id),
    setActive: (id: number): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('environments:setActive', id),
  },

  history: {
    list: (): Promise<IpcResult<HistoryEntry[]>> => ipcRenderer.invoke('history:list'),
    clear: (): Promise<IpcResult<void>> => ipcRenderer.invoke('history:clear'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
