import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://iacs-3v3f.onrender.com' : '');
const targetApiUrl = API_URL ? API_URL.replace(/\/+$/, '') : '';

// Override global fetch in production to route API requests to the Render backend
if (targetApiUrl) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = targetApiUrl + input;
    } else if (input instanceof Request && input.url.includes('/api/')) {
      try {
        const url = new URL(input.url);
        if (url.pathname.startsWith('/api/')) {
          const newUrl = targetApiUrl + url.pathname + url.search;
          input = new Request(newUrl, input);
        }
      } catch (_) {}
    }
    return originalFetch(input, init);
  };

  // Warm-up: ping the backend immediately so Render wakes up before users
  // navigate to pages that need data. The /api/health endpoint is lightweight.
  fetch(`${targetApiUrl}/api/health`, { method: 'GET' }).catch(() => {
    // Silently ignore - this is a best-effort warm-up only
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
