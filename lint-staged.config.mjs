import fs from 'node:fs';

const isSymlink = (filePath) => {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
};

const quote = (filePath) => JSON.stringify(filePath);

export default {
  '*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.{json,md,yml,yaml}': (files) => {
    const filtered = files.filter((filePath) => !isSymlink(filePath));
    if (filtered.length === 0) return [];
    return `prettier --write ${filtered.map(quote).join(' ')}`;
  },
};
