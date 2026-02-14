#!/usr/bin/env node

/**
 * 文件大小检查脚本
 * 阈值：300 行
 * 策略：硬约束 + 白名单
 *
 * 用法: node scripts/check-file-size.js [--max-lines=300] [--src=.]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const MAX_LINES = parseInt(getArg('max-lines', '300'), 10);
const SRC_DIR = getArg('src', '.');
const SRC = path.join(ROOT, SRC_DIR);

const IGNORED_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'dist',
  'coverage',
  'scripts',
]);

const WHITELIST = new Set([
  'App.tsx', // 根组件，含路由和全局布局，拆分收益不大
  'data/songs/library.ts', // 曲库数据文件，音符序列天然占行数
  'hooks/practiceSession/noteHandlers.ts', // 双手判定逻辑，TODO: 拆分
]);

function getSourceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ 目录不存在: ${dir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      if (entry.name === '__tests__') continue;
      getSourceFiles(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').length;
}

function main() {
  const files = getSourceFiles(SRC);
  const violations = [];

  for (const file of files) {
    const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = countLines(file);

    if (lines > MAX_LINES && !WHITELIST.has(relativePath)) {
      violations.push({ file: relativePath, lines });
    }
  }

  if (violations.length > 0) {
    console.error(`\n❌ 文件大小检查失败！以下文件超过 ${MAX_LINES} 行：\n`);
    for (const { file, lines } of violations) {
      console.error(`  ${file}: ${lines} 行`);
    }
    console.error(
      `\n如需添加白名单，请编辑 scripts/check-file-size.js 中的 WHITELIST\n`
    );
    process.exit(1);
  }

  console.log(`✅ 文件大小检查通过（阈值 ${MAX_LINES} 行）`);
  process.exit(0);
}

main();
