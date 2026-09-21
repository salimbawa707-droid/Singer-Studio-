/**
 * Phase 2: IndexedDB Persistent Storage Adapter
 * 
 * Provides durable, transactional, and atomic storage for:
 * 1. Project metadata & state (canonical StudioProject records)
 * 2. Crash recovery checkpoints & drafts
 * 3. Audio asset metadata
 * 4. Raw binary audio payloads (Blobs/ArrayBuffers)
 * 
 * Includes an in-memory fallback for test runners or environments without IndexedDB.
 */

export interface StorageAdapter {
  init(): Promise<void>;
  get<T>(storeName: string, key: string): Promise<T | null>;
  set<T>(storeName: string, key: string, value: T): Promise<void>;
  delete(storeName: string, key: string): Promise<boolean>;
  list<T>(storeName: string): Promise<T[]>;
  clear(storeName: string): Promise<void>;
  has(storeName: string, key: string): Promise<boolean>;
}

const DB_NAME = 'SurgeStudioPersistentDB';
const DB_VERSION = 1;

export const STORES = {
  PROJECTS: 'projects',
  PROJECT_DRAFTS: 'project_drafts',
  ASSETS: 'assets',
  ASSET_PAYLOADS: 'asset_payloads',
} as const;

export class IndexedDbAdapter implements StorageAdapter {
  private static instance: IndexedDbAdapter;
  private db: IDBDatabase | null = null;
  private isMemoryFallback: boolean = false;
  private memoryStore: Map<string, Map<string, any>> = new Map();

  private constructor() {
    Object.values(STORES).forEach(store => {
      this.memoryStore.set(store, new Map());
    });
  }

  public static getInstance(): IndexedDbAdapter {
    if (!IndexedDbAdapter.instance) {
      IndexedDbAdapter.instance = new IndexedDbAdapter();
    }
    return IndexedDbAdapter.instance;
  }

  public async init(): Promise<void> {
    if (this.db || this.isMemoryFallback) return;

    if (typeof indexedDB === 'undefined') {
      this.isMemoryFallback = true;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
            db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.PROJECT_DRAFTS)) {
            db.createObjectStore(STORES.PROJECT_DRAFTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.ASSETS)) {
            const assetStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
            assetStore.createIndex('projectId', 'projectId', { unique: false });
            assetStore.createIndex('checksum', 'checksum', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORES.ASSET_PAYLOADS)) {
            db.createObjectStore(STORES.ASSET_PAYLOADS, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event: Event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };

        request.onerror = (event: Event) => {
          console.warn('[IndexedDbAdapter] IndexedDB open error, falling back to memory store:', request.error);
          this.isMemoryFallback = true;
          resolve();
        };
      } catch (err) {
        console.warn('[IndexedDbAdapter] IndexedDB not available, falling back to memory store:', err);
        this.isMemoryFallback = true;
        resolve();
      }
    });
  }

  public async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.init();

    if (this.isMemoryFallback || !this.db) {
      const store = this.memoryStore.get(storeName);
      const val = store?.get(key);
      if (val === undefined || val === null) return null;
      if (typeof val === 'object' && 'payload' in val && Object.keys(val).length <= 3) {
        return (val as any).payload as T;
      }
      return (typeof val === 'object' && !(val instanceof Blob) && !(val instanceof ArrayBuffer) && !ArrayBuffer.isView(val))
        ? JSON.parse(JSON.stringify(val))
        : val;
    }

    return new Promise<T | null>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result;
          if (res === undefined || res === null) {
            resolve(null);
            return;
          }
          if (typeof res === 'object' && res !== null && 'payload' in res && Object.keys(res).length <= 3) {
            resolve(res.payload as T);
          } else {
            resolve(res as T);
          }
        };
        req.onerror = () => {
          reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public async set<T>(storeName: string, key: string, value: T): Promise<void> {
    await this.init();

    if (this.isMemoryFallback || !this.db) {
      const store = this.memoryStore.get(storeName);
      if (store) {
        const isBinary = value instanceof ArrayBuffer || value instanceof Blob || ArrayBuffer.isView(value);
        if (isBinary) {
          store.set(key, { id: key, payload: value });
        } else {
          store.set(key, (typeof value === 'object' && value !== null) 
            ? JSON.parse(JSON.stringify(value)) 
            : value
          );
        }
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        let record: any = value;
        const isBinary = value instanceof ArrayBuffer || value instanceof Blob || ArrayBuffer.isView(value);
        if (isBinary) {
          record = { id: key, payload: value };
        } else if (typeof value === 'object' && value !== null && !('id' in (value as any))) {
          record = { ...(value as any), id: key };
        }

        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async delete(storeName: string, key: string): Promise<boolean> {
    await this.init();

    if (this.isMemoryFallback || !this.db) {
      const store = this.memoryStore.get(storeName);
      if (store) {
        return store.delete(key);
      }
      return false;
    }

    return new Promise<boolean>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async list<T>(storeName: string): Promise<T[]> {
    await this.init();

    if (this.isMemoryFallback || !this.db) {
      const store = this.memoryStore.get(storeName);
      if (store) {
        return Array.from(store.values()).map(v => 
          (typeof v === 'object' && v !== null && !(v instanceof Blob) && !(v instanceof ArrayBuffer)) 
            ? JSON.parse(JSON.stringify(v)) 
            : v
        );
      }
      return [];
    }

    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve((req.result || []) as T[]);
        };
        req.onerror = () => {
          reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public async clear(storeName: string): Promise<void> {
    await this.init();

    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(storeName)?.clear();
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async has(storeName: string, key: string): Promise<boolean> {
    const item = await this.get(storeName, key);
    return item !== null;
  }
}
