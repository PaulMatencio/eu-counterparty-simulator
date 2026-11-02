#!/usr/bin/env node
// Stops the CASP simulator REST API started with `npm run start-server` / `casp-sim serve`.
//
//   node scripts/stop-server.mjs [--port 8787] [--all] [--force] [--timeout 5000]
//
// Finds node processes running `dist/src/cli.js serve` (or `casp-sim serve`) from this
// project directory, sends SIGTERM, waits up to --timeout ms, then reports any survivor
// (or sends SIGKILL with --force).
//   --port N   only stop the server on port N (default: CASP_PORT or 8787)
//   --all      stop every simulator server from this project, whatever its port
// Linux only (reads /proc).
import { existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const all = args.includes('--all');
const force = args.includes('--force');
const timeoutMs = Number(opt('timeout', '5000'));
const wantPort = String(opt('port', process.env.CASP_PORT ?? '8787'));
const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

if (!existsSync('/proc/self/cmdline')) {
  console.error('stop-server: /proc not available (Linux only). Stop the server with Ctrl+C in its terminal.');
  process.exit(2);
}

const read = (p) => {
  try { return readFileSync(p, 'utf8'); } catch { return null; }
};

/** Port a `serve` process listens on: --port arg, else its CASP_PORT env, else 8787 (same rule as cli.ts). */
function portOf(pid, argv) {
  const i = argv.indexOf('--port');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  const env = read(`/proc/${pid}/environ`);
  const m = env?.split('\0').find((e) => e.startsWith('CASP_PORT='));
  return m ? m.slice('CASP_PORT='.length) : '8787';
}

function findServers() {
  const found = [];
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    const raw = read(`/proc/${pid}/cmdline`);
    if (!raw) continue;
    const argv = raw.split('\0').filter(Boolean);
    if (!argv.length || !basename(argv[0]).startsWith('node')) continue; // skip npm's `sh -c` wrapper
    const s = argv.findIndex((a) => a === 'serve');
    if (s < 1 || !/(cli\.js|casp-sim)$/.test(argv[s - 1])) continue;
    let cwd;
    try { cwd = readlinkSync(`/proc/${pid}/cwd`); } catch { continue; } // not ours to inspect
    const script = resolve(cwd, argv[s - 1]);
    if (cwd !== projectRoot && !script.startsWith(projectRoot + '/')) continue;
    const port = portOf(pid, argv);
    if (!all && port !== wantPort) continue;
    found.push({ pid, port, cmd: argv.join(' ') });
  }
  return found;
}

const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const servers = findServers();
if (!servers.length) {
  console.log(`No CASP simulator server running${all ? '' : ` on port ${wantPort}`} from ${projectRoot}.`);
  process.exit(0);
}

for (const s of servers) {
  console.log(`Stopping CASP simulator pid ${s.pid} (port ${s.port}): ${s.cmd}`);
  try { process.kill(s.pid, 'SIGTERM'); } catch (e) { console.error(`  SIGTERM failed: ${e.message}`); }
}

const deadline = Date.now() + timeoutMs;
let remaining = servers;
while (remaining.length && Date.now() < deadline) {
  await sleep(200);
  remaining = remaining.filter((s) => alive(s.pid));
}

if (remaining.length && force) {
  for (const s of remaining) {
    console.log(`  pid ${s.pid} still running, sending SIGKILL`);
    try { process.kill(s.pid, 'SIGKILL'); } catch {}
  }
  await sleep(300);
  remaining = remaining.filter((s) => alive(s.pid));
}

if (remaining.length) {
  console.error(`Still running: ${remaining.map((s) => s.pid).join(', ')} (re-run with --force to SIGKILL).`);
  process.exit(1);
}
console.log('CASP simulator stopped.');
