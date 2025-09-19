import { extractDomainAndPort, useTheme, withErrorBoundary, withSuspense } from '@sync-your-cookie/shared';

import { Button, Image, Spinner, Toaster } from '@sync-your-cookie/ui';
import { CloudDownload, CloudUpload, Copy, Copyright, Eye, PanelRightOpen, RotateCw, Settings, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AutoSwitch } from './components/AutoSwtich';
import { useDomainConfig } from './hooks/useDomainConfig';
import { useIncognitoSync } from './hooks/useIncognitoSync';
import { debugIncognitoMode } from './utils/debugIncognito';

const Popup = () => {
  const { theme } = useTheme();
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [favIconUrl, setFavIconUrl] = useState('');

  const {
    pushing,
    toggleAutoPushState,
    toggleAutoPullState,
    domain,
    setDomain,
    domainItemConfig,
    domainItemStatus,
    handlePush,
    handlePull,
    isIncognito,
  } = useDomainConfig();

  const {
    hasIncognito,
    syncing,
    clearing,
    isIncognitoSyncEnabled,
    syncToIncognito,
    clearIncognitoCookies,
    syncNormalToIncognitoStorage,
  } = useIncognitoSync();

  useEffect(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async function (tabs) {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.url && activeTab.url.startsWith('http')) {
          setFavIconUrl(activeTab?.favIconUrl || '');
          setActiveTabUrl(activeTab.url);
          if (activeTab.url.includes('www.') && !1) {
            const urlObj = new URL(activeTab.url);
            setDomain(urlObj.hostname + `${urlObj.port ? ':' + urlObj.port : ''}`);
          } else {
            const [domain, tempPort] = await extractDomainAndPort(activeTab.url);
            setDomain(domain + `${tempPort ? ':' + tempPort : ''}`);
          }
        }
      }
    });
  }, []);

  const isPushingOrPulling = domainItemStatus.pushing || domainItemStatus.pulling;

  return (
    <div className="flex flex-col items-center min-w-[400px] justify-center bg-background ">
      <header className=" p-2 flex w-full justify-between items-center bg-card/50 shadow-md border-b border-border ">
        <div className="flex items-center">
          <img
            src={chrome.runtime.getURL('options/logo.png')}
            className="h-10 w-10 overflow-hidden object-contain "
            alt="logo"
          />
          <div className="flex flex-col">
            <h2 className="text-base text-foreground font-bold">SyncYourCookie</h2>
            {isIncognito && (
              <div className="flex items-center gap-1 px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
                <span>Incognito</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            chrome.runtime.openOptionsPage();
          }}
          className="cursor-pointer text-sm mr-[-8px] ">
          <Settings size={20} />
        </Button>
      </header>
      <main className="p-4 ">
        <Spinner show={false}>
          {domain ? (
            <div className="flex justify-center items-center mb-2  ">
              <Image src={favIconUrl} />
              <h3 className="text-center whitespace-nowrap text-xl text-primary font-bold">{domain}</h3>
            </div>
          ) : null}

          <div className=" flex flex-col">
            {/* <Button title={cloudflareAccountId} className="mb-2" onClick={handleUpdateToken}>
            Update Token
          </Button> */}
            <div className="flex items-center mb-2 ">
              <Button
                disabled={!activeTabUrl || isPushingOrPulling || pushing}
                className=" mr-2 w-[160px] justify-start"
                onClick={() => handlePush(domain, activeTabUrl, favIconUrl)}>
                {domainItemStatus.pushing ? (
                  <RotateCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <CloudUpload size={16} className="mr-2" />
                )}
                Push cookie
              </Button>
              <AutoSwitch
                disabled={!activeTabUrl}
                onChange={() => toggleAutoPushState(domain)}
                id="autoPush"
                value={!!domainItemConfig.autoPush}
              />
            </div>

            <div className="flex items-center mb-2 ">
              <Button
                disabled={!activeTabUrl || isPushingOrPulling}
                className=" w-[160px] mr-2 justify-start"
                onClick={() => handlePull(activeTabUrl)}>
                {domainItemStatus?.pulling ? (
                  <RotateCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <CloudDownload size={16} className="mr-2" />
                )}
                Pull cookie
              </Button>

              <AutoSwitch
                disabled={!activeTabUrl}
                onChange={() => toggleAutoPullState(domain)}
                id="autoPull"
                value={!!domainItemConfig.autoPull}
              />
            </div>

            {/* Incognito Mode Section */}
            {hasIncognito && (
              <div className="border-t pt-2 mt-2 border-border">
                <div className="text-sm text-muted-foreground mb-2 flex items-center">
                  <Eye size={14} className="mr-1" />
                  Incognito Mode
                </div>
                
                <div className="flex items-center mb-2">
                  <Button
                    disabled={!isIncognitoSyncEnabled || syncing || clearing}
                    className="w-[160px] mr-2 justify-start"
                    variant="secondary"
                    onClick={syncToIncognito}>
                    {syncing ? (
                      <RotateCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <CloudDownload size={16} className="mr-2" />
                    )}
                    Sync to Incognito
                  </Button>
                  
                  <Button
                    disabled={clearing || syncing}
                    size="sm"
                    variant="outline"
                    onClick={clearIncognitoCookies}>
                    {clearing ? (
                      <RotateCw size={14} className="animate-spin" />
                    ) : (
                      <UserX size={14} />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center mb-2">
                  <Button
                    disabled={syncing || clearing}
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                    onClick={syncNormalToIncognitoStorage}>
                    {syncing ? (
                      <RotateCw size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Copy size={14} className="mr-2" />
                    )}
                    Copy Normal → Incognito Storage
                  </Button>
                </div>
                
                {!isIncognitoSyncEnabled && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                    Enable incognito sync in settings
                  </div>
                )}
                
                {/* Debug button */}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={debugIncognitoMode}>
                    🔍 Debug Info
                  </Button>
                </div>
              </div>
            )}

            <Button
              className="mb-2 justify-start"
              onClick={async () => {
                chrome.windows.getCurrent(async currentWindow => {
                  // const res = await chrome.sidePanel.getOptions({
                  //   tabId: currentWindow.id,
                  // });
                  chrome.sidePanel
                    .open({ windowId: currentWindow.id! })
                    .then(() => {
                      console.log('Side panel opened successfully');
                    })
                    .catch(error => {
                      console.error('Error opening side panel:', error);
                    });
                });
              }}>
              <PanelRightOpen size={16} className="mr-2" />
              Open Manager
            </Button>
          </div>
          <Toaster
            theme={theme}
            closeButton
            toastOptions={{
              duration: 1500,
              style: {
                // width: 'max-content',
                // margin: '0 auto',
              },
              // className: 'w-[240px]',
            }}
            visibleToasts={1}
            richColors
            position="top-center"
          />
        </Spinner>
      </main>
      <footer className="w-full text-center justify-center p-4 flex items-center border-t border-border/90 ">
        <span>
          <Copyright size={16} />
        </span>
        <a
          className=" inline-flex items-center mx-1 text-sm underline "
          href="https://github.com/jackluson"
          target="_blank"
          rel="noopener noreferrer">
          jackluson
        </a>
        <a href="https://github.com/jackluson/sync-your-cookie" target="_blank" rel="noopener noreferrer">
          <img
            src={chrome.runtime.getURL('popup/github.svg')}
            className="h-4 w-4 overflow-hidden object-contain "
            alt="logo"
          />
        </a>
      </footer>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
