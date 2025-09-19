import { MessageType, sendMessage } from '@sync-your-cookie/shared';
import { useStorageSuspense } from '@sync-your-cookie/shared/lib/hooks';
import { hasIncognitoWindows } from '@sync-your-cookie/shared/lib/incognito';
import { settingsStorage } from '@sync-your-cookie/storage/lib/settingsStorage';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useIncognitoSync = () => {
  const settings = useStorageSuspense(settingsStorage);
  const [hasIncognito, setHasIncognito] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Check for incognito windows periodically
  useEffect(() => {
    const checkIncognito = async () => {
      const hasIncognitoWins = await hasIncognitoWindows();
      setHasIncognito(hasIncognitoWins);
    };

    checkIncognito();
    
    // Check every 5 seconds
    const interval = setInterval(checkIncognito, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const syncToIncognito = async () => {
    if (!settings?.enableIncognitoSync) {
      toast.error('Incognito sync is disabled. Please enable it in settings first.');
      return;
    }

    setSyncing(true);
    try {
      const response = await sendMessage({
        type: MessageType.SyncToIncognito,
      });
      
      if (response.isOk) {
        toast.success('Successfully synced cookies to incognito mode');
      } else {
        toast.error(response.msg || 'Failed to sync cookies to incognito mode');
      }
    } catch (error) {
      console.error('Sync to incognito error:', error);
      toast.error('Failed to sync cookies to incognito mode');
    } finally {
      setSyncing(false);
    }
  };

  const clearIncognitoCookies = async () => {
    setClearing(true);
    try {
      const response = await sendMessage({
        type: MessageType.ClearIncognitoCookies,
      });
      
      if (response.isOk) {
        toast.success('Successfully cleared incognito cookies');
      } else {
        toast.error(response.msg || 'Failed to clear incognito cookies');
      }
    } catch (error) {
      console.error('Clear incognito cookies error:', error);
      toast.error('Failed to clear incognito cookies');
    } finally {
      setClearing(false);
    }
  };

  const syncNormalToIncognitoStorage = async () => {
    setSyncing(true);
    try {
      const response = await sendMessage({
        type: MessageType.SyncNormalToIncognitoStorage,
      });
      
      if (response.isOk) {
        toast.success('Successfully copied normal cookies to incognito storage');
      } else {
        toast.error(response.msg || 'Failed to copy cookies to incognito storage');
      }
    } catch (error) {
      console.error('Sync normal to incognito storage error:', error);
      toast.error('Failed to sync to incognito storage');
    } finally {
      setSyncing(false);
    }
  };

  return {
    hasIncognito,
    syncing,
    clearing,
    isIncognitoSyncEnabled: settings?.enableIncognitoSync || false,
    syncToIncognito,
    clearIncognitoCookies,
    syncNormalToIncognitoStorage,
  };
};
