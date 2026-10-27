/**
 * Domain Layer — CASP Issuer Keys & Tamper-Evident Audit Chain Models.
 * Pure TypeScript, zero external dependencies.
 */
import type { WirePoint } from './attestation.js';

export type KeyStatus = 'active' | 'revoked';

export interface IssuerKeySummary {
  issuerId: string;
  publicKey: WirePoint;
  status: KeyStatus;
  createdAt: number;
  revokedAt?: number;
  format: 'KycAttestationV1';
}

export interface AuditEntry {
  seq: number;
  ts: number;
  type: string;
  actor: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  length: number;
  head: string;
  brokenAt?: number;
}

export type CaspBackendMode = 'embedded' | 'external';

export interface CaspHealthStatus {
  ok: boolean;
  casp: string;
  testOnly: boolean;
  currentTimestamp?: number;
}
