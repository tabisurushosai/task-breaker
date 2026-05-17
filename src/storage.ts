/**
 * Typed wrapper for chrome.storage.local
 */

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: SubTask[];
  createdAt: number;
}

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  language: 'ja' | 'en';
}

export interface StorageSchema {
  trial_start_ts: number;
  premium_unlocked: boolean;
  tasks: Task[];
  settings: Settings;
}

export const STORAGE_KEYS: (keyof StorageSchema)[] = [
  'trial_start_ts',
  'premium_unlocked',
  'tasks',
  'settings'
];

/**
 * Gets values from chrome.storage.local
 */
export async function getStorage<K extends keyof StorageSchema>(
  keys: K[] | K | null = null
): Promise<Partial<StorageSchema>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      resolve(items as Partial<StorageSchema>);
    });
  });
}

/**
 * Sets values in chrome.storage.local
 */
export async function setStorage(values: Partial<StorageSchema>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => {
      resolve();
    });
  });
}

/**
 * Clears all data in chrome.storage.local
 */
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
}

/**
 * Gets a single value from storage
 */
export async function getStorageValue<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const items = await getStorage(key);
  return items[key];
}
