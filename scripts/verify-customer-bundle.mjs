#!/usr/bin/env node
/**
 * customer-app のビルド成果物に、Admin 向け Algolia キー用の環境変数名や
 * 典型的な漏洩パターンが含まれていないか検査する。
 * Search-Only Key の値そのものはリポジトリに含めない前提のため、名前ベースのガード。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'apps/customer-app/dist');

const FORBIDDEN_SNIPPETS = [
  'VITE_ALGOLIA_ADMIN',
  'ALGOLIA_ADMIN_API_KEY',
  'ALGOLIA_ADMIN_KEY',
  'Admin API Key',
  'Write API Key',
  // Algolia の管理用キーを誤って VITE_ に載せた場合
  'VITE_ALGOLIA_WRITE',
];

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else if (/\.(js|css|html|map)$/i.test(name)) acc.push(p);
  }
  return acc;
}

function main() {
  const files = walkFiles(distDir);
  if (!files.length) {
    console.warn('[verify-customer-bundle] apps/customer-app/dist が空です。先に npm run build を実行してください。');
    process.exit(0);
  }

  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const bad of FORBIDDEN_SNIPPETS) {
      if (text.includes(bad)) {
        hits.push({ file: path.relative(root, file), snippet: bad });
      }
    }
  }

  if (hits.length) {
    console.error('[verify-customer-bundle] 禁止パターンが検出されました（Admin Key 混入の疑い）:');
    for (const h of hits) {
      console.error(`  ${h.file}: "${h.snippet}"`);
    }
    process.exit(1);
  }

  console.log('[verify-customer-bundle] OK — 禁止パターンは検出されませんでした。');
  console.log('  補足: API Key の値そのものはコミットしないでください。Search-Only Key のみ .env に設定してください。');
}

main();
