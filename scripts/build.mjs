import { mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public');
// Only this generated directory is replaced. Never deploy the repository root.
await rm(output, { recursive: true, force: true });
await mkdir(output);
const obsolete = new Set(['team-builder.js', 'match-details-inline-1.js', 'cloud-sync.js', 'scorekeeper-enhance.js', 'scorekeeper-guard.js', 'formation-selector.js', 'away-team.js', 'app-state.js', 'app-view.js', 'team-links.js', 'auth-guard.js']);
for (const file of await readdir(root)) {
  if (/\.(html|css|js|png|mp4)$/.test(file) && !obsolete.has(file)) await copyFile(path.join(root, file), path.join(output, file));
}
console.log('Built public/ from browser assets only.');
