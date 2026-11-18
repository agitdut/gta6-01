// Run with node main.ts to stage the static game and screenshots before building
// the dossier. MAKEFUN_OUTPUT_DIR selects a local folder in place of /output.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// Match the scorer's limits so local builds catch the same oversized entries.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function assemble(destination = '/output') {
  mkdirSync(destination, { recursive: true });
  for (const folder of ['game', 'screenshots']) {
    const source = new URL(folder + '/', import.meta.url);
    const target = join(destination, folder);
    if (folder === 'screenshots' && !existsSync(source)) {
      mkdirSync(target, { recursive: true });
      continue;
    }
    cpSync(source, target, { recursive: true });
  }
  const dossier = buildDossier(destination, caps);
  writeFileSync(join(destination, 'dossier.json'), dossier);
}

assemble(process.env.MAKEFUN_OUTPUT_DIR);
