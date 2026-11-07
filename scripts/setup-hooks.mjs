import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

if (existsSync('.git') && !process.env.CI) {
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
  console.log('リポジトリ専用のプライバシーチェックを有効化しました。');
}
