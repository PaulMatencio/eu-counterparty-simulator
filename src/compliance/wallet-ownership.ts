/**
 * Proof that a self-hosted wallet belongs to the customer. Under the EU
 * Transfer of Funds Regulation a CASP must verify this for transfers above
 * EUR 1,000 to or from self-hosted wallets.
 *
 * The verification method is pluggable. OPEN QUESTION (see docs/DESIGN.md):
 * whether Midnight wallets can sign an arbitrary challenge with the shielded
 * coin key through the DApp Connector. Until confirmed, only the TEST-ONLY
 * `declared` method exists; `micro-transfer` (customer sends a small shielded
 * amount carrying the challenge to the CASP) is the planned production-like method.
 */
import { randomBytes32, toHex } from '../util/bytes.js';

export type OwnershipMethod = 'declared-test-only' | 'micro-transfer' | 'wallet-signature';

export interface WalletChallenge {
  challengeId: string;
  customerId: string;
  walletKey: Uint8Array;
  nonce: Uint8Array;
  method: OwnershipMethod;
  createdAt: number;
  expiresAt: number;
}

export interface OwnershipProof {
  challengeId: string;
  /** Method-specific evidence. `declared-test-only` expects { declared: true }. */
  evidence: Record<string, unknown>;
}

export interface WalletOwnershipVerifier {
  readonly method: OwnershipMethod;
  createChallenge(customerId: string, walletKey: Uint8Array, now: number): WalletChallenge;
  verify(challenge: WalletChallenge, proof: OwnershipProof, now: number): { verified: boolean; reason?: string };
}

/** TEST ONLY: accepts the customer's declaration. Records the method so audits show it. */
export class DeclaredWalletOwnership implements WalletOwnershipVerifier {
  readonly method = 'declared-test-only' as const;

  createChallenge(customerId: string, walletKey: Uint8Array, now: number): WalletChallenge {
    const nonce = randomBytes32();
    return { challengeId: toHex(nonce).slice(0, 32), customerId, walletKey, nonce, method: this.method, createdAt: now, expiresAt: now + 3600 };
  }

  verify(challenge: WalletChallenge, proof: OwnershipProof, now: number) {
    if (proof.challengeId !== challenge.challengeId) return { verified: false, reason: 'challenge mismatch' };
    if (now > challenge.expiresAt) return { verified: false, reason: 'challenge expired' };
    if (proof.evidence?.declared !== true) return { verified: false, reason: 'missing declaration' };
    return { verified: true };
  }
}
