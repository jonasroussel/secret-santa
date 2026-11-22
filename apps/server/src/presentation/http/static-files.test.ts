import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createStaticFiles } from './static-files.ts';

test('the built client is served, and nothing outside it', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'secret-santa-static-'));
  const dist = join(folder, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), 'index');
  writeFileSync(join(dist, 'assets', 'app-1a2b.js'), 'app');
  writeFileSync(join(folder, 'secret.txt'), 'secret');
  const serve = createStaticFiles(dist);
  const body = async (path: string) => (await serve(new Request(`http://localhost${path}`))).text();

  expect(await body('/assets/app-1a2b.js')).toBe('app');
  expect(await body('/%2E%2E%2Fsecret.txt')).toBe('index');
  expect(await body('/%E0%A4%A')).toBe('index');
  expect(await body('/%00')).toBe('index');
  expect(await body('/participants/unknown')).toBe('index');
});
