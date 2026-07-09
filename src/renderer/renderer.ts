import type {
  ApiRequest,
  ApiResponse,
  BodyMode,
  Collection,
  Environment,
  FormDataPair,
  HeaderPair,
  HistoryEntry,
  IpcResult,
} from '../main/models/types';

/** Ambil data dari IpcResult atau lempar Error dengan pesan yang informatif. */
function unwrap<T>(result: IpcResult<T>): T {
  if (!result.ok) {
    throw new Error(`[${result.error?.code}] ${result.error?.message}`);
  }
  return result.data as T;
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
  return el as T;
}

/**
 * RestClientApp — presentation layer (View + Controller sederhana).
 * Meng-encapsulate seluruh DOM logic. Tidak ada akses DB/HTTP langsung —
 * semuanya lewat window.api (yang diteruskan ke main process).
 */
class RestClientApp {
  private editingRequestId: number | null = null;
  private editingCollectionId: number | null = null;

  // Buffer environment yang sedang diedit di modal.
  private envDraft: Environment | null = null;

 init(): void {
  this.setupTabs();
  this.setupRequestBar();
  this.setupHeaders();
  this.setupAuthHelper();
  this.setupBodyModes();
  this.setupFormData();
  this.setupCollections();
  this.setupHistory();
  this.setupEnvModal();

  this.addHeaderRow();
  this.addFormDataRow();
  this.refreshEnvironments();
  this.refreshCollections();
  this.refreshHistory();
}

  // ---------------- Request bar ----------------
  private setupRequestBar(): void {
    $('btn-send').addEventListener('click', () => this.sendRequest());
    $('btn-save').addEventListener('click', () => this.saveRequest());

    $<HTMLInputElement>('url').addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.sendRequest();
    });
  }

  private readRequestFromForm(): ApiRequest {
    return {
      id: this.editingRequestId ?? undefined,
      collectionId: this.editingCollectionId,
      name: $<HTMLInputElement>('url').value.trim() || 'Untitled',
      method: $<HTMLSelectElement>('method').value,
      url: $<HTMLInputElement>('url').value.trim(),
      headers: this.readHeaders(),
      bodyMode: this.getBodyMode(),
      body: $<HTMLTextAreaElement>('body').value,
      formData: this.readFormData(),
    };
  }

  private async sendRequest(): Promise<void> {
  const badge = $('status-badge');
  badge.textContent = 'mengirim…';
  badge.className = 'badge badge-idle';

  try {
    const res = unwrap<ApiResponse>(await window.api.send(this.readRequestFromForm()));
    this.renderResponse(res);
    await this.refreshHistory();
  } catch (err) {
    badge.textContent = 'gagal';
    badge.className = 'badge badge-5xx';
    $('response-body').textContent = err instanceof Error ? err.message : String(err);
  }
}

private renderResponse(res: ApiResponse): void {
  const badge = $('status-badge');
  badge.textContent = `${res.status} ${res.statusText}`;
  badge.className = 'badge ' + this.badgeClass(res.status);

  $('meta-time').textContent = `${res.timeMs} ms`;
  $('meta-size').textContent = this.formatBytes(res.sizeBytes);

  this.renderResponseBody(res.body);

  $('response-headers').textContent = Object.entries(res.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

private renderResponseBody(text: string): void {
  const target = $('response-body');
  const formatted = this.pretty(text);

  try {
    JSON.parse(text);
    target.innerHTML = this.highlightJson(formatted);
  } catch {
    target.textContent = formatted;
  }
}

private highlightJson(json: string): string {
  const escaped = this.escapeHtml(json);

  return escaped.replace(
    /(&quot;(?:\\.|(?!&quot;).)*&quot;)(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
    (match, stringPart, colonPart) => {
      if (stringPart) {
        if (colonPart) {
          return `<span class="json-key">${stringPart}</span>${colonPart}`;
        }

        return `<span class="json-string">${stringPart}</span>`;
      }

      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${match}</span>`;
      }

      if (match === 'null') {
        return `<span class="json-null">${match}</span>`;
      }

      return `<span class="json-number">${match}</span>`;
    }
  );
}

private escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return map[char];
  });
}

private badgeClass(status: number): string {
  if (status >= 200 && status < 300) return 'badge-2xx';
  if (status >= 300 && status < 400) return 'badge-3xx';
  if (status >= 400 && status < 500) return 'badge-4xx';
  return 'badge-5xx';
}

private pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

private formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

  // ---------------- Tabs ----------------
  private setupTabs(): void {
    document.querySelectorAll<HTMLButtonElement>('.tab[data-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-tab]').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const which = tab.dataset.tab;
        $('tab-headers').classList.toggle('hidden', which !== 'headers');
        $('tab-body').classList.toggle('hidden', which !== 'body');
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.rtab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rtab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const which = tab.dataset.rtab;
        $('response-body').classList.toggle('hidden', which !== 'body');
        $('response-headers').classList.toggle('hidden', which !== 'headers');
      });
    });
  }

  // ---------------- Headers editor ----------------
  private setupHeaders(): void {
    $('btn-add-header').addEventListener('click', () => this.addHeaderRow());
  }

  private addHeaderRow(header?: HeaderPair): void {
    const tbody = $('headers-body');
    const tr = document.createElement('tr');

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = header?.enabled ?? true;

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Content-Type';
    keyInput.value = header?.key ?? '';

    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.placeholder = 'application/json';
    valInput.value = header?.value ?? '';

    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'icon-btn';
    del.addEventListener('click', () => tr.remove());

    for (const cell of [chk, keyInput, valInput, del]) {
      const td = document.createElement('td');
      td.appendChild(cell);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  private readHeaders(): HeaderPair[] {
    const rows = Array.from($('headers-body').querySelectorAll('tr'));

    return rows
      .map((tr) => {
        const inputs = tr.querySelectorAll('input');

        const enabled = (inputs[0] as HTMLInputElement).checked;
        const key = (inputs[1] as HTMLInputElement).value;
        const value = (inputs[2] as HTMLInputElement).value;

        return { key, value, enabled };
      })
      .filter((h) => h.key.trim().length > 0);
  }

  // ---------------- Auth Helper ----------------
private setupAuthHelper(): void {
  const authType = $<HTMLSelectElement>('auth-type');

  authType.addEventListener('change', () => {
    this.renderAuthFields();
  });

  $('btn-apply-auth').addEventListener('click', async () => {
    const type = authType.value;

    if (type === 'none') {
      this.removeHeaderByKey('Authorization');
      this.removeHeaderByKey('X-API-Key');
      await this.showMessage('Auth dinonaktifkan.');
      return;
    }

    if (type === 'bearer') {
      const token = $<HTMLInputElement>('auth-token').value.trim();

      if (!token) {
        await this.showMessage('Bearer token tidak boleh kosong.');
        return;
      }

      this.removeHeaderByKey('X-API-Key');
      this.upsertHeader('Authorization', `Bearer ${token}`, true);
      await this.showMessage('Bearer Token berhasil ditambahkan ke headers.');
      return;
    }

    if (type === 'basic') {
      const username = $<HTMLInputElement>('auth-username').value.trim();
      const password = $<HTMLInputElement>('auth-password').value;

      if (!username) {
        await this.showMessage('Username tidak boleh kosong.');
        return;
      }

      const encoded = btoa(`${username}:${password}`);

      this.removeHeaderByKey('X-API-Key');
      this.upsertHeader('Authorization', `Basic ${encoded}`, true);
      await this.showMessage('Basic Auth berhasil ditambahkan ke headers.');
      return;
    }

    if (type === 'api-key') {
      const apiKey = $<HTMLInputElement>('auth-api-key').value.trim();

      if (!apiKey) {
        await this.showMessage('API Key tidak boleh kosong.');
        return;
      }

      this.removeHeaderByKey('Authorization');
      this.upsertHeader('X-API-Key', apiKey, true);
      await this.showMessage('API Key berhasil ditambahkan ke headers.');
    }
  });

  this.renderAuthFields();
}

private renderAuthFields(): void {
  const type = $<HTMLSelectElement>('auth-type').value;

  $('auth-bearer-fields').classList.toggle('hidden', type !== 'bearer');
  $('auth-basic-fields').classList.toggle('hidden', type !== 'basic');
  $('auth-api-key-fields').classList.toggle('hidden', type !== 'api-key');
}

private upsertHeader(key: string, value: string, enabled = true): void {
  const rows = Array.from($('headers-body').querySelectorAll('tr'));

  for (const tr of rows) {
    const inputs = tr.querySelectorAll('input');

    const chk = inputs[0] as HTMLInputElement;
    const keyInput = inputs[1] as HTMLInputElement;
    const valInput = inputs[2] as HTMLInputElement;

    if (keyInput.value.trim().toLowerCase() === key.toLowerCase()) {
      chk.checked = enabled;
      keyInput.value = key;
      valInput.value = value;
      return;
    }
  }

  this.addHeaderRow({
    key,
    value,
    enabled,
  });
}

private removeHeaderByKey(key: string): void {
  const rows = Array.from($('headers-body').querySelectorAll('tr'));

  for (const tr of rows) {
    const inputs = tr.querySelectorAll('input');
    const keyInput = inputs[1] as HTMLInputElement;

    if (keyInput.value.trim().toLowerCase() === key.toLowerCase()) {
      tr.remove();
    }
  }

  if ($('headers-body').querySelectorAll('tr').length === 0) {
    this.addHeaderRow();
  }
}

private syncAuthHelperFromHeaders(): void {
  const authType = $<HTMLSelectElement>('auth-type');

  const tokenInput = $<HTMLInputElement>('auth-token');
  const usernameInput = $<HTMLInputElement>('auth-username');
  const passwordInput = $<HTMLInputElement>('auth-password');
  const apiKeyInput = $<HTMLInputElement>('auth-api-key');

  authType.value = 'none';
  tokenInput.value = '';
  usernameInput.value = '';
  passwordInput.value = '';
  apiKeyInput.value = '';

  const rows = Array.from($('headers-body').querySelectorAll('tr'));

  for (const tr of rows) {
    const inputs = tr.querySelectorAll('input');

    const keyInput = inputs[1] as HTMLInputElement;
    const valInput = inputs[2] as HTMLInputElement;

    const key = keyInput.value.trim().toLowerCase();
    const value = valInput.value.trim();

    if (key === 'authorization') {
      if (value.toLowerCase().startsWith('bearer ')) {
        authType.value = 'bearer';
        tokenInput.value = value.slice(7);
        this.renderAuthFields();
        return;
      }

      if (value.toLowerCase().startsWith('basic ')) {
        authType.value = 'basic';

        try {
          const decoded = atob(value.slice(6));
          const separatorIndex = decoded.indexOf(':');

          if (separatorIndex >= 0) {
            usernameInput.value = decoded.slice(0, separatorIndex);
            passwordInput.value = decoded.slice(separatorIndex + 1);
          }
        } catch {
          usernameInput.value = '';
          passwordInput.value = '';
        }

        this.renderAuthFields();
        return;
      }
    }

    if (key === 'x-api-key') {
      authType.value = 'api-key';
      apiKeyInput.value = value;
      this.renderAuthFields();
      return;
    }
  }

  this.renderAuthFields();
}

  // ---------------- Body mode & Form Data editor ----------------
  private setupBodyModes(): void {
    document.querySelectorAll<HTMLButtonElement>('.body-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bodyMode as BodyMode;
        this.setBodyMode(mode);
      });
    });
  }

  private setupFormData(): void {
    $('btn-add-form-data').addEventListener('click', () => this.addFormDataRow());
  }

  private getBodyMode(): BodyMode {
    const active = document.querySelector<HTMLButtonElement>('.body-mode.active');
    const mode = active?.dataset.bodyMode;

    if (mode === 'form-data') return 'form-data';
    return 'raw';
  }

  private setBodyMode(mode: BodyMode): void {
    document.querySelectorAll<HTMLButtonElement>('.body-mode').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.bodyMode === mode);
    });

    $('body-raw-panel').classList.toggle('hidden', mode !== 'raw');
    $('body-form-data-panel').classList.toggle('hidden', mode !== 'form-data');
  }

  private addFormDataRow(pair?: FormDataPair): void {
    const tbody = $('form-data-body');
    const tr = document.createElement('tr');

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = pair?.enabled ?? true;

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'title';
    keyInput.value = pair?.key ?? '';

    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.placeholder = 'Belajar PBO';
    valInput.value = pair?.value ?? '';

    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'icon-btn';
    del.addEventListener('click', () => tr.remove());

    for (const cell of [chk, keyInput, valInput, del]) {
      const td = document.createElement('td');
      td.appendChild(cell);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  private readFormData(): FormDataPair[] {
    const rows = Array.from($('form-data-body').querySelectorAll('tr'));

    return rows
      .map((tr) => {
        const inputs = tr.querySelectorAll('input');

        const enabled = (inputs[0] as HTMLInputElement).checked;
        const key = (inputs[1] as HTMLInputElement).value;
        const value = (inputs[2] as HTMLInputElement).value;

        return { key, value, enabled };
      })
      .filter((pair) => pair.key.trim().length > 0);
  }

  private loadRequest(req: ApiRequest): void {
  this.editingRequestId = req.id ?? null;
  this.editingCollectionId = req.collectionId;

  $<HTMLSelectElement>('method').value = req.method;
  $<HTMLInputElement>('url').value = req.url;
  $<HTMLTextAreaElement>('body').value = req.body ?? '';

  this.setBodyMode(req.bodyMode ?? 'raw');

  $('headers-body').innerHTML = '';

  if ((req.headers ?? []).length === 0) {
    this.addHeaderRow();
  } else {
    req.headers.forEach((h) => this.addHeaderRow(h));
  }

  this.syncAuthHelperFromHeaders();

  $('form-data-body').innerHTML = '';

  const formData = req.formData ?? [];

  if (formData.length === 0) {
    this.addFormDataRow();
  } else {
    formData.forEach((pair) => this.addFormDataRow(pair));
  }
}
  // ---------------- Collections ----------------
  private setupCollections(): void {
    $('btn-add-collection').addEventListener('click', async () => {
      const name = await this.askText('Nama collection baru:');

      if (!name) return;

      try {
        unwrap(await window.api.collections.create(name));
        await this.refreshCollections();
      } catch (err) {
        await this.showMessage(err instanceof Error ? err.message : String(err));
      }
    });

    $('btn-import-collection').addEventListener('click', async () => {
      try {
        const imported = unwrap<Collection | null>(await window.api.collections.importJson());

        if (imported) {
          await this.refreshCollections();
          await this.showMessage(`Collection "${imported.name}" berhasil diimport.`);
        }
      } catch (err) {
        await this.showMessage(err instanceof Error ? err.message : String(err));
      }
    });
  }

  private async saveRequest(): Promise<void> {
    const collections = unwrap<Collection[]>(await window.api.collections.list());

    if (collections.length === 0) {
      await this.showMessage('Buat collection dulu (tombol + Baru di sidebar).');
      return;
    }

    const names = collections.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const currentIndex = this.editingCollectionId
      ? collections.findIndex((c) => c.id === this.editingCollectionId) + 1
      : 1;

    const pick = await this.askText(
      `Simpan ke collection nomor berapa?\n${names}`,
      String(currentIndex > 0 ? currentIndex : 1)
    );

    if (!pick) return;

    const idx = Number(pick) - 1;
    if (Number.isNaN(idx) || !collections[idx]) return;

    const req = this.readRequestFromForm();
    const name = (await this.askText('Nama request:', req.name)) ?? req.name;

    req.name = name;
    req.collectionId = collections[idx].id ?? null;

    unwrap(await window.api.requests.save(req));
    await this.refreshCollections();
  }

  private async refreshCollections(): Promise<void> {
    const container = $('collections');
    container.innerHTML = '';

    const collections = unwrap<Collection[]>(await window.api.collections.list());

    for (const coll of collections) {
      const wrap = document.createElement('div');
      wrap.className = 'coll-item';

      const head = document.createElement('div');
      head.className = 'coll-name';

      const label = document.createElement('span');
      label.textContent = coll.name;

      const actions = document.createElement('div');
      actions.className = 'coll-actions';

      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Rename';
      renameBtn.className = 'btn-mini';
      renameBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const newName = await this.askText('Nama collection baru:', coll.name);
        if (!newName || newName === coll.name) return;

        try {
          unwrap(await window.api.collections.rename(coll.id!, newName));
          await this.refreshCollections();
        } catch (err) {
          await this.showMessage(err instanceof Error ? err.message : String(err));
        }
      });

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.className = 'btn-mini';
      exportBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        try {
          const exported = unwrap<boolean>(await window.api.collections.exportJson(coll.id!));

          if (exported) {
            await this.showMessage(`Collection "${coll.name}" berhasil diexport.`);
          }
        } catch (err) {
          await this.showMessage(err instanceof Error ? err.message : String(err));
        }
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.className = 'icon-btn';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const ok = await this.askConfirm(`Hapus collection "${coll.name}"?`);
        if (!ok) return;

        try {
          unwrap(await window.api.collections.delete(coll.id!));

          if (this.editingCollectionId === coll.id) {
            this.editingCollectionId = null;
            this.editingRequestId = null;
          }

          await this.refreshCollections();
        } catch (err) {
          await this.showMessage(err instanceof Error ? err.message : String(err));
        }
      });

      actions.appendChild(renameBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);

      head.appendChild(label);
      head.appendChild(actions);
      wrap.appendChild(head);

      const requests = unwrap<ApiRequest[]>(
        await window.api.requests.listByCollection(coll.id!)
      );

      for (const req of requests) {
        const item = document.createElement('div');
        item.className = 'req-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.gap = '6px';

        const reqMain = document.createElement('div');
        reqMain.style.flex = '1';
        reqMain.style.cursor = 'pointer';

        const method = document.createElement('span');
        method.className = 'req-method';
        method.textContent = req.method;

        const reqName = document.createElement('span');
        reqName.textContent = req.name;

        reqMain.appendChild(method);
        reqMain.appendChild(reqName);
        reqMain.addEventListener('click', () => this.loadRequest(req));

        const reqActions = document.createElement('div');
        reqActions.style.display = 'flex';
        reqActions.style.gap = '4px';

        const renameReqBtn = document.createElement('button');
        renameReqBtn.textContent = 'Rename';
        renameReqBtn.className = 'btn-mini';
        renameReqBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          const newName = await this.askText('Nama request baru:', req.name);
          if (!newName || newName === req.name) return;

          try {
            const renamedReq: ApiRequest = { ...req, name: newName };
            unwrap(await window.api.requests.save(renamedReq));
            await this.refreshCollections();
          } catch (err) {
            await this.showMessage(err instanceof Error ? err.message : String(err));
          }
        });

        const deleteReqBtn = document.createElement('button');
        deleteReqBtn.textContent = '✕';
        deleteReqBtn.className = 'icon-btn';
        deleteReqBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          if (!req.id) return;

          const ok = await this.askConfirm(`Hapus request "${req.name}"?`);
          if (!ok) return;

          try {
            unwrap(await window.api.requests.delete(req.id));

            if (this.editingRequestId === req.id) {
              this.editingRequestId = null;
              this.editingCollectionId = null;
            }

            await this.refreshCollections();
          } catch (err) {
            await this.showMessage(err instanceof Error ? err.message : String(err));
          }
        });

        reqActions.appendChild(renameReqBtn);
        reqActions.appendChild(deleteReqBtn);

        item.appendChild(reqMain);
        item.appendChild(reqActions);
        wrap.appendChild(item);
      }

      container.appendChild(wrap);
    }
  }

  // ---------------- History ----------------
  private setupHistory(): void {
    $('btn-clear-history').addEventListener('click', async () => {
      unwrap(await window.api.history.clear());
      await this.refreshHistory();
    });
  }

  private async refreshHistory(): Promise<void> {
    const container = $('history');
    container.innerHTML = '';

    const entries = unwrap<HistoryEntry[]>(await window.api.history.list());

    for (const h of entries) {
      const item = document.createElement('div');
      item.className = 'hist-item';

      const method = document.createElement('span');
      method.className = 'hist-method';
      method.textContent = h.method;

      const url = document.createElement('span');
      url.textContent = h.url;

      item.appendChild(method);
      item.appendChild(url);
      item.title = `${h.status} • ${h.timeMs}ms • ${h.createdAt}`;
      item.addEventListener('click', () => this.loadRequest(h.request));

      container.appendChild(item);
    }
  }

  // ---------------- Environments ----------------
  private setupEnvModal(): void {
    $('env-select').addEventListener('change', async (e) => {
      const id = Number((e.target as HTMLSelectElement).value);
      if (id) unwrap(await window.api.environments.setActive(id));
    });

    $('btn-manage-env').addEventListener('click', () => this.openEnvModal());
    $('btn-close-env').addEventListener('click', () => $('env-modal').classList.add('hidden'));
    $('btn-add-var').addEventListener('click', () => this.addVarRow());

    $('btn-new-env').addEventListener('click', () => {
      this.envDraft = { name: 'New Env', isActive: false, variables: {} };
      this.renderEnvDraft();
    });

    $('btn-del-env').addEventListener('click', async () => {
      if (!this.envDraft?.id) return;

      const ok = await this.askConfirm('Hapus environment ini?');
      if (!ok) return;

      try {
        unwrap(await window.api.environments.delete(this.envDraft.id));
        await this.openEnvModal();
        await this.refreshEnvironments();
      } catch (err) {
        await this.showMessage(err instanceof Error ? err.message : String(err));
      }
    });

    $('env-modal-select').addEventListener('change', async (e) => {
      const id = Number((e.target as HTMLSelectElement).value);
      const list = unwrap<Environment[]>(await window.api.environments.list());

      this.envDraft = list.find((x) => x.id === id) ?? null;
      this.renderEnvDraft();
    });

    $('btn-save-env').addEventListener('click', () => this.saveEnvDraft());
  }

  private async refreshEnvironments(): Promise<void> {
    const list = unwrap<Environment[]>(await window.api.environments.list());
    const select = $<HTMLSelectElement>('env-select');

    select.innerHTML = '<option value="0">(tanpa environment)</option>';

    for (const env of list) {
      const opt = document.createElement('option');
      opt.value = String(env.id);
      opt.textContent = env.name;

      if (env.isActive) opt.selected = true;

      select.appendChild(opt);
    }
  }

  private async openEnvModal(): Promise<void> {
    const list = unwrap<Environment[]>(await window.api.environments.list());
    const select = $<HTMLSelectElement>('env-modal-select');

    select.innerHTML = '';

    for (const env of list) {
      const opt = document.createElement('option');
      opt.value = String(env.id);
      opt.textContent = env.name;
      select.appendChild(opt);
    }

    this.envDraft = list[0] ?? { name: 'New Env', isActive: false, variables: {} };
    this.renderEnvDraft();

    $('env-modal').classList.remove('hidden');
  }

  private renderEnvDraft(): void {
    if (!this.envDraft) return;

    $<HTMLInputElement>('env-name').value = this.envDraft.name;

    const tbody = $('env-vars-body');
    tbody.innerHTML = '';

    const entries = Object.entries(this.envDraft.variables);

    if (entries.length === 0) {
      this.addVarRow();
    } else {
      entries.forEach(([k, v]) => this.addVarRow(k, v));
    }
  }

  private addVarRow(key = '', value = ''): void {
    const tbody = $('env-vars-body');
    const tr = document.createElement('tr');

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'base_url';
    keyInput.value = key;

    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.placeholder = 'https://api.example.com';
    valInput.value = value;

    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'icon-btn';
    del.addEventListener('click', () => tr.remove());

    for (const cell of [keyInput, valInput, del]) {
      const td = document.createElement('td');
      td.appendChild(cell);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  private async saveEnvDraft(): Promise<void> {
    if (!this.envDraft) return;

    const variables: Record<string, string> = {};

    for (const tr of Array.from($('env-vars-body').querySelectorAll('tr'))) {
      const inputs = tr.querySelectorAll('input');

      const k = (inputs[0] as HTMLInputElement).value.trim();
      const v = (inputs[1] as HTMLInputElement).value;

      if (k) variables[k] = v;
    }

    const env: Environment = {
      ...this.envDraft,
      name: $<HTMLInputElement>('env-name').value.trim() || 'Untitled',
      variables,
    };

    try {
      const saved = unwrap<Environment>(await window.api.environments.save(env));
      this.envDraft = saved;

      await this.openEnvModal();
      await this.refreshEnvironments();

      await this.showMessage('Environment tersimpan.');
    } catch (err) {
      await this.showMessage(err instanceof Error ? err.message : String(err));
    }
  }

  // ---------------- Dialog sederhana pengganti prompt/confirm/alert ----------------
  private askText(message: string, defaultValue = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal';

      const card = document.createElement('div');
      card.className = 'modal-card';

      const title = document.createElement('h3');
      title.textContent = message;
      title.style.whiteSpace = 'pre-line';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn-primary';
      okBtn.textContent = 'OK';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.textContent = 'Batal';

      const close = (value: string | null): void => {
        overlay.remove();
        resolve(value);
      };

      okBtn.addEventListener('click', () => close(input.value.trim()));
      cancelBtn.addEventListener('click', () => close(null));

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value.trim());
        if (e.key === 'Escape') close(null);
      });

      actions.appendChild(okBtn);
      actions.appendChild(cancelBtn);

      card.appendChild(title);
      card.appendChild(input);
      card.appendChild(actions);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      input.focus();
      input.select();
    });
  }

  private askConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal';

      const card = document.createElement('div');
      card.className = 'modal-card';

      const title = document.createElement('h3');
      title.textContent = message;
      title.style.whiteSpace = 'pre-line';

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.className = 'btn-primary';
      yesBtn.textContent = 'Ya';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.textContent = 'Batal';

      const close = (value: boolean): void => {
        overlay.remove();
        resolve(value);
      };

      yesBtn.addEventListener('click', () => close(true));
      cancelBtn.addEventListener('click', () => close(false));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(false);
      });

      actions.appendChild(yesBtn);
      actions.appendChild(cancelBtn);

      card.appendChild(title);
      card.appendChild(actions);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      yesBtn.focus();
    });
  }

  private showMessage(message: string): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal';

      const card = document.createElement('div');
      card.className = 'modal-card';

      const title = document.createElement('h3');
      title.textContent = message;
      title.style.whiteSpace = 'pre-line';

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn-primary';
      okBtn.textContent = 'OK';

      const close = (): void => {
        overlay.remove();
        resolve();
      };

      okBtn.addEventListener('click', close);

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') close();
      });

      actions.appendChild(okBtn);

      card.appendChild(title);
      card.appendChild(actions);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      okBtn.focus();
    });
  }
}

new RestClientApp().init();
