import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkArchitectureFitness } from './check-architecture-fitness.mjs';

function packageAt(root, name, architecture, files) {
  const directory = path.join(root, 'packages', name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: `@sightplay/${name}`, sightplayArchitecture: architecture })
  );
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(directory, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'sightplay-fitness-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function sourceAt(root, relative, content) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

test('rejects capability coupling, unsafe JSON admission, and missing lifecycle contracts', () => {
  fixture((root) => {
    packageAt(
      root,
      'undeclared',
      { role: 'capability' },
      {
        'src/public.ts': 'export type Undeclared = {};',
      }
    );
    packageAt(
      root,
      'beta',
      { role: 'capability', lifecycle: { kind: 'none' } },
      {
        'src/public.ts': 'export type Beta = {};',
      }
    );
    packageAt(
      root,
      'alpha',
      {
        role: 'capability',
        lifecycle: {
          kind: 'managed-runtime',
          entry: 'src/runtime/alphaRuntime.ts',
          test: 'src/runtime/alphaRuntime.test.ts',
        },
      },
      {
        'src/model/state.ts': "import type { Beta } from '@sightplay/beta'; export type A = Beta;",
        'src/runtime/adapterLeak.ts':
          "import { load } from '@sightplay/browser-adapters'; export const leak = load;",
        'src/ports.ts':
          'export interface DevicePort { start(): void } export interface SchedulerPort { schedule(task: () => void): void }',
        'src/runtime/alphaRuntime.ts':
          'export interface AlphaRuntime { start(): void; dispose(): void } export class Engine implements AlphaRuntime { start() {} }',
        'src/runtime/alphaRuntime.test.ts':
          "import { Engine } from './alphaRuntime'; new Engine().start();",
      }
    );
    packageAt(
      root,
      'browser-adapters',
      { role: 'adapters' },
      {
        'src/http.ts':
          "import { readUnknownJson as admit } from '@sightplay/api-contracts'; export async function load(response: Response) { const raw = await admit(response); return raw as { ok: true }; } export async function direct(response: Response) { return response.json(); } export async function escape(response: Response) { return admit(response); }",
      }
    );
    sourceAt(
      root,
      'features/Broken.tsx',
      "import { createBrowserPracticePorts } from '@sightplay/browser-adapters'; export const broken = createBrowserPracticePorts;"
    );
    sourceAt(
      root,
      'functions/api/session.ts',
      "import { handle } from '../../server'; export const onRequestGet = handle;"
    );

    const messages = checkArchitectureFitness(root).map(({ message }) => message);
    assert(messages.some((message) => message.includes('must declare lifecycle.kind')));
    assert(messages.some((message) => message.includes('cannot import capability package beta')));
    assert(messages.some((message) => message.includes('cannot import adapters package browser-adapters')));
    assert(messages.some((message) => message.includes('readUnknownJson')));
    assert(messages.some((message) => message.includes('cannot assert admitted JSON')));
    assert(messages.some((message) => message.includes('must implement dispose')));
    assert(messages.some((message) => message.includes('starts resources but has no dispose')));
    assert(messages.some((message) => message.includes('must return a cancellation function')));
    assert(messages.some((message) => message.includes('exactly one /api/* catch-all')));
    assert(messages.some((message) => message.includes('cannot construct browser adapters')));
    assert(messages.some((message) => message.includes('Raw admitted JSON cannot be returned')));
  });
});

test('accepts isolated capabilities, typed JSON admission, and declared lifecycle contracts', () => {
  fixture((root) => {
    packageAt(
      root,
      'api-contracts',
      { role: 'contracts' },
      {
        'src/public.ts':
          'export declare function readUnknownJson(value: unknown): Promise<unknown>;',
      }
    );
    packageAt(
      root,
      'alpha',
      {
        role: 'capability',
        lifecycle: {
          kind: 'managed-runtime',
          entry: 'src/runtime/alphaRuntime.ts',
          test: 'src/runtime/alphaRuntime.test.ts',
        },
      },
      {
        'src/ports.ts':
          'export interface DevicePort { start(): void; dispose(): void } export interface SchedulerPort { schedule(task: () => void): () => void }',
        'src/runtime/alphaRuntime.ts':
          'export interface AlphaRuntime { start(): void; dispose(): void } export class Engine implements AlphaRuntime { start() {} dispose() {} }',
        'src/runtime/alphaRuntime.test.ts':
          "import { Engine } from './alphaRuntime'; new Engine().dispose();",
      }
    );
    packageAt(
      root,
      'browser-adapters',
      { role: 'adapters' },
      {
        'src/http.ts':
          "import { readUnknownJson as admit } from '@sightplay/api-contracts'; const narrow = (value: unknown) => typeof value === 'string' ? value : null; export async function load(response: Response) { const internal = response.ok as boolean; return internal ? narrow(await admit(response)) : null; }",
      }
    );
    sourceAt(
      root,
      'App.tsx',
      "import { load } from '@sightplay/browser-adapters'; export const app = load;"
    );
    sourceAt(
      root,
      'functions/api/[[path]].ts',
      "import { handlePagesRequest as handle } from '../_handler'; export const onRequest = handle;"
    );

    assert.deepEqual(checkArchitectureFitness(root), []);
  });
});
