/**
 * JSON wire format for attestation bundles and revocations (hex for bytes,
 * decimal strings for bigints), and conversion to the exact witness value a
 * relying contract expects: kycAttestation() -> [KycAttestation, SchnorrSignature, issuerId].
 */
import type { JubjubPoint, KycAttestation, SchnorrSignature } from './format.js';
import { fromHex, toHex } from '../util/bytes.js';

export interface WirePoint { x: string; y: string }
export interface WireSignature { announcement: WirePoint; response: string }
export interface WireAttestation {
  subject: string;
  wallet: string;
  kycLevel: number;
  amlRiskScore: number;
  validUntil: number;
  travelRuleRef: string;
  salt: string;
}

/** What the CASP hands the customer (buyer or seller wallet / dApp). */
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

export const pointToWire = (p: JubjubPoint): WirePoint => ({ x: p.x.toString(), y: p.y.toString() });
export const pointFromWire = (p: WirePoint): JubjubPoint => ({ x: BigInt(p.x), y: BigInt(p.y) });
export const sigToWire = (s: SchnorrSignature): WireSignature => ({ announcement: pointToWire(s.announcement), response: s.response.toString() });
export const sigFromWire = (s: WireSignature): SchnorrSignature => ({ announcement: pointFromWire(s.announcement), response: BigInt(s.response) });

export function attestationToWire(a: KycAttestation): WireAttestation {
  return {
    subject: toHex(a.subject),
    wallet: toHex(a.wallet.bytes),
    kycLevel: Number(a.kycLevel),
    amlRiskScore: Number(a.amlRiskScore),
    validUntil: Number(a.validUntil),
    travelRuleRef: toHex(a.travelRuleRef),
    salt: toHex(a.salt),
  };
}

export function attestationFromWire(w: WireAttestation): KycAttestation {
  return {
    subject: fromHex(w.subject, 32),
    wallet: { bytes: fromHex(w.wallet, 32) },
    kycLevel: BigInt(w.kycLevel),
    amlRiskScore: BigInt(w.amlRiskScore),
    validUntil: BigInt(w.validUntil),
    travelRuleRef: fromHex(w.travelRuleRef, 32),
    salt: fromHex(w.salt, 32),
  };
}

/** The value to return from the relying contract's `kycAttestation` witness. */
export function bundleToWitness(b: AttestationBundle): [KycAttestation, SchnorrSignature, Uint8Array] {
  return [attestationFromWire(b.attestation), sigFromWire(b.signature), fromHex(b.issuerId, 32)];
}
