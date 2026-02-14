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

/**
 * 白名单豁免机制
 *
 * 每个条目必须包含完整的审批信息，缺字段会导致检查直接失败。
 * 添加新条目前必须经过项目负责人审批。
 *
 * 格式: { file, reason, approvedBy, approvedAt }
 */
const WHITELIST_ENTRIES = [
  // 示例:
  // { file: 'path/to/file.ts', reason: '...', approvedBy: 'tuyunlei', approvedAt: '2026-02-14' },
];

// 校验白名单条目格式
const REQUIRED_FIELDS = ['file', 'reason', 'approvedBy', 'approvedAt'];
for (const entry of WHITELIST_ENTRIES) {
  const missing = REQUIRED_FIELDS.filter((f) => !entry[f]);
  if (missing.length > 0) {
    console.error(
      `\n❌ 白名单条目格式错误: ${JSON.stringify(entry)}\n   缺少字段: ${missing.join(', ')}\n`
    );
    process.exit(1);
  }
}

const WHITELIST = new Set(WHITELIST_ENTRIES.map((e) => e.file));

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
      `\n豁免流程：拆分代码使其低于阈值；确实无法避免时，提交豁免申请经负责人审批后添加到 WHITELIST_ENTRIES\n`
    );
    process.exit(1);
  }

  console.log(`✅ 文件大小检查通过（阈值 ${MAX_LINES} 行）`);
  process.exit(0);
}

main();
