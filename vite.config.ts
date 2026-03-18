import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      proxy: env.VITE_USE_RELATIVE_API === 'false'
        ? undefined
        : {
            '/api': {
              target: env.VITE_API_PROXY_TARGET || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net',
              changeOrigin: true,
              secure: true,
            },
            '/health': {
              target: env.VITE_API_PROXY_TARGET || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net',
              changeOrigin: true,
              secure: true,
            },
          },
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            routing: ['react-router-dom'],
            query: ['@tanstack/react-query'],
            forms: ['react-hook-form'],
            state: ['zustand'],
          },
        },
      },
    },
  };
});
