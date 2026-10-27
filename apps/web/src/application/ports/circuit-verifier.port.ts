/**
 * Application Layer — Outbound Port for Compact In-Circuit & Cryptographic Verification.
 * Depends ONLY on `src/domain`.
 */
import type {
  AttestationBundle,
  CircuitVerificationSummary,
  Ivms101Record,
  RevocationBundle,
  WirePoint,
} from '@/domain';

export interface WitnessCodeExport {
  /** Ready-to-paste TypeScript snippet for relying contract tests. */
  typescriptSnippet: string;
  /** JSON representation of [KycAttestation, SchnorrSignature, issuerId]. */
  witnessTupleJson: string;
}

export interface ICircuitVerifierPort {
  /**
   * Executes `checkAttestation` inside the compiled `kyc-harness.compact`
   * circuit via `@midnight-ntwrk/compact-runtime` to prove in zero knowledge
   * that the Schnorr signature over Jubjub is valid.
   */
  verifyAttestationBundle(bundle: AttestationBundle): Promise<CircuitVerificationSummary>;

  /**
   * Executes `checkMessage` inside `kyc-harness.compact` to verify a signed
   * `kycRevocationMessage` or `issuerRevocationMessage`.
   */
  verifyRevocationBundle(
    revocation: RevocationBundle,
    issuerPublicKey: WirePoint,
  ): Promise<{ verifiedInCircuit: boolean; verifiedOffChain: boolean }>;
}

export interface ICryptoPort {
  /** Recomputes `sha256("re-escrow:travel-rule:v1" || canonicalJson(record) || salt)` in hex. */
  computeTravelRuleCommitmentHex(record: Ivms101Record, saltHex: string): string;

  /** Verifies that an IVMS101 record + salt match an on-chain `travelRuleRef` hex. */
  verifyTravelRuleCommitment(
    record: Ivms101Record,
    saltHex: string,
    expectedRefHex: string,
  ): boolean;

  /** Formats an `AttestationBundle` into a relying contract's `kycAttestation` witness export. */
  exportBundleToWitness(bundle: AttestationBundle): WitnessCodeExport;
}
