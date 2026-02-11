import { cpSync } from 'fs';
import path from 'path';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

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

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;

  return {
    build: {
      sourcemap: isProd, // Generate sourcemaps in production
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      copyEdgeFunctions(),
      {
        name: 'dev-auth',
        configureServer(server: ViteDevServer) {
          server.middlewares.use(devAuthMiddleware(__projectRoot, server));
        },
      },
      // Upload sourcemaps to Sentry in production if auth token is available
      isProd &&
        hasSentryToken &&
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
