// 后台脚本：监听 sidepanel 请求，向当前 tab 注入 dumpAllStorage content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DUMP_ALL_STORAGE') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length === 0) return;
      const tabId = tabs[0].id;
      if (!tabId) return;
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // 注入 dumpAllStorage 代码到页面
          (function dumpAllStorage() {
            console.log('==== 一键存储对比（页面环境） ====');
            // 1. Cookies
            try {
              document.cookie && console.log('🍪 document.cookie:', document.cookie);
            } catch (e) { console.warn('cookie error', e); }
            // 2. localStorage
            try {
              const localData: Record<string, any> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key !== null) localData[key] = localStorage.getItem(key);
              }
              console.log('📦 localStorage:', localData);
            } catch (e) { console.warn('localStorage error', e); }
            // 3. sessionStorage
            try {
              const sessionData: Record<string, any> = {};
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key !== null) sessionData[key] = sessionStorage.getItem(key);
              }
              console.log('🗃 sessionStorage:', sessionData);
            } catch (e) { console.warn('sessionStorage error', e); }
            // 4. IndexedDB
            try {
              if (indexedDB.databases) {
                indexedDB.databases().then(dbs => {
                  dbs.forEach(dbInfo => {
                    const dbName = dbInfo.name;
                    if (!dbName) return;
                    const req = indexedDB.open(dbName);
                    req.onsuccess = function () {
                      const db = req.result;
                      const objectStoreNames = Array.from(db.objectStoreNames);
                      const tx = db.transaction(objectStoreNames, 'readonly');
                      objectStoreNames.forEach(storeName => {
                        const store = tx.objectStore(storeName);
                        const getAllReq = store.getAll();
                        getAllReq.onsuccess = function () {
                          console.log(`📚 IndexedDB [${dbName}][${storeName}]:`, getAllReq.result);
                        };
                      });
                    };
                  });
                });
              } else {
                console.log('IndexedDB API not supported.');
              }
            } catch (e) { console.warn('IndexedDB error', e); }
          })();
        },
      });
    });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
