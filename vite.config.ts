import { cpSync } from 'fs';
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { devAuthMiddleware } from './scripts/dev-auth-middleware';

const __projectRoot = path.resolve(__dirname);

function copyEdgeFunctions(): Plugin {
  return {
    name: 'copy-edge-functions',
    apply: 'build',
    closeBundle() {
      cpSync('edge-functions', 'dist/edge-functions', { recursive: true });
    },
  };
}

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      copyEdgeFunctions(),
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
