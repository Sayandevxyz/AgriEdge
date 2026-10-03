import React, { createContext, useContext, useState, useEffect } from 'react';

interface QueuedItem {
  id: string;
  endpoint: string;
  method: string;
  payload: any;
  timestamp: number;
}

interface OfflineSyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  enqueueOfflineAction: (endpoint: string, method: string, payload: any) => void;
  syncNow: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queue, setQueue] = useState<QueuedItem[]>(() => {
    try {
      const saved = localStorage.getItem('agriedge_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue]);

  const enqueueOfflineAction = (endpoint: string, method: string, payload: any) => {
    const item: QueuedItem = {
      id: `queue_${Date.now()}`,
      endpoint,
      method,
      payload,
      timestamp: Date.now()
    };
    const updated = [...queue, item];
    setQueue(updated);
    localStorage.setItem('agriedge_offline_queue', JSON.stringify(updated));
  };

  const syncNow = async () => {
    if (queue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    const remaining: QueuedItem[] = [];
    for (const item of queue) {
      try {
        const token = localStorage.getItem('agriedge_token');
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(item.payload)
        });
        if (!res.ok) {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    setQueue(remaining);
    localStorage.setItem('agriedge_offline_queue', JSON.stringify(remaining));
    setIsSyncing(false);
  };

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount: queue.length,
        enqueueOfflineAction,
        syncNow
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
