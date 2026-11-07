import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const basePath = process.env.SITE_BASE_PATH;
if (!basePath || !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('SITE_BASE_PATH must be a repository path such as /20261115-koyo.');
const root = path.resolve('dist/client', basePath.slice(1));
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
let assetCount = 0;
function verifyAssets(markup) {
  const paths = [...markup.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  const localAssets = paths.filter((url) => url.startsWith('/') && /\.(?:js|css|webp|png|svg)(?:\?|$)/.test(url));
  for (const url of localAssets) {
    if (!url.startsWith(`${basePath}/`)) throw new Error(`Missing repository prefix: ${url}`);
    const localPath = url.slice(basePath.length + 1).split('?')[0];
    if (!existsSync(path.join(root, localPath))) throw new Error(`Missing asset: ${url}`);
  }
  assetCount += localAssets.length;
}
verifyAssets(html);
const catalog = JSON.parse(readFileSync('src/data/spots.json', 'utf8'));
for (const spot of catalog) {
  const albumDirectory = path.join(root, 'spots', spot.id.toLowerCase());
  const album = readFileSync(path.join(albumDirectory, 'index.html'), 'utf8');
  if (!album.includes(spot.name)) throw new Error(`Missing album: ${spot.id}`);
  if (!existsSync(path.join(albumDirectory, 'index.txt'))) throw new Error(`Missing album hydration: ${spot.id}`);
  if (!html.includes(`${basePath}/spots/${spot.id.toLowerCase()}/`)) throw new Error(`Missing gallery link: ${spot.id}`);
  verifyAssets(album);
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
console.log(`Pages artifact OK: ${catalog.length} albums, ${assetCount} asset references verified`);
