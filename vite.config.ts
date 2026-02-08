import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { devAuthMiddleware } from './scripts/dev-auth-middleware';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'dev-auth',
        configureServer(server) {
          server.middlewares.use(devAuthMiddleware());
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
