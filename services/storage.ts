export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SmartCreatorDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('voice_history')) {
        db.createObjectStore('voice_history', { keyPath: 'id' });
      }
    };
  });
};

export const saveVoiceHistoryDB = async (history: any[]) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('voice_history', 'readwrite');
      const store = tx.objectStore('voice_history');
      store.clear();
      history.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("IndexedDB save error:", error);
  }
};

export const loadVoiceHistoryDB = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('voice_history', 'readonly');
      const store = tx.objectStore('voice_history');
      const request = store.getAll();
      request.onsuccess = () => {
        const data = request.result || [];
        data.sort((a: any, b: any) => b.timestamp - a.timestamp);
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB load error:", error);
    return [];
  }
};
