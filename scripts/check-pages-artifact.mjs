import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const basePath = process.env.SITE_BASE_PATH;
if (!basePath || !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('SITE_BASE_PATH must be a repository path such as /20261115-koyo.');
const root = path.resolve('dist/client', basePath.slice(1));
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const localAssets = paths.filter((url) => url.startsWith('/') && /\.(?:js|css|webp|png|svg)(?:\?|$)/.test(url));
for (const url of localAssets) {
  if (!url.startsWith(`${basePath}/`)) throw new Error(`Missing repository prefix: ${url}`);
  const localPath = url.slice(basePath.length + 1).split('?')[0];
  if (!existsSync(path.join(root, localPath))) throw new Error(`Missing asset: ${url}`);
}
const forbidden = /(^|\/)(requirment|requirements|\.git|\.env(?:\.[^/]*)?|node_modules|\.local)(\/|$)/i;
function inspect(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const relative = path.relative(root, fullPath).split(path.sep).join('/');
    if (forbidden.test(relative)) throw new Error(`Private material in Pages artifact: ${relative}`);
    if (statSync(fullPath).isDirectory()) inspect(fullPath);
  }
}
inspect(root);
if (!existsSync(path.join(root, 'index.txt'))) throw new Error('Missing static hydration payload.');
if (!html.includes('紅葉ドライブ地図')) throw new Error('Missing rendered application.');
console.log(`Pages artifact OK: ${path.relative(process.cwd(), root)} (${localAssets.length} asset references verified)`);
