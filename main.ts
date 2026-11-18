import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const caps = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function assemble(destination = '/output') {
  mkdirSync(destination, { recursive: true });
  cpSync(new URL('./game/', import.meta.url), join(destination, 'game'), { recursive: true });
  const source = new URL('./screenshots/', import.meta.url);
  const screenshots = join(destination, 'screenshots');
  const dossier = join(destination, 'dossier.json');
  mkdirSync(screenshots, { recursive: true });
  const names = existsSync(source) ? readdirSync(source) : [];
  for (const name of readdirSync(screenshots)) {
    if (!names.includes(name) && /^\d+-.*\.jpg$/.test(name)) rmSync(join(screenshots, name));
  }
  if (!names.length) {
    if (existsSync(dossier)) rmSync(dossier);
    console.log('Game staged. Dossier pending the screenshot cover.');
    return;
  }
  cpSync(source, screenshots, { recursive: true });
  const report = buildDossier(destination, caps);
  writeFileSync(dossier, report);
}

assemble(process.env.MAKEFUN_OUTPUT_DIR);
