/**
 * Application Layer — Outbound Port for the CASP Simulator Backend.
 * Depends ONLY on `src/domain`.
 */
import type {
  AttestationBundle,
  AttestationStatusRecord,
  AuditEntry,
  AuditVerificationResult,
  CaspHealthStatus,
  CustomerProfile,
  CustomerRecord,
  ErasureOutcome,
  IssuerKeySummary,
  OwnershipProof,
  OwnershipVerificationResult,
  Persona,
  RevocationBundle,
  RiskAssessment,
  TravelRuleDisclosure,
  TravelRuleRole,
  WalletChallenge,
  WirePoint,
} from '@/domain';

export interface OnboardCustomerResult {
  customerId: string;
  assessment: RiskAssessment;
}

export interface OneShotPersonaResult {
  customerId: string;
  assessment: RiskAssessment;
  bundle: AttestationBundle | null;
}

export interface IssueAttestationRequest {
  customerId: string;
  subject: string;
  walletKey: string;
  role: TravelRuleRole;
  validityDays?: number;
}

export interface ICaspGateway {
  /** Health and active CASP policy summary. */
  getHealth(): Promise<CaspHealthStatus>;

  /** Public issuer keys (for addKycIssuer on relying contracts). */
  getWellKnownKeys(): Promise<{ casp: string; keys: IssuerKeySummary[] }>;

  /** Fixture personas for simulation. */
  listPersonas(): Promise<Persona[]>;

  /** Customer onboarding (CDD/EDD risk assessment + sanctions screening). */
  onboardCustomer(profile: CustomerProfile): Promise<OnboardCustomerResult>;

  /** Self-hosted wallet ownership challenge. */
  createWalletChallenge(customerId: string, walletKey: string): Promise<WalletChallenge>;

  /** Submit ownership proof for a wallet challenge. */
  submitWalletProof(
    customerId: string,
    proof: OwnershipProof,
  ): Promise<OwnershipVerificationResult>;

  /** Issue a signed KycAttestationV1 bundle. */
  issueAttestation(req: IssueAttestationRequest): Promise<AttestationBundle>;

  /** GDPR Art. 17 erasure request (restricted during 5-year AML retention, purged after). */
  requestErasure(customerId: string): Promise<ErasureOutcome>;

  /** One-shot fixture persona onboarding + wallet proof + attestation. */
  onboardPersonaOneShot(
    personaName: string,
    params: { subject: string; walletKey: string; role?: TravelRuleRole; validityDays?: number },
  ): Promise<OneShotPersonaResult>;

  /** Officer-only: inspect a customer record. */
  getCustomer(customerId: string, officerToken?: string): Promise<CustomerRecord>;

  /** Officer-only: update profile & re-run due diligence (e.g. mark EDD completed). */
  updateCustomerProfile(
    customerId: string,
    patch: Partial<CustomerProfile>,
    officerToken?: string,
  ): Promise<RiskAssessment>;

  /** Officer/Notary: inspect attestation status (active, revoked, expired). */
  getAttestationStatus(
    reference: string,
    authToken?: string,
  ): Promise<AttestationStatusRecord>;

  /** Officer-only: revoke an attestation and return a signed kycRevocationMessage bundle. */
  revokeAttestation(
    reference: string,
    reason: string,
    officerToken?: string,
  ): Promise<RevocationBundle>;

  /** Officer-only: rotate the CASP active signing key. */
  rotateIssuerKey(
    officerToken?: string,
  ): Promise<{ issuerId: string; publicKey: WirePoint }>;

  /** Officer-only: sign a self-revocation message for an issuer key. */
  revokeIssuerKey(
    issuerId: string,
    reason: string,
    officerToken?: string,
  ): Promise<RevocationBundle>;

  /** Officer/Notary: disclose the off-chain IVMS101 Travel Rule record + salt. */
  discloseTravelRule(
    reference: string,
    authToken?: string,
  ): Promise<TravelRuleDisclosure>;

  /** Officer-only: fetch the tamper-evident hash-chained audit log. */
  getAuditLog(officerToken?: string): Promise<AuditEntry[]>;

  /** Officer-only: verify the integrity of the hash-chained audit log. */
  verifyAuditLog(officerToken?: string): Promise<AuditVerificationResult>;

  /** Test clock control (available in Embedded mode to advance simulated time). */
  advanceClock?(seconds: number): Promise<{ currentTimestamp: number }>;
}
