/**
 * Domain Layer — KycAttestationV1 Wire Format, Bundles, Revocations & Witness Preview.
 * Pure TypeScript, zero external dependencies.
 */
import type { TravelRuleRole } from './travel-rule.js';

export interface WirePoint {
  x: string;
  y: string;
}

export interface WireSignature {
  announcement: WirePoint;
  response: string;
}

export interface WireAttestation {
  subject: string;
  wallet: string;
  kycLevel: number;
  amlRiskScore: number;
  validUntil: number;
  travelRuleRef: string;
  salt: string;
}

export interface AttestationBundle {
  format: 'KycAttestationV1';
  issuerId: string;
  issuerPublicKey: WirePoint;
  attestation: WireAttestation;
  signature: WireSignature;
  /** kycReference(attestation): the on-chain *KycRef, used for revocation. */
  reference: string;
  issuedAt: number;
}

export interface RevocationBundle {
  format: 'KycAttestationV1';
  kind: 'attestation' | 'issuer';
  issuerId: string;
  /** Attestation reference for kind = attestation. */
  reference?: string;
  signature: WireSignature;
  reason: string;
  issuedAt: number;
}

export type AttestationStatus = 'active' | 'revoked' | 'expired';

export interface AttestationStatusRecord {
  reference: string;
  customerId: string;
  issuerId: string;
  role: TravelRuleRole;
  subject: string;
  wallet: string;
  kycLevel: number;
  validUntil: number;
  issuedAt: number;
  status: AttestationStatus;
  revokedAt?: number;
  revocationReason?: string;
}

export interface CircuitVerificationSummary {
  verifiedInCircuit: boolean;
  verifiedOffChain: boolean;
  computedKycReference: string;
  referenceMatches: boolean;
  checkedAt: number;
}

/** Validates a 32-byte hex string (with or without 0x prefix). */
export function isValidHex32(value: string): boolean {
  const clean = value.trim().replace(/^0x/i, '');
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

/** Normalizes a 32-byte hex string to lowercase without 0x prefix. */
export function normalizeHex32(value: string): string {
  return value.trim().replace(/^0x/i, '').toLowerCase();
}
