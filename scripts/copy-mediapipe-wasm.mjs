/**
 * Copies the MediaPipe tasks-vision wasm bundle into public/wasm.
 *
 * The hand tracker loads its wasm from our own origin rather than a CDN, so
 * the app keeps working offline. The bundle is build output from the npm
 * package, so it is regenerated here instead of being committed.
 */
import { cp, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'wasm');

try {
  await access(src);
} catch {
  console.warn('[assets] @mediapipe/tasks-vision not installed yet — skipping wasm copy.');
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log('[assets] MediaPipe wasm copied to public/wasm');
