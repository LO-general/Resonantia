import {
  ContentItem,
  RepostItem,
  TikTokOfficialVideo,
  TikTokMetricSnapshot,
  ContentMode,
  FollowerHistoryEntry,
  VideoEditorialMetadata,
  MusicCatalogTrack,
  ExperimentLog,
  CounterCorrectionLog,
  PrePublishChecklistItem,
} from '../types';

const DB_NAME = 'TikTokContentManagerDB';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;
const IDB_OPEN_TIMEOUT_MS = 2500;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB non disponible dans cet environnement.'));
  }

  dbPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        dbPromise = null;
        reject(new Error('IndexedDB open timeout'));
      }
    }, IDB_OPEN_TIMEOUT_MS);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      clearTimeout(timeoutId);
      dbPromise = null;
      reject(err);
      return;
    }

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;

      if (!db.objectStoreNames.contains('content_items')) {
        const store = db.createObjectStore('content_items', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('scheduledDate', 'scheduledDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('repost_items')) {
        const store = db.createObjectStore('repost_items', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('scheduledDate', 'scheduledDate', { unique: false });
        store.createIndex('tiktokUrl', 'tiktokUrl', { unique: false });
      }

      if (!db.objectStoreNames.contains('video_blobs')) {
        db.createObjectStore('video_blobs');
      }

      if (!db.objectStoreNames.contains('tiktok_official_videos')) {
        const store = db.createObjectStore('tiktok_official_videos', { keyPath: 'id' });
        store.createIndex('accountId', 'accountId', { unique: false });
        store.createIndex('createTime', 'createTime', { unique: false });
      }

      if (!db.objectStoreNames.contains('tiktok_snapshots')) {
        const store = db.createObjectStore('tiktok_snapshots', { keyPath: 'id' });
        store.createIndex('accountId', 'accountId', { unique: false });
        store.createIndex('videoId', 'videoId', { unique: false });
        store.createIndex('fetchDate', 'fetchDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('app_settings')) {
        db.createObjectStore('app_settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('follower_history')) {
        const store = db.createObjectStore('follower_history', { keyPath: 'id' });
        store.createIndex('accountId', 'accountId', { unique: false });
        store.createIndex('recordedAt', 'recordedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('video_editorial_meta')) {
        db.createObjectStore('video_editorial_meta', { keyPath: 'videoId' });
      }

      if (!db.objectStoreNames.contains('music_catalog')) {
        db.createObjectStore('music_catalog', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('experiment_logs')) {
        const store = db.createObjectStore('experiment_logs', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('accountId', 'accountId', { unique: false });
      }

      if (!db.objectStoreNames.contains('compliance_checklists')) {
        db.createObjectStore('compliance_checklists', { keyPath: 'userId' });
      }

      if (!db.objectStoreNames.contains('counter_corrections')) {
        const store = db.createObjectStore('counter_corrections', { keyPath: 'id' });
        store.createIndex('accountId', 'accountId', { unique: false });
        store.createIndex('videoId', 'videoId', { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const db = event.target.result as IDBDatabase;
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          // ignore
        }
        dbPromise = null;
      };
      resolve(db);
    };

    request.onblocked = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      dbPromise = null;
      console.warn('IndexedDB open blocked by an older connection; falling back to localStorage.');
      reject(new Error('IndexedDB blocked'));
    };

    request.onerror = (event: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      dbPromise = null;
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

// ============================================================================
// CONTENT ITEMS (Zero Mock Data - Starts 100% Empty)
// ============================================================================

export async function getContentItems(userId?: string): Promise<ContentItem[]> {
  try {
    const db = await getDB();
    const transaction = db.transaction('content_items', 'readonly');
    const store = transaction.objectStore('content_items');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let items = (request.result as ContentItem[]) || [];
        if (userId) {
          items = items.filter((item) => item.userId === userId);
        }
        resolve(items);
      };
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Error reading content items:', err);
    return [];
  }
}

export async function saveContentItem(item: ContentItem): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction('content_items', 'readwrite');
  const store = transaction.objectStore('content_items');
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteContentItem(id: string): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(['content_items', 'video_blobs'], 'readwrite');
  const contentStore = transaction.objectStore('content_items');
  const blobStore = transaction.objectStore('video_blobs');

  return new Promise((resolve, reject) => {
    contentStore.delete(id);
    blobStore.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================================================
// REPOST ITEMS (Zero Mock Data - Starts 100% Empty)
// ============================================================================

const REPOST_CACHE_KEY = 'tiktok_repost_items_cache';

function readRepostCache(): RepostItem[] {
  try {
    const raw = localStorage.getItem(REPOST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRepostCache(items: RepostItem[]): void {
  try {
    localStorage.setItem(REPOST_CACHE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function getRepostItems(userId?: string): Promise<RepostItem[]> {
  let items: RepostItem[] = readRepostCache();
  try {
    const db = await getDB();
    const transaction = db.transaction('repost_items', 'readonly');
    const store = transaction.objectStore('repost_items');

    const dbItems = await new Promise<RepostItem[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as RepostItem[]) || []);
      request.onerror = () => resolve([]);
    });

    if (dbItems.length > 0) {
      const mergedMap = new Map<string, RepostItem>();
      for (const item of items) mergedMap.set(item.id, item);
      for (const item of dbItems) mergedMap.set(item.id, item);
      items = Array.from(mergedMap.values());
    }
  } catch (err) {
    console.warn('Error reading repost items from IndexedDB, using local cache:', err);
  }
  if (userId) {
    items = items.filter((item) => item.userId === userId);
  }
  return items;
}

export async function saveRepostItem(item: RepostItem): Promise<void> {
  const existing = readRepostCache().filter((r) => r.id !== item.id);
  existing.push(item);
  writeRepostCache(existing);

  try {
    const db = await getDB();
    const transaction = db.transaction('repost_items', 'readwrite');
    const store = transaction.objectStore('repost_items');
    await new Promise<void>((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for saveRepostItem, persisted to localStorage:', err);
  }
}

export async function deleteRepostItem(id: string): Promise<void> {
  writeRepostCache(readRepostCache().filter((r) => r.id !== id));
  try {
    const db = await getDB();
    const transaction = db.transaction('repost_items', 'readwrite');
    const store = transaction.objectStore('repost_items');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for deleteRepostItem, deleted from localStorage:', err);
  }
}

// Duplicate Detection for Reposts
export async function checkDuplicateRepost(
  tiktokUrl: string,
  scheduledDate: string,
  userId?: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; conflictingItem?: RepostItem }> {
  const cleanUrl = tiktokUrl.trim().toLowerCase();
  if (!cleanUrl) {
    return { isDuplicate: false };
  }
  const items = await getRepostItems(userId);

  const match = items.find((item) => {
    if (excludeId && item.id === excludeId) return false;
    const existingUrl = (item.tiktokUrl || '').trim().toLowerCase();
    return Boolean(existingUrl) && existingUrl === cleanUrl && item.scheduledDate === scheduledDate;
  });

  return {
    isDuplicate: Boolean(match),
    conflictingItem: match,
  };
}

// Video Blobs (persistent client-side storage for imported videos)
export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction('video_blobs', 'readwrite');
  const store = transaction.objectStore('video_blobs');
  return new Promise((resolve, reject) => {
    const req = store.put(blob, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    const transaction = db.transaction('video_blobs', 'readonly');
    const store = transaction.objectStore('video_blobs');
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Update performance metrics for a content item
export async function updateContentMetrics(
  id: string,
  metrics: import('../types').PerformanceMetrics
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('content_items', 'readwrite');
  const store = tx.objectStore('content_items');

  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as ContentItem;
      if (!item) {
        return reject(new Error('Publication introuvable'));
      }
      item.metrics = metrics;
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Check if a video with the same file name and size was already imported
export async function checkDuplicateVideo(
  fileName: string,
  userId?: string,
  fileSize?: number
): Promise<{ isDuplicate: boolean; existingItem?: ContentItem }> {
  const items = await getContentItems(userId);
  const match = items.find((item) => {
    if (item.videoFileName.toLowerCase() === fileName.toLowerCase()) {
      if (fileSize && item.fileSize && item.fileSize === fileSize) {
        return true;
      }
      return true;
    }
    return false;
  });

  return {
    isDuplicate: Boolean(match),
    existingItem: match,
  };
}

// ============================================================================
// TIKTOK OFFICIAL VIDEOS & HISTORICAL SNAPSHOTS
// ============================================================================

export async function saveTikTokOfficialVideos(videos: TikTokOfficialVideo[]): Promise<void> {
  if (!videos || videos.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('tiktok_official_videos', 'readwrite');
  const store = tx.objectStore('tiktok_official_videos');

  for (const v of videos) {
    store.put(v);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTikTokOfficialVideos(accountId?: string): Promise<TikTokOfficialVideo[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('tiktok_official_videos', 'readonly');
    const store = tx.objectStore('tiktok_official_videos');

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let items = (req.result as TikTokOfficialVideo[]) || [];
        if (accountId) {
          items = items.filter((v) => v.accountId === accountId);
        }
        // Sort newest first
        items.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Error reading tiktok official videos:', err);
    return [];
  }
}

export async function saveTikTokSnapshot(snapshot: TikTokMetricSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tiktok_snapshots', 'readwrite');
  const store = tx.objectStore('tiktok_snapshots');

  return new Promise((resolve, reject) => {
    const req = store.put(snapshot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getTikTokSnapshots(
  accountId?: string,
  videoId?: string
): Promise<TikTokMetricSnapshot[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('tiktok_snapshots', 'readonly');
    const store = tx.objectStore('tiktok_snapshots');

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let items = (req.result as TikTokMetricSnapshot[]) || [];
        if (accountId) {
          items = items.filter((s) => s.accountId === accountId);
        }
        if (videoId) {
          items = items.filter((s) => s.videoId === videoId);
        }
        items.sort((a, b) => new Date(b.fetchDate).getTime() - new Date(a.fetchDate).getTime());
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Error reading tiktok snapshots:', err);
    return [];
  }
}

// ============================================================================
// APP SETTINGS, CONTENT MODE, EDITORIAL META, FOLLOWER HISTORY, EXPERIMENTS, MUSIC CATALOG
// ============================================================================

export async function saveUserSetting<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(`tiktok_setting_${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
  try {
    const db = await getDB();
    const tx = db.transaction('app_settings', 'readwrite');
    const store = tx.objectStore('app_settings');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error saving user setting to IndexedDB (saved to localStorage):', err);
  }
}

export async function getUserSetting<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('app_settings', 'readonly');
    const store = tx.objectStore('app_settings');
    const fromIdb = await new Promise<T | null>((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => resolve(null);
    });
    if (fromIdb !== null) return fromIdb;
  } catch {
    // fallback to localStorage
  }
  try {
    const raw = localStorage.getItem(`tiktok_setting_${key}`);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return null;
}

export async function getContentModeForUser(userId: string): Promise<ContentMode | null> {
  try {
    const raw = localStorage.getItem(`tiktok_content_mode_${userId}`);
    if (raw === 'creation' || raw === 'repost' || raw === 'both') return raw;
  } catch {
    // ignore
  }
  const fromDb = await getUserSetting<ContentMode>(`content_mode_${userId}`);
  if (fromDb === 'creation' || fromDb === 'repost' || fromDb === 'both') return fromDb;
  return null;
}

export async function saveContentModeForUser(userId: string, mode: ContentMode): Promise<void> {
  try {
    localStorage.setItem(`tiktok_content_mode_${userId}`, mode);
  } catch {
    // ignore
  }
  await saveUserSetting(`content_mode_${userId}`, mode);
}

const FOLLOWER_HISTORY_CACHE_PREFIX = 'tiktok_follower_history_';

function readFollowerHistoryCache(accountId: string): FollowerHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`${FOLLOWER_HISTORY_CACHE_PREFIX}${accountId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFollowerHistoryCache(accountId: string, items: FollowerHistoryEntry[]): void {
  try {
    localStorage.setItem(`${FOLLOWER_HISTORY_CACHE_PREFIX}${accountId}`, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function saveFollowerHistoryEntry(entry: FollowerHistoryEntry): Promise<void> {
  const cached = readFollowerHistoryCache(entry.accountId).filter((e) => e.id !== entry.id);
  cached.push(entry);
  writeFollowerHistoryCache(entry.accountId, cached);

  try {
    const db = await getDB();
    const tx = db.transaction('follower_history', 'readwrite');
    const store = tx.objectStore('follower_history');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for follower history, saved to localStorage:', err);
  }
}

export async function getFollowerHistory(accountId: string): Promise<FollowerHistoryEntry[]> {
  const merged = new Map<string, FollowerHistoryEntry>();
  for (const e of readFollowerHistoryCache(accountId)) {
    merged.set(e.id, e);
  }
  try {
    const db = await getDB();
    const tx = db.transaction('follower_history', 'readonly');
    const store = tx.objectStore('follower_history');
    const dbItems = await new Promise<FollowerHistoryEntry[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = ((req.result as FollowerHistoryEntry[]) || []).filter(
          (e) => e.accountId === accountId
        );
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
    for (const e of dbItems) {
      merged.set(e.id, e);
    }
  } catch {
    // fallback already populated
  }
  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
}

const EDITORIAL_META_PREFIX = 'tiktok_editorial_meta_';

export async function saveVideoEditorialMeta(meta: VideoEditorialMetadata): Promise<void> {
  try {
    localStorage.setItem(`${EDITORIAL_META_PREFIX}${meta.videoId}`, JSON.stringify(meta));
  } catch {
    // ignore
  }
  try {
    const db = await getDB();
    const tx = db.transaction('video_editorial_meta', 'readwrite');
    const store = tx.objectStore('video_editorial_meta');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(meta);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for video_editorial_meta, persisted in localStorage:', err);
  }
}

export async function getAllVideoEditorialMeta(): Promise<Record<string, VideoEditorialMetadata>> {
  const map: Record<string, VideoEditorialMetadata> = {};

  // 1. Read localStorage mirror first so saves are never lost even if IDB fails/blocks
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(EDITORIAL_META_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as VideoEditorialMetadata;
          if (parsed && parsed.videoId) {
            map[parsed.videoId] = parsed;
          }
        } catch {
          // ignore malformed entry
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Merge IndexedDB items, keeping whichever has the newer updatedAt timestamp
  try {
    const db = await getDB();
    const tx = db.transaction('video_editorial_meta', 'readonly');
    const store = tx.objectStore('video_editorial_meta');
    const items = await new Promise<VideoEditorialMetadata[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as VideoEditorialMetadata[]) || []);
      req.onerror = () => resolve([]);
    });
    for (const item of items) {
      if (!item || !item.videoId) continue;
      const existing = map[item.videoId];
      if (!existing) {
        map[item.videoId] = item;
      } else {
        const existingTs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const itemTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
        if (itemTs >= existingTs) {
          map[item.videoId] = item;
        }
      }
    }
  } catch {
    // localStorage map already populated above
  }

  return map;
}

const EXPERIMENT_CACHE_KEY = 'tiktok_experiment_logs_cache';

function readExperimentCache(): ExperimentLog[] {
  try {
    const raw = localStorage.getItem(EXPERIMENT_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeExperimentCache(items: ExperimentLog[]): void {
  try {
    localStorage.setItem(EXPERIMENT_CACHE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function saveExperimentLog(log: ExperimentLog): Promise<void> {
  const existing = readExperimentCache().filter((i) => i.id !== log.id);
  existing.push(log);
  writeExperimentCache(existing);

  try {
    const db = await getDB();
    const tx = db.transaction('experiment_logs', 'readwrite');
    const store = tx.objectStore('experiment_logs');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(log);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for experiment_logs, persisted in localStorage:', err);
  }
}

export async function getExperimentLogs(userId?: string, accountId?: string): Promise<ExperimentLog[]> {
  const merged = new Map<string, ExperimentLog>();
  for (const item of readExperimentCache()) {
    merged.set(item.id, item);
  }
  try {
    const db = await getDB();
    const tx = db.transaction('experiment_logs', 'readonly');
    const store = tx.objectStore('experiment_logs');
    const dbItems = await new Promise<ExperimentLog[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as ExperimentLog[]) || []);
      req.onerror = () => resolve([]);
    });
    for (const item of dbItems) {
      merged.set(item.id, item);
    }
  } catch {
    // localStorage cache already populated
  }

  let items = Array.from(merged.values());
  if (userId) items = items.filter((i) => !i.userId || i.userId === userId);
  if (accountId) items = items.filter((i) => !i.accountId || i.accountId === accountId);
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

export async function deleteExperimentLog(id: string): Promise<void> {
  writeExperimentCache(readExperimentCache().filter((i) => i.id !== id));
  try {
    const db = await getDB();
    const tx = db.transaction('experiment_logs', 'readwrite');
    const store = tx.objectStore('experiment_logs');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for deleteExperimentLog, removed from localStorage:', err);
  }
}

export async function saveMusicCatalogTracks(tracks: MusicCatalogTrack[]): Promise<void> {
  if (!tracks.length) return;
  const db = await getDB();
  const tx = db.transaction('music_catalog', 'readwrite');
  const store = tx.objectStore('music_catalog');
  for (const t of tracks) store.put(t);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMusicCatalogTracks(): Promise<MusicCatalogTrack[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('music_catalog', 'readonly');
    const store = tx.objectStore('music_catalog');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as MusicCatalogTrack[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveComplianceChecklist(
  userId: string,
  items: PrePublishChecklistItem[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('compliance_checklists', 'readwrite');
  const store = tx.objectStore('compliance_checklists');
  return new Promise((resolve, reject) => {
    const req = store.put({ userId, items, updatedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getComplianceChecklist(userId: string): Promise<PrePublishChecklistItem[] | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('compliance_checklists', 'readonly');
    const store = tx.objectStore('compliance_checklists');
    return new Promise((resolve) => {
      const req = store.get(userId);
      req.onsuccess = () => resolve(req.result?.items || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCounterCorrectionLog(log: CounterCorrectionLog): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('counter_corrections', 'readwrite');
  const store = tx.objectStore('counter_corrections');
  return new Promise((resolve, reject) => {
    const req = store.put(log);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCounterCorrectionLogs(accountId?: string): Promise<CounterCorrectionLog[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('counter_corrections', 'readonly');
    const store = tx.objectStore('counter_corrections');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let items = (req.result as CounterCorrectionLog[]) || [];
        if (accountId) items = items.filter((l) => l.accountId === accountId);
        items.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function exportAllUserIndexedDBData(userId: string): Promise<Record<string, unknown>> {
  const [contents, reposts, experiments, checklist, contentMode] = await Promise.all([
    getContentItems(userId),
    getRepostItems(userId),
    getExperimentLogs(userId),
    getComplianceChecklist(userId),
    getContentModeForUser(userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    userId,
    contentMode,
    contentItems: contents,
    repostItems: reposts,
    experiments,
    complianceChecklist: checklist,
  };
}

