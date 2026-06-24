import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const API_URL = (import.meta as any).env.VITE_API_URL as string | undefined;

// Override global fetch in production to route API requests to the Render backend
if (API_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = API_URL + input;
    }
    return originalFetch(input, init);
  };

  // Warm-up: ping the backend immediately so Render wakes up before users
  // navigate to pages that need data. The /api/health endpoint is lightweight.
  fetch(`${API_URL}/api/health`, { method: 'GET' }).catch(() => {
    // Silently ignore - this is a best-effort warm-up only
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
