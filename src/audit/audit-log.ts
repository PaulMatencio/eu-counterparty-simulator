/**
 * Tamper-evident audit log: each entry carries sha256(prevHash || canonicalJson(entry)).
 * Entries hold identifiers and hashes only, never personal data, so the log
 * can be retained (AML record keeping) after GDPR erasure of a customer.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonicalJson } from '../util/canonical-json.js';
import { sha256, toHex, utf8 } from '../util/bytes.js';

export interface AuditEntry {
  seq: number;
  ts: number;
  type: string;
  actor: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

const GENESIS = '0'.repeat(64);

export class AuditLog {
  private readonly entries: AuditEntry[] = [];

  /** @param path optional JSONL file; existing entries are loaded and verified. */
  constructor(private readonly path?: string) {
    if (path && existsSync(path)) {
      for (const line of readFileSync(path, 'utf8').split('\n')) if (line.trim()) this.entries.push(JSON.parse(line));
      const v = this.verify();
      if (!v.valid) throw new Error(`audit log ${path} is corrupt at seq ${v.brokenAt}`);
    }
  }

  private static hashOf(e: Omit<AuditEntry, 'hash'>): string {
    return toHex(sha256(utf8(e.prevHash), utf8(canonicalJson({ seq: e.seq, ts: e.ts, type: e.type, actor: e.actor, data: e.data }))));
  }

  append(type: string, actor: string, data: Record<string, unknown>, ts: number): AuditEntry {
    const prevHash = this.entries.at(-1)?.hash ?? GENESIS;
    const base = { seq: this.entries.length, ts, type, actor, data: JSON.parse(canonicalJson(data)), prevHash };
    const entry: AuditEntry = { ...base, hash: AuditLog.hashOf(base) };
    this.entries.push(entry);
    if (this.path) {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, JSON.stringify(entry) + '\n');
    }
    return entry;
  }

  all(): readonly AuditEntry[] {
    return this.entries;
  }

  head(): string {
    return this.entries.at(-1)?.hash ?? GENESIS;
  }

  verify(entries: readonly AuditEntry[] = this.entries): { valid: boolean; length: number; brokenAt?: number } {
    let prev = GENESIS;
    for (const [i, e] of entries.entries()) {
      if (e.seq !== i || e.prevHash !== prev || AuditLog.hashOf(e) !== e.hash) return { valid: false, length: entries.length, brokenAt: i };
      prev = e.hash;
    }
    return { valid: true, length: entries.length };
  }
}
