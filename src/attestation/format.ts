/**
 * KycAttestationV1 format, backed by the compiled harness so the hashes are
 * byte-for-byte the ones a relying Midnight contract computes in-circuit.
 */
import type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';
import { pureCircuits, type KycAttestation, type SchnorrSignature } from '#kyc-harness';

export type { KycAttestation, SchnorrSignature, JubjubPoint };

export const FORMAT_VERSION = 'KycAttestationV1';

export const kycMessage = (att: KycAttestation): bigint => pureCircuits.kycMessage(att);
export const kycReference = (att: KycAttestation): Uint8Array => pureCircuits.kycReference(att);
export const kycRevocationMessage = (ref: Uint8Array): bigint => pureCircuits.kycRevocationMessage(ref);
export const issuerRevocationMessage = (issuerId: Uint8Array): bigint => pureCircuits.issuerRevocationMessage(issuerId);
