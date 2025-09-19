import {
  check,
  checkCloudflareResponse,
  CookieOperator,
  extractDomainAndPort,
  ICookie,
  Message,
  MessageType,
  pullAndSetCookies,
  PushCookieMessagePayload,
  pushCookies,
  pushCookiesForIncognito,
  removeCookieItem,
  removeCookies,
  sendMessage,
  SendResponse
} from '@sync-your-cookie/shared';
import { readCookiesMap, writeCookiesMapForIncognito } from '@sync-your-cookie/shared/lib/cookie/withCloudflare';
import { clearIncognitoCookies, removeIncognitoCookies, syncCookiesToIncognito } from '@sync-your-cookie/shared/lib/incognito/sync';
import { cloudflareStorage } from '@sync-your-cookie/storage/lib/cloudflareStorage';
import { cookieStorage } from '@sync-your-cookie/storage/lib/cookieStorage';
import { incognitoCookieStorage } from '@sync-your-cookie/storage/lib/incognitoCookieStorage';
import { settingsStorage } from '@sync-your-cookie/storage/lib/settingsStorage';

import { domainConfigStorage } from '@sync-your-cookie/storage/lib/domainConfigStorage';
import { domainStatusStorage } from '@sync-your-cookie/storage/lib/domainStatusStorage';

type HandleCallback = (response?: SendResponse) => void;

const handlePush = async (payload: PushCookieMessagePayload, callback: HandleCallback) => {
  const { sourceUrl, host, favIconUrl, isIncognito } = payload || {};
  try {
    await check();
    await domainConfigStorage.updateItem(host, {
      sourceUrl: sourceUrl,
      favIconUrl,
    });
    await domainStatusStorage.updateItem(host, {
      pushing: true,
    });
    const [domain] = await extractDomainAndPort(host);
    
    // Get cookies from appropriate cookie store based on incognito mode
    let cookies: chrome.cookies.Cookie[];
    if (isIncognito) {
      // For incognito mode, we need to get cookies from all stores and filter for incognito
      const allStores = await chrome.cookies.getAllCookieStores();
      const incognitoStore = allStores.find(store => store.id !== '0');
      if (incognitoStore) {
        cookies = await chrome.cookies.getAll({
          domain: domain,
          storeId: incognitoStore.id,
        });
      } else {
        cookies = [];
      }
    } else {
      cookies = await chrome.cookies.getAll({
        domain: domain,
        storeId: '0', // Default store for normal browsing
      });
    }
    
    let localStorageItems: NonNullable<Parameters<typeof pushCookies>[2]> = []
    const includeLocalStorage = settingsStorage.getSnapshot()?.includeLocalStorage;
    if (includeLocalStorage) {
      await sendMessage({
        type: MessageType.GetLocalStorage,
        payload: {
          domain: host
        }
      }, true).then((res) => {
        if (res.isOk) {
          localStorageItems = res.result as any[] || []
        }
      }).catch((err: any) => {
        console.log('getLocalStorage', err)
      })
    } else {
      // Use appropriate storage based on incognito mode
      const storage = isIncognito ? incognitoCookieStorage : cookieStorage;
      const cookieMap = await storage.getSnapshot();
      localStorageItems = cookieMap?.domainCookieMap?.[host]?.localStorageItems || []
    }

    if (cookies?.length) {
      // Use appropriate push function based on incognito mode
      const res = isIncognito 
        ? await pushCookiesForIncognito(host, cookies, localStorageItems)
        : await pushCookies(host, cookies, localStorageItems);
      checkCloudflareResponse(res, 'push', callback);
    } else {
      callback({ isOk: false, msg: 'no cookies found', result: cookies });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    checkCloudflareResponse(err, 'push', callback);
  } finally {
    await domainStatusStorage.togglePushingState(host, false);
  }
};

const handlePull = async (activeTabUrl: string, domain: string, isReload: boolean, callback: HandleCallback) => {
  try {
    await check();
    await domainStatusStorage.togglePullingState(domain, true);
    const cookieMap = await pullAndSetCookies(activeTabUrl, domain, isReload);
    console.log("handlePull->cookieMap", cookieMap);
    callback({ isOk: true, msg: 'Pull success', result: cookieMap });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    checkCloudflareResponse(err, 'pull', callback);
  } finally {
    await domainStatusStorage.togglePullingState(domain, false);
  }
};

const handleRemove = async (domain: string, callback: HandleCallback, isIncognito = false) => {
  try {
    await check();
    let res;
    if (isIncognito) {
      res = await removeIncognitoCookies(domain);
    } else {
      res = await removeCookies(domain);
    }
    if (res.success) {
      callback({ isOk: true, msg: 'Removed success' });
    } else {
      checkCloudflareResponse(res, 'remove', callback);
    }
  } catch (err: any) {
    checkCloudflareResponse(err, 'remove', callback);
  }
};

const handleRemoveItem = async (domain: string, id: string, callback: HandleCallback) => {
  try {
    await check();
    const res = await removeCookieItem(domain, id);
    if (res.success) {
      callback({ isOk: true, msg: 'Deleted success' });
    } else {
      checkCloudflareResponse(res, 'delete', callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    checkCloudflareResponse(err, 'delete', callback);
  }
};

const handleEditItem = async (domain: string, oldItem: ICookie, newItem: ICookie, callback: HandleCallback) => {
  try {
    await check();
    const res = await CookieOperator.editCookieItem(domain, oldItem, newItem);
    if (res.success) {
      callback({ isOk: true, msg: 'Edited success' });
    } else {
      checkCloudflareResponse(res, 'edit', callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    checkCloudflareResponse(err, 'edit', callback);
  }
};

const handleSyncToIncognito = async (callback: HandleCallback) => {
  try {
    console.log('Manual sync to incognito requested');
    const success = await syncCookiesToIncognito();
    if (success) {
      callback({ isOk: true, msg: 'Successfully synced cookies to incognito mode' });
    } else {
      callback({ isOk: false, msg: 'Failed to sync cookies to incognito mode' });
    }
  } catch (err: any) {
    console.error('Error syncing to incognito:', err);
    callback({ isOk: false, msg: err.message || 'Failed to sync cookies to incognito mode' });
  }
};

const handleSyncNormalToIncognitoStorage = async (callback: HandleCallback) => {
  try {
    console.log('🔄 Sync normal cookies to incognito storage requested');
    
    // Get normal mode cookies from current cloudflare storage
    const cloudflareInfo = await cloudflareStorage.get();
    if (!cloudflareInfo.accountId || !cloudflareInfo.namespaceId || !cloudflareInfo.token) {
      callback({ isOk: false, msg: 'Cloudflare not configured' });
      return;
    }

    // Read cookies from normal storage key
    const cookiesMap = await readCookiesMap(cloudflareInfo);
    
    if (!cookiesMap.domainCookieMap || Object.keys(cookiesMap.domainCookieMap).length === 0) {
      callback({ isOk: false, msg: 'No cookies found in normal storage' });
      return;
    }

    // Write cookies to incognito storage key
    await writeCookiesMapForIncognito(cloudflareInfo, cookiesMap);
    
    console.log('✅ Successfully copied normal cookies to incognito storage');
    callback({ 
      isOk: true, 
      msg: `Successfully copied ${Object.keys(cookiesMap.domainCookieMap).length} domains to incognito storage` 
    });
    
  } catch (err: any) {
    console.error('❌ Error syncing normal to incognito storage:', err);
    callback({ isOk: false, msg: err.message || 'Failed to sync normal cookies to incognito storage' });
  }
};

const handleClearIncognitoCookies = async (callback: HandleCallback) => {
  try {
    console.log('Clear incognito cookies requested');
    await clearIncognitoCookies();
    callback({ isOk: true, msg: 'Successfully cleared incognito cookies' });
  } catch (err: any) {
    console.error('Error clearing incognito cookies:', err);
    callback({ isOk: false, msg: err.message || 'Failed to clear incognito cookies' });
  }
};

function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  callback: (response?: SendResponse) => void,
) {
  const type = message.type;
  switch (type) {
    case MessageType.PushCookie:
      handlePush(message.payload, callback);
      break;
    case MessageType.PullCookie:
      // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-non-null-asserted-optional-chain
      const activeTabUrl = message.payload.activeTabUrl || sender.tab?.url!;
      handlePull(activeTabUrl!, message.payload.domain, message.payload.reload, callback);
      break;
    case MessageType.RemoveCookie:
      handleRemove(message.payload.domain, callback, message.payload.isIncognito);
      break;
    case MessageType.RemoveCookieItem:
      handleRemoveItem(message.payload.domain, message.payload.id, callback);
      break;
    case MessageType.EditCookieItem:
      handleEditItem(message.payload.domain, message.payload.oldItem, message.payload.newItem, callback);
      break;
    case MessageType.SyncToIncognito:
      handleSyncToIncognito(callback);
      break;
    case MessageType.ClearIncognitoCookies:
      handleClearIncognitoCookies(callback);
      break;
    case MessageType.SyncNormalToIncognitoStorage:
      handleSyncNormalToIncognitoStorage(callback);
      break;
    default:
      break;
  }
  return true;
}
export const refreshListen = async () => {
  chrome.runtime.onMessage.removeListener(handleMessage);
  chrome.runtime.onMessage.addListener(handleMessage);
};
