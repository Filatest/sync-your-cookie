// 一键 dump 所有存储（cookie/localStorage/sessionStorage/IndexedDB）并输出到控制台
export async function dumpAllStorage() {
  // 1. Dump cookies
  const cookies = await new Promise(resolve => {
    chrome.cookies.getAll({}, resolve);
  });
  console.log('🍪 All Cookies:', cookies);

  // 2. Dump localStorage
  let localStorageData: Record<string, any> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      localStorageData[key!] = localStorage.getItem(key!);
    }
  } catch (e) {
    console.warn('localStorage access error:', e);
  }
  console.log('📦 localStorage:', localStorageData);

  // 3. Dump sessionStorage
  let sessionStorageData: Record<string, any> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      sessionStorageData[key!] = sessionStorage.getItem(key!);
    }
  } catch (e) {
    console.warn('sessionStorage access error:', e);
  }
  console.log('🗃 sessionStorage:', sessionStorageData);

  // 4. Dump IndexedDB
  const indexedDBData: Record<string, any> = {};
  try {
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      const dbName = dbInfo.name;
      if (!dbName) continue;
      const req = indexedDB.open(dbName);
      req.onsuccess = function (event) {
        const db = req.result;
        const objectStoreNames = Array.from(db.objectStoreNames);
        indexedDBData[dbName] = {};
        const tx = db.transaction(objectStoreNames, 'readonly');
        for (const storeName of objectStoreNames) {
          const store = tx.objectStore(storeName);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = function () {
            indexedDBData[dbName][storeName] = getAllReq.result;
            console.log(`📚 IndexedDB [${dbName}][${storeName}]:`, getAllReq.result);
          };
        }
      };
    }
  } catch (e) {
    console.warn('IndexedDB access error:', e);
  }
  // 汇总输出
  setTimeout(() => {
    console.log('🧾 IndexedDB summary:', indexedDBData);
  }, 2000);
}
