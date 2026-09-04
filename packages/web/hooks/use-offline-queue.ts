'use client';

import { useEffect, useState, useCallback } from 'react';

interface QueuedItem {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  createdAt: number;
  retries: number;
}

const DB_NAME = 'fleetos-offline-queue';
const STORE_NAME = 'pending-writes';
const MAX_RETRIES = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function addToQueue(item: Omit<QueuedItem, 'id' | 'createdAt' | 'retries'>) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.add({
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retries: 0,
  });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
  });
}

async function getQueue(): Promise<QueuedItem[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB request failed'));
  });
}

async function removeFromQueue(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
  });
}

async function incrementRetry(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(id);
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.retries += 1;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
  });
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    const items = await getQueue();
    setPendingCount(items.length);

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        if (response.ok) {
          await removeFromQueue(item.id);
        } else if (item.retries < MAX_RETRIES) {
          await incrementRetry(item.id);
        } else {
          await removeFromQueue(item.id);
        }
      } catch {
        if (item.retries >= MAX_RETRIES) {
          await removeFromQueue(item.id);
        } else {
          await incrementRetry(item.id);
        }
      }
    }

    const remaining = await getQueue();
    setPendingCount(remaining.length);
  }, []);

  const enqueue = useCallback(
    async (url: string, method: string, body: unknown, headers: Record<string, string> = {}) => {
      if (navigator.onLine) {
        try {
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
          });
          if (response.ok) return { ok: true, offline: false };
        } catch {
          // Fall through to offline queue
        }
      }

      await addToQueue({
        url,
        method,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      setPendingCount((c) => c + 1);
      return { ok: true, offline: true };
    },
    [],
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Process queue on mount
    void processQueue();

    // Retry every 60s while online
    const interval = setInterval(() => {
      if (navigator.onLine) void processQueue();
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [processQueue]);

  return { isOnline, pendingCount, enqueue };
}
