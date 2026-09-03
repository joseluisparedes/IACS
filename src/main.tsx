import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { supabase } from './lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://iacs-3v3f.onrender.com' : '');
const targetApiUrl = API_URL ? API_URL.replace(/\/+$/, '') : '';

// Override global fetch in production to route API requests to the Render backend
// and automatically inject Supabase session Authorization token into /api/ requests.
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  let finalInput = input;
  let finalInit = init || {};

  if (typeof input === 'string' && input.startsWith('/api/')) {
    if (targetApiUrl) {
      finalInput = targetApiUrl + input;
    }
  } else if (input instanceof Request && input.url.includes('/api/')) {
    try {
      const url = new URL(input.url);
      if (url.pathname.startsWith('/api/')) {
        const newUrl = (targetApiUrl || '') + url.pathname + url.search;
        finalInput = new Request(newUrl, input);
      }
    } catch (_) {}
  }

  // Auto-inject Supabase Bearer token for /api/ requests if user is authenticated
  const isApi = (typeof input === 'string' && input.includes('/api/')) ||
                (input instanceof Request && input.url.includes('/api/'));

  if (isApi) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const headers = new Headers(finalInit.headers || (input instanceof Request ? input.headers : {}));
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
          finalInit = { ...finalInit, headers };
        }
      }
    } catch (_) {}
  }

  return originalFetch(finalInput, finalInit);
};

if (targetApiUrl) {
  // Warm-up: ping the backend immediately so Render wakes up before users
  // navigate to pages that need data. The /api/health endpoint is lightweight.
  originalFetch(`${targetApiUrl}/api/health`, { method: 'GET' }).catch(() => {
    // Silently ignore - this is a best-effort warm-up only
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
