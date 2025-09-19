import { useEffect, useState } from 'react';
import { getCurrentTabInfo } from '../incognito';

/**
 * Hook to detect if current context is in incognito mode
 */
export const useIncognitoMode = () => {
  const [isIncognito, setIsIncognito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkIncognitoMode = async () => {
      try {
        const { isIncognito: incognito } = await getCurrentTabInfo();
        if (mounted) {
          setIsIncognito(incognito);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to check incognito mode:', error);
        if (mounted) {
          setIsIncognito(false);
          setLoading(false);
        }
      }
    };

    checkIncognitoMode();

    // Listen for tab changes
    const handleTabUpdate = () => {
      checkIncognitoMode();
    };

    // Listen for window focus changes
    const handleWindowFocus = () => {
      checkIncognitoMode();
    };

    if (chrome.tabs && chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(handleTabUpdate);
    }

    if (chrome.windows && chrome.windows.onFocusChanged) {
      chrome.windows.onFocusChanged.addListener(handleWindowFocus);
    }

    return () => {
      mounted = false;
      if (chrome.tabs && chrome.tabs.onActivated) {
        chrome.tabs.onActivated.removeListener(handleTabUpdate);
      }
      if (chrome.windows && chrome.windows.onFocusChanged) {
        chrome.windows.onFocusChanged.removeListener(handleWindowFocus);
      }
    };
  }, []);

  return {
    isIncognito,
    loading,
  };
};
