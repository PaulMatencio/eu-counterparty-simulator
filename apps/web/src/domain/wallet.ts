/**
 * Domain Layer — Wallet Ownership & Connection Models.
 * Pure TypeScript, zero external dependencies.
 */

export type OwnershipMethod = 'declared-test-only' | 'micro-transfer' | 'wallet-signature';

export interface WalletChallenge {
  challengeId: string;
  method: OwnershipMethod;
  nonce: string;
  expiresAt: number;
}

export interface OwnershipProof {
  challengeId: string;
  evidence: Record<string, unknown>;
}

export interface OwnershipVerificationResult {
  verified: boolean;
  reason?: string;
}

export type WalletConnectionMode = 'simulated' | 'lace';

export interface ConnectedWalletInfo {
  mode: WalletConnectionMode;
  walletName: string;
  networkId: string;
  /** 32-byte hex representation of the shielded coin public key bound in KycAttestationV1. */
  shieldedCoinPublicKeyHex: string;
  /** Party role ID (roleIdOf(secret)), 32-byte hex. */
  subjectRoleIdHex: string;
  shieldedAddressBech32m?: string;
  unshieldedAddressBech32m?: string;
  indexerUri?: string;
  indexerWsUri?: string;
  substrateNodeUri?: string;
}
