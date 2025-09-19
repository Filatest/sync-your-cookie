import { getAllCookieStores, getIncognitoCookieStoreId, hasIncognitoWindows } from '@sync-your-cookie/shared/lib/incognito';
import { cloudflareStorage } from '@sync-your-cookie/storage/lib/cloudflareStorage';
import { settingsStorage } from '@sync-your-cookie/storage/lib/settingsStorage';

/**
 * Debug helper for incognito mode functionality
 */
export const debugIncognitoMode = async () => {
  console.log('🔍 === INCOGNITO MODE DEBUG INFO ===');

  // 1. Check settings
  const settings = await settingsStorage.get();
  console.log('📋 Settings:', {
    enableIncognitoSync: settings?.enableIncognitoSync,
    protobufEncoding: settings?.protobufEncoding,
    includeLocalStorage: settings?.includeLocalStorage
  });

  // 2. Check Cloudflare config
  const cloudflareInfo = await cloudflareStorage.get();
  console.log('☁️ Cloudflare Config:', {
    accountId: !!cloudflareInfo.accountId ? 'SET' : 'MISSING',
    namespaceId: !!cloudflareInfo.namespaceId ? 'SET' : 'MISSING',
    token: !!cloudflareInfo.token ? 'SET' : 'MISSING'
  });

  // 3. Check incognito windows
  const hasIncognito = await hasIncognitoWindows();
  console.log('🎭 Incognito Windows:', hasIncognito);

  // 4. Check cookie stores
  const stores = await getAllCookieStores();
  console.log('🍪 Cookie Stores:', stores);

  // 5. Check incognito store ID
  const incognitoStoreId = await getIncognitoCookieStoreId();
  console.log('🎯 Incognito Store ID:', incognitoStoreId);

  // 6. Check current tabs
  try {
    const tabs = await chrome.tabs.query({});
    const incognitoTabs = tabs.filter(tab => tab.incognito);
    console.log('📱 Current Tabs:', {
      total: tabs.length,
      incognito: incognitoTabs.length,
      incognitoUrls: incognitoTabs.map(tab => ({ id: tab.id, url: tab.url }))
    });
  } catch (error) {
    console.error('❌ Error checking tabs:', error);
  }

  // 7. Check extension permissions
  try {
    const permissions = await chrome.permissions.getAll();
    console.log('🔑 Extension Permissions:', permissions);
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  }

  console.log('🔍 === DEBUG INFO END ===');
};
