import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const guard = path.resolve('scripts/check-private-files.mjs');
let fixture: string;
const git = (...args: string[]) => execFileSync('git', args, { cwd: fixture, stdio: 'pipe' });

beforeEach(() => {
  fixture = mkdtempSync(path.join(tmpdir(), 'koyo-privacy-'));
  git('init', '-q');
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));

describe('private file guard', () => {
  it('permits ordinary application source', () => {
    writeFileSync(path.join(fixture, 'app.ts'), 'export const app = true;');
    git('add', 'app.ts');
    expect(spawnSync(process.execPath, [guard, '--staged'], { cwd: fixture }).status).toBe(0);
  });
  it.each(['requirment/private.md', '.env.local'])('rejects %s even if force-staged', (file) => {
    mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
    writeFileSync(path.join(fixture, file), 'synthetic private fixture');
    writeFileSync(path.join(fixture, '.gitignore'), '/requirment/\n.env*\n');
    git('add', '--force', file);
    expect(spawnSync(process.execPath, [guard, '--staged'], { cwd: fixture }).status).toBe(1);
    expect(spawnSync(process.execPath, [guard], { cwd: fixture }).status).toBe(1);
  });
});
