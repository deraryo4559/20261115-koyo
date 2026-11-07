import { execFileSync } from 'node:child_process';

const staged = process.argv.includes('--staged');
let files;
try {
  files = execFileSync('git', staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
} catch {
  console.error('Gitの追跡状態を確認できません。プロジェクトルートで git init を実行してください。');
  process.exit(1);
}
const privatePath = /(^|\/)(requirment|requirements|\.local|\.sites-runtime|\.wrangler|outputs|work)(\/|$)|(^|\/)\.env($|\.)|\.(pem|key)$/i;
const forbidden = files.filter((file) => privatePath.test(file) && !/(^|\/)\.env\.example$/.test(file));
if (forbidden.length) {
  console.error('非公開ファイルがGitの追跡対象に含まれています。コミット／pushを中止しました。');
  for (const file of forbidden) console.error(`- ${file}`);
  console.error('ファイルを手元に残す場合は git rm --cached <対象ファイル> で追跡を解除してください。');
  process.exit(1);
}
console.log(`非公開ファイルの混入なし (${staged ? 'staged files' : 'tracked files'})`);
