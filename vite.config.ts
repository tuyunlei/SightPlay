import { cpSync } from 'fs';
import path from 'path';

import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

import { devAuthMiddleware } from './scripts/dev-auth-middleware.ts';
import { DEFAULT_DEV_PORT, LOOPBACK_HOST, resolvePort } from './scripts/server-config.ts';

const __projectRoot = path.resolve(import.meta.dirname);

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
  const devPort = resolvePort('SIGHTPLAY_DEV_PORT', DEFAULT_DEV_PORT);
  const devHost = process.env.SIGHTPLAY_DEV_HOST || LOOPBACK_HOST;

  return {
    build: {
      sourcemap: isProd, // Generate sourcemaps in production
    },
    server: {
      port: devPort,
      host: devHost,
      strictPort: true,
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
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
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
