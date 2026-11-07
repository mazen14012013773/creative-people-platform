import { useState } from 'react';
import { api } from '@/services/api';

export const GitHubAuthButton = ({ returnTo }: { returnTo?: string }) => {
  const [pending, setPending] = useState(false);

  const startLogin = () => {
    const url = new URL(api.getUri({ url: '/auth/github' }), window.location.origin);
    if (returnTo) url.searchParams.set('returnTo', returnTo);
    setPending(true);
    // Use the current tab so the OAuth callback completes the same app session
    // and is not isolated in a popup by the browser's COOP policy.
    window.location.assign(url.toString());
  };

  return (
    <button type="button" onClick={startLogin} disabled={pending} className="btn w-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current" focusable="false"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.75-1.32-3.75-1.32-.5-1.3-1.24-1.65-1.24-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1.77 2.22 3.36 1.7.1-.73.4-1.22.7-1.5-2.48-.28-5.08-1.24-5.08-5.54 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.06 1.15a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.06-1.15 3.06-1.15.61 1.55.23 2.69.12 2.98.72.79 1.15 1.79 1.15 3.02 0 4.31-2.6 5.26-5.09 5.54.4.35.76 1.03.76 2.08v3.32c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
      <span>{pending ? 'جارٍ الانتقال إلى GitHub...' : 'متابعة باستخدام GitHub'}</span>
    </button>
  );
};
