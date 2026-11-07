import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publish = path.join(root, '.local/pages-publish');
const remote = 'https://github.com/deraryo4559/20261115-koyo.git';
const env = { ...process.env, SITE_BASE_PATH: '/20261115-koyo' };
function run(command, args, cwd = root, capture = false) {
  return execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
}
function git(args, cwd = root, capture = false) { return run('git', args, cwd, capture); }
function requireClean(cwd) {
  if (git(['status', '--porcelain'], cwd, true).trim()) {
    throw new Error(`${cwd}: 未コミットの変更があります。内容を確認してcommitしてから再実行してください。自動commitは行いません。`);
  }
}
try {
  if (git(['branch', '--show-current'], root, true).trim() !== 'main') throw new Error('mainブランチで実行してください。');
  requireClean(root);
  if (git(['remote', 'get-url', 'origin'], root, true).trim() !== remote) throw new Error('originが想定した公開先と異なります。');
  run(process.execPath, ['scripts/check-private-files.mjs']);
  git(['fetch', 'origin', 'main']);
  git(['merge-base', '--is-ancestor', 'origin/main', 'HEAD']);
  const revision = git(['rev-parse', 'HEAD'], root, true).trim();
  console.log('\n公開パス付きで検証・ビルドします。');
  run('npm', ['run', 'check']);
  run(process.execPath, ['scripts/check-pages-artifact.mjs']);
  if (!existsSync(publish)) {
    mkdirSync(path.dirname(publish), { recursive: true });
    git(['clone', '--single-branch', '--branch', 'gh-pages', remote, publish]);
  }
  if (git(['rev-parse', '--show-toplevel'], publish, true).trim() !== publish ||
      git(['branch', '--show-current'], publish, true).trim() !== 'gh-pages' ||
      git(['remote', 'get-url', 'origin'], publish, true).trim() !== remote) {
    throw new Error('公開用ディレクトリのリポジトリ・ブランチ・公開先が一致しません。');
  }
  requireClean(publish);
  git(['pull', '--ff-only'], publish);
  // Refuse a divergent local publication rather than publishing unrelated commits.
  git(['merge-base', '--is-ancestor', 'origin/gh-pages', 'HEAD'], publish);
  requireClean(root);
  if (git(['rev-parse', 'HEAD'], root, true).trim() !== revision) throw new Error('ビルド中にソースが変更されました。再実行してください。');
  git(['push', 'origin', 'main']);
  run('rsync', ['-a', '--delete', '--exclude=.git/', `${root}/dist/client/20261115-koyo/`, `${publish}/`]);
  writeFileSync(path.join(publish, '.nojekyll'), '');
  git(['add', '.'], publish);
  run(process.execPath, [path.join(root, 'scripts/check-private-files.mjs'), '--staged'], publish);
  if (git(['diff', '--cached', '--name-only'], publish, true).trim()) {
    git(['commit', '-m', `Deploy ${revision.slice(0, 12)}`], publish);
  } else console.log('公開ファイルに変更はありません。');
  git(['push', 'origin', 'gh-pages'], publish);
  console.log('\n送信完了。GitHub Pagesの公開処理が完了すると反映されます。\nhttps://deraryo4559.github.io/20261115-koyo/');
} catch (error) {
  console.error('\n公開を中止しました。後続処理は実行していません。');
  console.error(error.message);
  process.exitCode = 1;
}
