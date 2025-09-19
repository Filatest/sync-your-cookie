import { ICookiesMap } from '@sync-your-cookie/protobuf';
import { createStorage, StorageType } from './base';

export interface IncognitoCookie extends ICookiesMap {}

const key = 'incognito-cookie-storage-key';
const storage = createStorage<IncognitoCookie>(
  key,
  {},
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const incognitoCookieStorage = {
  ...storage,
  reset: async () => {
    console.log('[incognitoCookieStorage] reset');
    await storage.set(() => {
      return {};
    });
  },
  updateItem: async (domain: string, updateCookies: any[], items: any[] = []) => {
    console.log('[incognitoCookieStorage] updateItem', { domain, updateCookies, items });
    let newVal: IncognitoCookie = {};
    await storage.set(currentInfo => {
      const domainCookieMap = currentInfo.domainCookieMap || {};
      currentInfo.createTime = currentInfo.createTime || Date.now();
      currentInfo.updateTime = Date.now();
      domainCookieMap[domain] = {
        ...domainCookieMap[domain],
        cookies: updateCookies,
        localStorageItems: items
      };
      newVal = { ...currentInfo, domainCookieMap };
      return newVal;
    });
    console.log('[incognitoCookieStorage] updateItem after', newVal);
    return newVal;
  },
  update: async (updateInfo: IncognitoCookie, isInit = false) => {
    console.log('[incognitoCookieStorage] update', { updateInfo, isInit });
    let newVal: IncognitoCookie = {};
    await storage.set(currentInfo => {
      newVal = isInit ? updateInfo : { ...currentInfo, ...updateInfo };
      return newVal;
    });
    console.log('[incognitoCookieStorage] update after', newVal);
    return newVal;
  },
  removeItem: async (domain: string) => {
    console.log('[incognitoCookieStorage] removeItem', domain);
    let newVal: IncognitoCookie = {};
    await storage.set(currentInfo => {
      const domainCookieMap = currentInfo.domainCookieMap || {};
      delete domainCookieMap[domain];
      newVal = { ...currentInfo, domainCookieMap };
      return newVal;
    });
    console.log('[incognitoCookieStorage] removeItem after', newVal);
    return newVal;
  },
  removeDomainItem: async (domain: string, name: string) => {
    console.log('[incognitoCookieStorage] removeDomainItem', { domain, name });
    let newVal: IncognitoCookie = {};
    await storage.set(currentInfo => {
      const domainCookieMap = currentInfo.domainCookieMap || {};
      const domainCookies = domainCookieMap[domain] || {};
      const cookies = domainCookies.cookies || [];
      const newCookies = cookies.filter(cookie => cookie.name !== name);
      domainCookieMap[domain] = {
        ...domainCookies,
        cookies: newCookies,
      };
      newVal = { ...currentInfo, domainCookieMap };
      return newVal;
    });
    console.log('[incognitoCookieStorage] removeDomainItem after', newVal);
    return newVal;
  },
};
