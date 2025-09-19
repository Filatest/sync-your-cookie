/**
 * Incognito mode utilities for cookie synchronization
 */

export interface CookieStoreInfo {
  id: string;
  isIncognito: boolean;
  tabIds: number[];
}

/**
 * Get all cookie stores including incognito mode stores
 */
export const getAllCookieStores = async (): Promise<CookieStoreInfo[]> => {
  const stores = await chrome.cookies.getAllCookieStores();
  const result: CookieStoreInfo[] = [];
  
  for (const store of stores) {
    const isIncognito = store.tabIds.length > 0 ? await checkIfIncognitoTab(store.tabIds[0]) : false;
    result.push({
      id: store.id,
      isIncognito,
      tabIds: store.tabIds
    });
  }
  
  return result;
};

/**
 * Check if a tab is in incognito mode
 */
export const checkIfIncognitoTab = async (tabId: number): Promise<boolean> => {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.incognito || false;
  } catch (error) {
    console.error('Failed to check tab incognito status:', error);
    return false;
  }
};

/**
 * Get the incognito cookie store ID
 */
export const getIncognitoCookieStoreId = async (): Promise<string | null> => {
  console.log('🔍 Getting incognito cookie store ID...');
  const stores = await getAllCookieStores();
  
  console.log('📊 All cookie stores:', stores.map(s => ({
    id: s.id,
    isIncognito: s.isIncognito,
    tabCount: s.tabIds.length
  })));
  
  for (const store of stores) {
    if (store.tabIds.length > 0) {
      const isIncognito = await checkIfIncognitoTab(store.tabIds[0]);
      if (isIncognito) {
        return store.id;
      }
    }
  }
  
  return null;
};

/**
 * Check if any incognito windows are currently open
 */
export const hasIncognitoWindows = async (): Promise<boolean> => {
  try {
    const windows = await chrome.windows.getAll();
    return windows.some(window => window.incognito);
  } catch (error) {
    console.error('Failed to check incognito windows:', error);
    return false;
  }
};

/**
 * Get all incognito tabs
 */
export const getIncognitoTabs = async (): Promise<chrome.tabs.Tab[]> => {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.filter(tab => tab.incognito);
  } catch (error) {
    console.error('Failed to get incognito tabs:', error);
    return [];
  }
};

/**
 * Listen for incognito window events
 */
export const setupIncognitoListener = (
  onIncognitoOpened: (windowId: number) => void,
  onIncognitoClosed: (windowId: number) => void
) => {
  // Listen for new windows
  chrome.windows.onCreated.addListener(async (window) => {
    if (window.incognito) {
      console.log('Incognito window opened:', window.id);
      onIncognitoOpened(window.id!);
    }
  });

  // Listen for window removal
  chrome.windows.onRemoved.addListener(async (windowId) => {
    // We need to check if this was an incognito window
    // Since the window is already closed, we'll track this differently
    console.log('Window closed:', windowId);
    onIncognitoClosed(windowId);
  });
};

/**
 * Check if current window is incognito mode
 */
export const isCurrentWindowIncognito = async (): Promise<boolean> => {
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return currentTab?.incognito || false;
  } catch (error) {
    console.error('Failed to check incognito mode:', error);
    return false;
  }
};

/**
 * Get current tab info including incognito status
 */
export const getCurrentTabInfo = async (): Promise<{
  tab: chrome.tabs.Tab | null;
  isIncognito: boolean;
}> => {
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return {
      tab: currentTab || null,
      isIncognito: currentTab?.incognito || false,
    };
  } catch (error) {
    console.error('Failed to get current tab info:', error);
    return {
      tab: null,
      isIncognito: false,
    };
  }
};
