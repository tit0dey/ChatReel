import type { VaultEntry } from '../types';

const DATABASE = 'chatreel-studio';
const STORE = 'exports';
export type VaultMetadata = Omit<VaultEntry, 'blob'>;

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The Vault could not be opened.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openVault();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The Vault operation failed.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('The Vault transaction failed.'));
  });
}

export async function listVaultEntries(): Promise<VaultMetadata[]> {
  if (typeof indexedDB === 'undefined') return [];
  const database = await openVault();
  return new Promise((resolve, reject) => {
    const entries: VaultMetadata[] = [];
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(entries.sort((a, b) => b.createdAt - a.createdAt));
        return;
      }
      const { blob: _blob, ...metadata } = cursor.value as VaultEntry;
      entries.push(metadata);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('The Vault could not be read.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('The Vault transaction failed.'));
  });
}

export async function getVaultEntry(id: string): Promise<VaultEntry | undefined> {
  if (typeof indexedDB === 'undefined') return undefined;
  return withStore('readonly', (store) => store.get(id) as IDBRequest<VaultEntry | undefined>);
}

export async function addVaultEntry(entry: VaultEntry): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await withStore('readwrite', (store) => store.put(entry));
}

export async function deleteVaultEntry(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await withStore('readwrite', (store) => store.delete(id) as IDBRequest<void>);
}
