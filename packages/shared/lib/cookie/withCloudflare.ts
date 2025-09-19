/**
 * Remove cookies for incognito mode and write to incognito KV key
 */
export const removeAndWriteCookiesForIncognito = async (
  cloudflareAccountInfo: AccountInfo,
  domain: string,
  oldCookieMap: ICookiesMap = {},
  id?: string,
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: {
      ...(oldCookieMap.domainCookieMap || {}),
    },
  };
  if (cookiesMap.domainCookieMap) {
    if (id !== undefined) {
      if (cookiesMap.domainCookieMap[domain]?.cookies) {
        const oldLength = cookiesMap.domainCookieMap[domain]?.cookies?.length || 0;
        cookiesMap.domainCookieMap[domain].cookies =
          cookiesMap.domainCookieMap[domain].cookies?.filter(
            (cookie: any) => `${cookie.domain}_${cookie.name}` !== id,
          ) || [];
        const newLength = cookiesMap.domainCookieMap[domain]?.cookies?.length || 0;
        if (oldLength === newLength) {
          throw new Error(`${id}: cookie not found`);
        }
      }
    } else {
      delete cookiesMap.domainCookieMap[domain];
    }
  }
  const res = await writeCookiesMapForIncognito(cloudflareAccountInfo, cookiesMap);
  // 主动广播日志到所有窗口
  const logMsg = id
    ? `Removed cookie ${id} from domain ${domain} (incognito)`
    : `Removed all cookies for domain ${domain} (incognito)`;
  chrome.runtime?.sendMessage?.({
    type: 'INC_LOG',
    payload: {
      msg: logMsg,
      domain,
      id,
      ts: Date.now(),
    },
  });
  return [res, cookiesMap];
};
import { cloudflareStorage, type AccountInfo } from '@sync-your-cookie/storage/lib/cloudflareStorage';
import { domainStatusStorage } from '@sync-your-cookie/storage/lib/domainStatusStorage';
import { incognitoCookieStorage } from '@sync-your-cookie/storage/lib/incognitoCookieStorage';
import { settingsStorage } from '@sync-your-cookie/storage/lib/settingsStorage';

import { readCloudflareKV, readCloudflareKVForIncognito, writeCloudflareKV, writeCloudflareKVForIncognito, WriteResponse } from '../cloudflare/api';

import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decodeCookiesMap,
  encodeCookiesMap,
  ICookie,
  ICookiesMap,
  ILocalStorageItem,
} from '@sync-your-cookie/protobuf';
import { MessageErrorCode } from '../message';

export const check = (accountInfo?: AccountInfo) => {
  const cloudflareAccountInfo = accountInfo || cloudflareStorage.getSnapshot();
  if (!cloudflareAccountInfo?.accountId || !cloudflareAccountInfo.namespaceId || !cloudflareAccountInfo.token) {
    let message = 'Account ID is empty';
    if (!cloudflareAccountInfo?.namespaceId) {
      message = 'NamespaceId ID is empty';
    } else if (!cloudflareAccountInfo.token) {
      message = 'Token is empty';
    }

    return Promise.reject({
      message,
      code: MessageErrorCode.AccountCheck,
    });
  }
  return cloudflareAccountInfo;
};

export const readCookiesMap = async (cloudflareAccountInfo: AccountInfo): Promise<ICookiesMap> => {
  await check(cloudflareAccountInfo);
  const res = await readCloudflareKV(
    cloudflareAccountInfo.accountId!,
    cloudflareAccountInfo.namespaceId!,
    cloudflareAccountInfo.token!,
  );
  if (res) {
    try {
      const protobufEncoding = settingsStorage.getSnapshot()?.protobufEncoding;
      if (protobufEncoding) {
        const compressedBuffer = base64ToArrayBuffer(res);
        const deMsg = await decodeCookiesMap(compressedBuffer);
        console.log("readCookiesMap->deMsg", deMsg);
        return deMsg;
      } else {
        console.log("readCookiesMap->res", JSON.parse(res));
        return JSON.parse(res);
      }
    } catch (error) {
      console.log('decode error', error);
      return {};
    }
  } else {
    return {};
  }
};

/**
 * Read cookies map specifically for incognito mode using separate storage key
 */
export const readCookiesMapForIncognito = async (cloudflareAccountInfo: AccountInfo): Promise<ICookiesMap> => {
  await check(cloudflareAccountInfo);
  const res = await readCloudflareKVForIncognito(
    cloudflareAccountInfo.accountId!,
    cloudflareAccountInfo.namespaceId!,
    cloudflareAccountInfo.token!,
  );
  if (res) {
    try {
      const protobufEncoding = settingsStorage.getSnapshot()?.protobufEncoding;
      if (protobufEncoding) {
        const compressedBuffer = base64ToArrayBuffer(res);
        const deMsg = await decodeCookiesMap(compressedBuffer);
        console.log("🎭 readCookiesMapForIncognito->deMsg", deMsg);
        return deMsg;
      } else {
        console.log("🎭 readCookiesMapForIncognito->res", JSON.parse(res));
        return JSON.parse(res);
      }
    } catch (error) {
      console.log('🎭 incognito decode error', error);
      return {};
    }
  } else {
    return {};
  }
};

export const writeCookiesMap = async (cloudflareAccountInfo: AccountInfo, cookiesMap: ICookiesMap = {}) => {
  const protobufEncoding = settingsStorage.getSnapshot()?.protobufEncoding;
  let encodingStr = '';
  if (protobufEncoding) {
    const buffered = await encodeCookiesMap(cookiesMap);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encodingStr = arrayBufferToBase64(buffered as any);
  } else {
    encodingStr = JSON.stringify(cookiesMap);
    console.log('writeCookiesMap->', cookiesMap);
  }
  const res = await writeCloudflareKV(
    encodingStr,
    cloudflareAccountInfo.accountId!,
    cloudflareAccountInfo.namespaceId!,
    cloudflareAccountInfo.token!,
  );
  return res;
};

/**
 * Write cookies map specifically for incognito mode using separate storage key
 */
export const writeCookiesMapForIncognito = async (cloudflareAccountInfo: AccountInfo, cookiesMap: ICookiesMap = {}) => {
  const protobufEncoding = settingsStorage.getSnapshot()?.protobufEncoding;
  let encodingStr = '';
  if (protobufEncoding) {
    const buffered = await encodeCookiesMap(cookiesMap);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encodingStr = arrayBufferToBase64(buffered as any);
  } else {
    encodingStr = JSON.stringify(cookiesMap);
    console.log('🎭 writeCookiesMapForIncognito->', cookiesMap);
  }
  const res = await writeCloudflareKVForIncognito(
    encodingStr,
    cloudflareAccountInfo.accountId!,
    cloudflareAccountInfo.namespaceId!,
    cloudflareAccountInfo.token!,
  );
  return res;
};

export const mergeAndWriteCookies = async (
  cloudflareAccountInfo: AccountInfo,
  domain: string,
  cookies: ICookie[],
  localStorageItems: ILocalStorageItem[] = [],
  oldCookieMap: ICookiesMap = {},
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: {
      ...(oldCookieMap.domainCookieMap || {}),
      [domain]: {
        updateTime: Date.now(),
        createTime: oldCookieMap.domainCookieMap?.[domain]?.createTime || Date.now(),
        cookies: cookies,
        localStorageItems: localStorageItems
      },
    },
  };

  const res = await writeCookiesMap(cloudflareAccountInfo, cookiesMap);
  return [res, cookiesMap];
};

export const mergeAndWriteMultipleDomainCookies = async (
  cloudflareAccountInfo: AccountInfo,
  domainCookies: { domain: string; cookies: ICookie[], localStorageItems: ILocalStorageItem[]  }[],
  oldCookieMap: ICookiesMap = {},
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);

  const newDomainCookieMap = {
    ...(oldCookieMap.domainCookieMap || {}),
  };
  for (const { domain, cookies, localStorageItems } of domainCookies) {
    newDomainCookieMap[domain] = {
      updateTime: Date.now(),
      createTime: oldCookieMap.domainCookieMap?.[domain]?.createTime || Date.now(),
      cookies: cookies,
      localStorageItems: localStorageItems || [],
    };
  }
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: newDomainCookieMap,
  };

  const res = await writeCookiesMap(cloudflareAccountInfo, cookiesMap);
  return [res, cookiesMap];
};

export const removeAndWriteCookies = async (
  cloudflareAccountInfo: AccountInfo,
  domain: string,
  oldCookieMap: ICookiesMap = {},
  id?: string,
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: {
      ...(oldCookieMap.domainCookieMap || {}),
    },
  };
  if (cookiesMap.domainCookieMap) {
    if (id !== undefined) {
      if (cookiesMap.domainCookieMap[domain]?.cookies) {
        const oldLength = cookiesMap.domainCookieMap[domain]?.cookies?.length || 0;
        cookiesMap.domainCookieMap[domain].cookies =
          cookiesMap.domainCookieMap[domain].cookies?.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cookie: any) => `${cookie.domain}_${cookie.name}` !== id,
          ) || [];
        const newLength = cookiesMap.domainCookieMap[domain]?.cookies?.length || 0;
        if (oldLength === newLength) {
          throw new Error(`${id}: cookie not found`);
        }
      }
    } else {
      delete cookiesMap.domainCookieMap[domain];
    }
  }

  const res = await writeCookiesMap(cloudflareAccountInfo, cookiesMap);
  // 主动广播日志到所有窗口
  const logMsg = id
    ? `Removed cookie ${id} from domain ${domain}`
    : `Removed all cookies for domain ${domain}`;
  // 判断是否为无痕模式（通过 cloudflareAccountInfo 或 oldCookieMap 特征）
  // 已废弃 isIncognito 判断，分流逻辑由调用方决定
  chrome.runtime?.sendMessage?.({
    type: 'NORMAL_LOG',
    payload: {
      msg: logMsg,
      domain,
      id,
      ts: Date.now(),
    },
  });
  return [res, cookiesMap];
};

export const editAndWriteCookies = async (
  cloudflareAccountInfo: AccountInfo,
  host: string,
  oldCookieMap: ICookiesMap = {},
  oldItem: ICookie,
  newItem: ICookie,
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: {
      ...(oldCookieMap.domainCookieMap || {}),
    },
  };
  if (cookiesMap.domainCookieMap) {
    const cookieLength = cookiesMap.domainCookieMap[host]?.cookies?.length || 0;
    for (let i = 0; i < cookieLength; i++) {
      const cookieItem = cookiesMap.domainCookieMap[host]?.cookies?.[i];
      if (cookieItem?.name === oldItem.name && cookieItem?.domain === oldItem.domain) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cookiesMap.domainCookieMap[host].cookies as any)[i] = {
          ...cookieItem,
          ...newItem,
        };
        break;
      }
    }
  }

  const res = await writeCookiesMap(cloudflareAccountInfo, cookiesMap);
  return [res, cookiesMap];
};

/**
 * Incognito mode versions of the above functions
 */

export const mergeAndWriteCookiesForIncognito = async (
  cloudflareAccountInfo: AccountInfo,
  domain: string,
  cookies: ICookie[],
  localStorageItems: ILocalStorageItem[] = [],
  oldCookieMap: ICookiesMap = {},
): Promise<[WriteResponse, ICookiesMap]> => {
  await check(cloudflareAccountInfo);
  const cookiesMap: ICookiesMap = {
    updateTime: Date.now(),
    createTime: oldCookieMap?.createTime || Date.now(),
    domainCookieMap: {
      ...(oldCookieMap.domainCookieMap || {}),
      [domain]: {
        updateTime: Date.now(),
        createTime: oldCookieMap.domainCookieMap?.[domain]?.createTime || Date.now(),
        cookies: cookies,
        localStorageItems: localStorageItems
      },
    },
  };

  const res = await writeCookiesMapForIncognito(cloudflareAccountInfo, cookiesMap);
  return [res, cookiesMap];
};

export const readCookiesMapWithStatusForIncognito = async (cloudflareInfo: AccountInfo) => {
  let cookieMap: ICookiesMap | null = null;
  const domainStatus = await domainStatusStorage.get();
  if (domainStatus.pushing) {
    const snapshot = await incognitoCookieStorage.getSnapshot();
    cookieMap = snapshot || null;
  }
  if (cookieMap && Object.keys(cookieMap.domainCookieMap || {}).length > 0) {
    return cookieMap;
  }
  return await readCookiesMapForIncognito(cloudflareInfo);
};
