import { useContextualCookieAction } from '@sync-your-cookie/shared';
import { useState } from 'react';
import { toast } from 'sonner';
export const useDomainConfig = () => {
  const [domain, setDomain] = useState('');
  const cookieAction = useContextualCookieAction(domain, toast);

  return {
    domain,
    setDomain,
    ...cookieAction,
  };
};
