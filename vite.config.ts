import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: mode === 'production' ? '/IACS/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'onnxruntime-node': path.resolve(__dirname, 'src/mocks/onnxruntime-node.ts'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL ||
        env.VITE_SUPABASE_URL ||
        env.SUPABASE_URL ||
        'https://gftvhbhckrzkgpchnfjm.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY ||
        env.VITE_SUPABASE_ANON_KEY ||
        env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHZoYmhja3J6a2dwY2huZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTU4NDEsImV4cCI6MjA5NjE3MTg0MX0.errqmsEdDxGXA4DAqLihOvy1qzMpg14CzxD_NywLUZU'
      ),
      'import.meta.env.VITE_API_URL': JSON.stringify(
        process.env.VITE_API_URL ||
        env.VITE_API_URL ||
        (mode === 'production' ? 'https://iacs-3v3f.onrender.com' : '')
      ),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    optimizeDeps: {},
    worker: {
      format: 'es',
    },
  };
});
