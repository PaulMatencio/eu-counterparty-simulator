import { readFileSync } from 'node:fs';
import type { Policy, SanctionsEntry } from './compliance/types.js';

const configDir = new URL('../../config/', import.meta.url); // from dist/src/

export function loadPolicy(path?: string): Policy {
  const raw = JSON.parse(readFileSync(path ?? new URL('policy.json', configDir), 'utf8'));
  delete raw._comment;
  return raw as Policy;
}

export function loadSanctions(path?: string): SanctionsEntry[] {
  return (JSON.parse(readFileSync(path ?? new URL('sanctions-sample.json', configDir), 'utf8')) as { entries: SanctionsEntry[] }).entries;
}
