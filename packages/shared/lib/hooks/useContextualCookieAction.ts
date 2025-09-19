import { domainConfigStorage } from '@sync-your-cookie/storage/lib/domainConfigStorage';
import { domainStatusStorage } from '@sync-your-cookie/storage/lib/domainStatusStorage';
import {
    MessageErrorCode,
    pullCookieUsingMessage,
    pushCookieUsingMessage,
    removeCookieUsingMessage,
} from '../message';

import { toast as Toast } from 'sonner';
import { useStorageSuspense } from './index';
import { useIncognitoMode } from './useIncognitoMode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const catchHandler = (err: any, scene: 'push' | 'pull' | 'remove' | 'delete' | 'edit', toast: typeof Toast) => {
  const defaultMsg = `${scene} fail`;
  if (err?.code === MessageErrorCode.AccountCheck || err?.code === MessageErrorCode.CloudflareNotFoundRoute) {
    toast.error(err?.msg || err?.result?.message || defaultMsg, {
      action: {
        label: 'go to settings',
        onClick: () => {
          chrome.runtime.openOptionsPage();
        },
      },
    });
  } else {
    toast.error(err?.msg || defaultMsg);
  }
  console.log('err', err);
};

export const useContextualCookieAction = (host: string, toast: typeof Toast) => {
  const { isIncognito } = useIncognitoMode();
  const domainStatus = useStorageSuspense(domainStatusStorage);
  const domainConfig = useStorageSuspense(domainConfigStorage);

  const handlePush = async (selectedHost = host, sourceUrl?: string, favIconUrl?: string) => {
    return pushCookieUsingMessage({
      host: selectedHost,
      sourceUrl,
      favIconUrl,
      isIncognito,
    })
      .then(res => {
        if (res.isOk) {
          toast.success(`Pushed success ${isIncognito ? '(Incognito)' : ''}`);
        } else {
          toast.error(res.msg || 'Pushed fail');
        }
        console.log('res', res);
      })
      .catch(err => {
        catchHandler(err, 'push', toast);
      });
  };

  const handlePull = async (activeTabUrl: string, selectedDomain = host, reload = true) => {
    return pullCookieUsingMessage({
      activeTabUrl: activeTabUrl,
      domain: selectedDomain,
      reload,
      isIncognito,
    })
      .then(res => {
        console.log('res', res);
        if (res.isOk) {
          toast.success(`Pull success ${isIncognito ? '(Incognito)' : ''}`);
        } else {
          toast.error(res.msg || 'Pull fail');
        }
      })
      .catch(err => {
        catchHandler(err, 'pull', toast);
      });
  };

  const handleRemove = async (selectedDomain = host) => {
    return removeCookieUsingMessage({
      domain: selectedDomain,
      isIncognito,
    })
      .then(async res => {
        console.log('res', res);
        if (res.isOk) {
          toast.success(res.msg || `Success ${isIncognito ? '(Incognito)' : ''}`);
          await domainConfigStorage.removeItem(host);
        } else {
          toast.error(res.msg || 'Removed fail');
        }
        console.log('res', res);
      })
      .catch(err => {
        catchHandler(err, 'remove', toast);
      });
  };

  return {
    // domainConfig: domainConfig as typeof domainConfig,
    pulling: domainStatus.pulling,
    pushing: domainStatus.pushing,
    domainItemConfig: domainConfig.domainMap[host] || {},
    domainItemStatus: domainStatus.domainMap[host] || {},
    getDomainItemConfig: (selectedDomain: string) => {
      return domainConfig.domainMap[selectedDomain] || {};
    },
    getDomainItemStatus: (selectedDomain: string) => {
      return domainStatus.domainMap[selectedDomain] || {};
    },
    toggleAutoPushState: async (selectedDomain = host) => {
      const current = domainConfig.domainMap[selectedDomain];
      await domainConfigStorage.updateItem(selectedDomain, {
        autoPush: !current?.autoPush,
      });
    },
    toggleAutoPullState: async (selectedDomain = host) => {
      const current = domainConfig.domainMap[selectedDomain];
      await domainConfigStorage.updateItem(selectedDomain, {
        autoPull: !current?.autoPull,
      });
    },
    handlePush,
    handlePull,
    handleRemove,
    isIncognito,
  };
};
