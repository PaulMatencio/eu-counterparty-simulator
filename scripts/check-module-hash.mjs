#!/usr/bin/env node
// Fails if compact/KycAttestationV1.compact no longer matches its pinned sha256.
// The format is a published interface: change it only by creating KycAttestationV2.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../compact/KycAttestationV1.compact', import.meta.url));
const pinned = readFileSync(new URL('../compact/KycAttestationV1.sha256', import.meta.url), 'utf8').trim();
const actual = createHash('sha256').update(src).digest('hex');
if (actual !== pinned) {
  console.error(`KycAttestationV1.compact changed: sha256 ${actual} != pinned ${pinned}`);
  process.exit(1);
}
console.log(`KycAttestationV1.compact sha256 ok (${pinned.slice(0, 12)}…)`);
