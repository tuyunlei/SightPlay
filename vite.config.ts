import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { devAuthMiddleware } from './scripts/dev-auth-middleware';

const __projectRoot = path.resolve(__dirname);

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
          server.middlewares.use(devAuthMiddleware(__projectRoot, server));
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
