import { BaseStorage, createStorage, StorageType } from './base';

export interface ISettings {
  storageKeyList: string[];
  storageKey?: string;
  protobufEncoding?: boolean;
  includeLocalStorage?: boolean;
  contextMenu?: boolean;
  enableIncognitoSync?: boolean;
  forceIncognitoSync?: boolean;
  incognitoStorageKey?: string;
  incognitoStorageKeyList?: string[];
}
const key = 'settings-storage-key';
const cacheStorageMap = new Map();
export const defaultKey = 'sync-your-cookie';

const initStorage = (): BaseStorage<ISettings> => {
  if (cacheStorageMap.has(key)) {
    return cacheStorageMap.get(key);
  }
  const storage = createStorage<ISettings>(
    key,
    {
      storageKeyList: [defaultKey],
      storageKey: defaultKey,
      protobufEncoding: true,
      includeLocalStorage: false,
      contextMenu: false,
      incognitoStorageKey: `${defaultKey}-incognito`,
      incognitoStorageKeyList: [`${defaultKey}-incognito`]
    },
    {
      storageType: StorageType.Sync,
      liveUpdate: true,
    },
  );
  cacheStorageMap.set(key, storage);
  return storage;
};

const storage = initStorage();

type TSettingsStorage = BaseStorage<ISettings> & {
  update: (updateInfo: Partial<ISettings>) => Promise<void>;
  addStorageKey: (key: string) => Promise<void>;
  removeStorageKey: (key: string) => Promise<void>;
  addIncognitoStorageKey: (key: string) => Promise<void>;
  removeIncognitoStorageKey: (key: string) => Promise<void>;
  // getStorageKeyList: () => Promise<string[]>;
};

export const settingsStorage: TSettingsStorage = {
  ...storage,
  update: async (updateInfo: Partial<ISettings>) => {
    await storage.set(currentInfo => {
      return { ...currentInfo, ...updateInfo };
    });
  },

  addStorageKey: async (key: string) => {
    await storage.set(currentInfo => {
      if (currentInfo.storageKeyList.includes(key)) {
        return currentInfo;
      }
      return {
        ...currentInfo,
        storageKeyList: [...currentInfo.storageKeyList, key],
      };
    });
  },

  removeStorageKey: async (key: string) => {
    await storage.set(currentInfo => {
      if (!currentInfo.storageKeyList.includes(key)) {
        return currentInfo;
      }
      return {
        ...currentInfo,
        storageKeyList: currentInfo.storageKeyList.filter(item => item !== key),
      };
    });
  },

  addIncognitoStorageKey: async (key: string) => {
    await storage.set(currentInfo => {
      const incognitoStorageKeyList = currentInfo.incognitoStorageKeyList || [`${defaultKey}-incognito`];
      if (incognitoStorageKeyList.includes(key)) {
        return currentInfo;
      }
      return {
        ...currentInfo,
        incognitoStorageKeyList: [...incognitoStorageKeyList, key],
      };
    });
  },

  removeIncognitoStorageKey: async (key: string) => {
    await storage.set(currentInfo => {
      const incognitoStorageKeyList = currentInfo.incognitoStorageKeyList || [`${defaultKey}-incognito`];
      if (!incognitoStorageKeyList.includes(key)) {
        return currentInfo;
      }
      return {
        ...currentInfo,
        incognitoStorageKeyList: incognitoStorageKeyList.filter(item => item !== key),
      };
    });
  },
};
