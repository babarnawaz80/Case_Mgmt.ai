/**
 * crash-gate.mjs — Pre-deploy crash gate.
 *
 * Serves the freshly-built `dist/` with `vite preview` and runs the route
 * crash crawler against it. Exits non-zero if ANY route crashes (uncaught
 * error or ErrorBoundary), which aborts the deploy.
 *
 * Used as a Firebase hosting `predeploy` hook so no crash can reach prod.
 * Escape hatch: set SKIP_CRASH_GATE=1 to bypass (emergencies / no Playwright).
 *
 * Assumes `dist/` is already built (the predeploy hook builds first).
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const PORT = 4178;
const BASE = `http://localhost:${PORT}`;

if (process.env.SKIP_CRASH_GATE === '1') {
  console.log('[crash-gate] SKIP_CRASH_GATE=1 — skipping crash gate.');
  process.exit(0);
}

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: REPO, stdio: 'inherit', ...opts });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  return false;
}

let preview;
function shutdown(code) {
  if (preview && !preview.killed) {
    try { process.kill(-preview.pid); } catch { /* ignore */ }
    try { preview.kill('SIGKILL'); } catch { /* ignore */ }
  }
  process.exit(code);
}

(async () => {
  console.log('[crash-gate] starting vite preview on', BASE);
  preview = run('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  });
  preview.on('error', (e) => { console.error('[crash-gate] preview failed:', e); shutdown(1); });

  const up = await waitForServer(BASE);
  if (!up) {
    console.error('[crash-gate] preview server did not start — is dist/ built? (run `npm run build`)');
    shutdown(1);
  }
  console.log('[crash-gate] preview up — running route crash crawler…');

  const test = run('npx', [
    'playwright', 'test',
    '--config=playwright-ipmg.config.ts',
    'e2e-ipmg/e2e/crawler',
    '--project=chromium',
    '--workers=4',
  ], { env: { ...process.env, BASE_URL: BASE } });

  test.on('exit', (code) => {
    if (code === 0) {
      console.log('[crash-gate] ✓ no route crashes — deploy may proceed.');
    } else {
      console.error('[crash-gate] ✘ crash detected — DEPLOY ABORTED. See report above.');
    }
    shutdown(code ?? 1);
  });
})();
