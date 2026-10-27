#!/usr/bin/env node
/**
 * casp-sim serve [--port 8787] [--data ./data]   start the REST API (TEST ONLY)
 * casp-sim personas                              list fixture personas
 */
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { CaspSimulator } from './casp/casp-simulator.js';
import { PERSONAS } from './compliance/personas.js';
import { loadPolicy, loadSanctions } from './config.js';
import { FileKeyStore } from './keys/key-store.js';
import { createCaspServer } from './api/server.js';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

if (args[0] === 'personas') {
  for (const p of Object.values(PERSONAS)) console.log(`${p.name.padEnd(22)} ${p.expected.decision.padEnd(8)} L${p.expected.kycLevel}  ${p.description}`);
} else if (args[0] === 'serve') {
  const port = Number(opt('port', process.env.CASP_PORT ?? '8787'));
  const host = opt('host', '127.0.0.1');
  const dataDir = opt('data', process.env.CASP_DATA_DIR ?? './data');
  const officerToken = process.env.CASP_OFFICER_TOKEN ?? randomBytes(16).toString('hex');
  const notaryToken = process.env.CASP_NOTARY_TOKEN ?? randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const casp = new CaspSimulator({
    policy: loadPolicy(),
    sanctions: loadSanctions(),
    keyStore: new FileKeyStore(join(dataDir, 'issuer-keys.json'), now),
    dataDir,
  });
  createCaspServer(casp, { officerToken, notaryToken }).listen(port, host, () => {
    console.log(`CASP simulator (TEST ONLY, synthetic data only) on http://${host}:${port}`);
    console.log(`  data dir      ${dataDir}`);
    console.log(`  issuer key    ${casp.publicKeys().find((k) => k.status === 'active')?.issuerId}`);
    if (!process.env.CASP_OFFICER_TOKEN) console.log(`  officer token ${officerToken}`);
    if (!process.env.CASP_NOTARY_TOKEN) console.log(`  notary token  ${notaryToken}`);
  });
} else {
  console.log('usage: casp-sim serve [--port 8787] [--host 127.0.0.1] [--data ./data] | casp-sim personas');
  process.exit(args.length ? 1 : 0);
}
