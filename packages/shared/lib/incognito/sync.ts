// ...existing code...
import { incognitoCookieStorage } from '@sync-your-cookie/storage/lib/incognitoCookieStorage';

/**
 * Remove incognito cookies for a domain and sync to cloudflare KV
 */
export const removeIncognitoCookies = async (domain: string): Promise<any> => {
  const cloudflareInfo = await cloudflareStorage.get();
  // 拉取云端最新 incognito cookieMap
  const oldCookie = await readCookiesMapForIncognito(cloudflareInfo);
  // 删除本地和云端（只操作无痕 key）
  const [res, cookieMap] = await import('../cookie/withCloudflare').then(m => m.removeAndWriteCookiesForIncognito(cloudflareInfo, domain, oldCookie));
  if (res.success) {
    await incognitoCookieStorage.update(cookieMap);
  }
  return res;
};
/**
 * Incognito mode cookie synchronization
 */

import type { ICookie, ILocalStorageItem } from '@sync-your-cookie/protobuf';
import { cloudflareStorage } from '@sync-your-cookie/storage/lib/cloudflareStorage';
import { settingsStorage } from '@sync-your-cookie/storage/lib/settingsStorage';
import { readCookiesMapForIncognito } from '../cookie/withCloudflare';
import { getIncognitoCookieStoreId } from './index';

/**
 * Sync cookies from cloud to incognito mode
 */
export const syncCookiesToIncognito = async (): Promise<boolean> => {
  try {
    console.log('🔍 Starting incognito sync process...');
    
    const cloudflareInfo = await cloudflareStorage.get();
    const settings = await settingsStorage.get();
    
    console.log('📋 Settings:', { 
      enableIncognitoSync: settings?.enableIncognitoSync,
      hasCloudflareConfig: !!(cloudflareInfo.accountId && cloudflareInfo.namespaceId && cloudflareInfo.token)
    });
    
    // Check if incognito sync is enabled
    if (!settings?.enableIncognitoSync) {
      console.log('❌ Incognito sync is disabled in settings');
      return false;
    }
    
    // Check Cloudflare configuration
    if (!cloudflareInfo.accountId || !cloudflareInfo.namespaceId || !cloudflareInfo.token) {
      console.log('❌ Cloudflare not configured for incognito sync', {
        accountId: !!cloudflareInfo.accountId,
        namespaceId: !!cloudflareInfo.namespaceId,
        token: !!cloudflareInfo.token
      });
      return false;
    }

    // Get incognito cookie store
    const incognitoStoreId = await getIncognitoCookieStoreId();
    console.log('🔍 Incognito store ID:', incognitoStoreId);
    
    if (!incognitoStoreId) {
      console.log('❌ No incognito cookie store found');
      return false;
    }

    console.log('☁️ Reading cookies from Cloudflare KV (incognito storage)...');

    // Read cookies from Cloudflare KV using incognito-specific storage key
    const cookiesMap = await readCookiesMapForIncognito(cloudflareInfo);
    
    console.log('📊 Cookies map from cloud:', {
      hasDomainMap: !!cookiesMap.domainCookieMap,
      domainCount: cookiesMap.domainCookieMap ? Object.keys(cookiesMap.domainCookieMap).length : 0,
      domains: cookiesMap.domainCookieMap ? Object.keys(cookiesMap.domainCookieMap) : []
    });
    
    if (!cookiesMap.domainCookieMap) {
      console.log('❌ No cookies found in cloud storage');
      return false;
    }

    let syncedCount = 0;

    // Set cookies for each domain in incognito mode
    for (const [domain, domainData] of Object.entries(cookiesMap.domainCookieMap)) {
      if (domainData.cookies && domainData.cookies.length > 0) {
        await syncDomainCookiesToIncognito(domain, domainData.cookies, incognitoStoreId);
        syncedCount += domainData.cookies.length;
        
        // Also handle localStorage if available (for content script injection)
        if (domainData.localStorageItems && domainData.localStorageItems.length > 0) {
          await syncLocalStorageToIncognito(domain, domainData.localStorageItems);
        }
      }
    }

    console.log(`Successfully synced ${syncedCount} cookies to incognito mode`);
    return true;
    
  } catch (error) {
    console.error('Failed to sync cookies to incognito mode:', error);
    return false;
  }
};

/**
 * Sync cookies for a specific domain to incognito mode
 */
export const syncDomainCookiesToIncognito = async (
  domain: string, 
  cookies: ICookie[], 
  storeId: string
): Promise<void> => {
  console.log(`🍪 Starting sync for domain: ${domain}, cookies count: ${cookies.length}`);
  
  for (const cookie of cookies) {
    try {
      // Skip invalid cookies
      if (!cookie.name || !cookie.domain) {
        console.log(`⚠️ Skipping invalid cookie: name=${cookie.name}, domain=${cookie.domain}`);
        continue;
      }

      // Enhanced domain and URL construction
      let cookieDomain = cookie.domain;
      let targetDomain = cookieDomain;
      
      // Handle domain format (remove leading dot for URL construction)
      if (cookieDomain.startsWith('.')) {
        targetDomain = cookieDomain.slice(1);
      }
      
      // Determine protocol - prefer HTTPS for security
      const protocol = cookie.secure !== false ? 'https' : 'http';
      const cookiePath = cookie.path || '/';
      const url = `${protocol}://${targetDomain}${cookiePath}`;

      console.log(`🔧 Setting cookie: ${cookie.name}`, {
        originalDomain: cookie.domain,
        targetDomain,
        url,
        path: cookiePath,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        hasExpiration: !!cookie.expirationDate,
        isSession: cookie.session
      });

      // Prepare cookie parameters
      const cookieParams: chrome.cookies.SetDetails = {
        url: url,
        name: cookie.name,
        value: cookie.value || '',
        storeId: storeId
      };

      // Set domain exactly as stored (preserve leading dot if present)
      if (cookie.domain) {
        cookieParams.domain = cookie.domain;
      }
      
      // Set path
      if (cookie.path) {
        cookieParams.path = cookie.path;
      }

      // Handle security flags
      if (typeof cookie.secure === 'boolean') {
        cookieParams.secure = cookie.secure;
      }

      if (typeof cookie.httpOnly === 'boolean') {
        cookieParams.httpOnly = cookie.httpOnly;
      }

      // Handle expiration - detect and fix corrupted timestamps from protobuf float precision loss
      if (cookie.expirationDate && !cookie.session) {
        // Convert from milliseconds to seconds for Chrome API
        const expirationSeconds = Math.floor(cookie.expirationDate / 1000);
        const now = Math.floor(Date.now() / 1000);
        
        // Get force sync setting for recovery from corrupted data
        const settings = await settingsStorage.get();
        const forceSync = settings?.forceIncognitoSync || false;
        
        // Detect corrupted expiration dates (before year 2020 = 1577836800)
        // This happens due to protobuf float precision loss for large timestamps
        const isCorruptedDate = expirationSeconds < 1577836800; // Jan 1, 2020
        const isAuthCookie = /^(SESSDATA|bili_jct|DedeUserID|user_session|logged_in|dotcom_user|remember_user_token|gitee-session|_gh_sess)/.test(cookie.name);
        
        if (isCorruptedDate) {
          if (isAuthCookie || forceSync) {
            // For important auth cookies with corrupted dates, set reasonable future expiration
            const oneYearFromNow = now + (365 * 24 * 60 * 60);
            cookieParams.expirationDate = oneYearFromNow;
            console.log(`🔧 Fixed corrupted expiration for ${isAuthCookie ? 'auth ' : ''}cookie ${cookie.name}: ${expirationSeconds} -> ${oneYearFromNow} ${forceSync ? '(force sync enabled)' : ''}`);
          } else {
            console.log(`⏰ Skipping cookie with corrupted expiration: ${cookie.name} (${expirationSeconds}, likely protobuf precision loss)`);
            continue;
          }
        } else if (expirationSeconds > now || forceSync) {
          cookieParams.expirationDate = forceSync && expirationSeconds <= now ? now + (30 * 24 * 60 * 60) : expirationSeconds; // 30 days if force sync
          if (forceSync && expirationSeconds <= now) {
            console.log(`🔧 Force syncing expired cookie: ${cookie.name} with new expiration`);
          }
        } else {
          console.log(`⏰ Skipping expired cookie: ${cookie.name} (expired ${new Date(cookie.expirationDate * 1000).toISOString()})`);
          continue;
        }
      }

      // Handle SameSite attribute
      if (cookie.sameSite && cookie.sameSite !== 'unspecified') {
        cookieParams.sameSite = cookie.sameSite as any;
      }

      console.log(`📋 Final cookie params:`, {
        name: cookieParams.name,
        domain: cookieParams.domain,
        path: cookieParams.path,
        secure: cookieParams.secure,
        httpOnly: cookieParams.httpOnly,
        sameSite: cookieParams.sameSite,
        hasExpiration: !!cookieParams.expirationDate,
        url: cookieParams.url
      });

      const result = await chrome.cookies.set(cookieParams);
      if (result) {
        console.log(`✅ Successfully set cookie ${cookie.name} for ${targetDomain}`, result);
      } else {
        console.warn(`⚠️ Cookie set returned null: ${cookie.name} for ${targetDomain}`);
      }
    } catch (error) {
      console.error(`❌ Failed to set cookie ${cookie.name} for domain ${domain}:`, error, {
        cookieData: {
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
          session: cookie.session
        }
      });
    }
  }
};

/**
 * Sync localStorage data to incognito mode (via content script injection)
 */
export const syncLocalStorageToIncognito = async (
  domain: string,
  localStorageItems: ILocalStorageItem[]
): Promise<void> => {
  try {
    // Get incognito tabs for this domain
    const tabs = await chrome.tabs.query({ url: `*://${domain}/*` });
    const incognitoTabs = tabs.filter(tab => tab.incognito);

    for (const tab of incognitoTabs) {
      if (tab.id) {
        // Inject localStorage data via content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (items: ILocalStorageItem[]) => {
            try {
              items.forEach(item => {
                if (item.key && item.value !== null && item.value !== undefined) {
                  localStorage.setItem(item.key, item.value);
                }
              });
            } catch (error) {
              console.error('Failed to set localStorage items:', error);
            }
          },
          args: [localStorageItems]
        });
      }
    }
  } catch (error) {
    console.error(`Failed to sync localStorage for domain ${domain}:`, error);
  }
};

/**
 * Clear all cookies in incognito mode
 */
export const clearIncognitoCookies = async (): Promise<void> => {
  try {
    const incognitoStoreId = await getIncognitoCookieStoreId();
    if (!incognitoStoreId) {
      console.log('No incognito cookie store found');
      return;
    }

    // Get all cookies in incognito store
    const cookies = await chrome.cookies.getAll({ storeId: incognitoStoreId });
    
    // Remove each cookie
    for (const cookie of cookies) {
      await chrome.cookies.remove({
        url: `https://${cookie.domain}${cookie.path}`,
        name: cookie.name,
        storeId: incognitoStoreId
      });
    }

    const logMsg = `Cleared ${cookies.length} cookies from incognito mode`;
    console.log(logMsg);
    // 主动广播日志到所有无痕窗口
    chrome.runtime.sendMessage({
      type: 'INC_LOG',
      payload: {
        msg: logMsg,
        count: cookies.length,
        ts: Date.now()
      }
    });
  } catch (error) {
    console.error('Failed to clear incognito cookies:', error);
  }
};

/**
 * Get cookies from incognito mode for a specific domain
 */
export const getIncognitoCookiesForDomain = async (domain: string): Promise<chrome.cookies.Cookie[]> => {
  try {
    const incognitoStoreId = await getIncognitoCookieStoreId();
    if (!incognitoStoreId) {
      return [];
    }

    return await chrome.cookies.getAll({ 
      domain: domain,
      storeId: incognitoStoreId 
    });
  } catch (error) {
    console.error(`Failed to get incognito cookies for domain ${domain}:`, error);
    return [];
  }
};
