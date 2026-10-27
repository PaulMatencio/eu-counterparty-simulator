/**
 * Application Use-Cases — Compliance Officer, Notary Travel Rule Disclosure & Audit Verification.
 * Depends ONLY on `src/domain` and `src/application/ports`.
 */
import {
  DomainError,
  type AuditEntry,
  type AuditVerificationResult,
  type CustomerProfile,
  type CustomerRecord,
  type IssuerKeySummary,
  type RevocationBundle,
  type RiskAssessment,
  type VerifiedTravelRuleDisclosure,
  type WirePoint,
} from '@/domain';
import type { ICaspGateway } from '../ports/casp-gateway.port.js';
import type { ICircuitVerifierPort, ICryptoPort } from '../ports/circuit-verifier.port.js';
import type { IStoragePort } from '../ports/storage.port.js';

export class OfficerComplianceUseCase {
  constructor(
    private readonly caspGateway: ICaspGateway,
    private readonly circuitVerifier: ICircuitVerifierPort,
    private readonly storage: IStoragePort,
  ) {}

  async inspectCustomer(customerId: string, officerToken?: string): Promise<CustomerRecord> {
    if (!customerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID is required');
    }
    const token = officerToken ?? this.storage.loadSession().officerToken;
    return this.caspGateway.getCustomer(customerId.trim(), token);
  }

  async completeEddAndReassess(
    customerId: string,
    patch: Partial<CustomerProfile> = { eddCompleted: true },
    officerToken?: string,
  ): Promise<RiskAssessment> {
    if (!customerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID is required');
    }
    const token = officerToken ?? this.storage.loadSession().officerToken;
    return this.caspGateway.updateCustomerProfile(customerId.trim(), patch, token);
  }

  async revokeAttestation(
    reference: string,
    reason: string,
    issuerPublicKey?: WirePoint,
    officerToken?: string,
  ): Promise<{
    revocation: RevocationBundle;
    verifiedInCircuit: boolean | null;
  }> {
    if (!reference.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Attestation reference is required');
    }
    const token = officerToken ?? this.storage.loadSession().officerToken;
    const revocation = await this.caspGateway.revokeAttestation(
      reference.trim(),
      reason.trim() || 'revoked by compliance officer',
      token,
    );

    const session = this.storage.loadSession();
    this.storage.saveSession({
      revocationBundles: [revocation, ...session.revocationBundles],
    });

    let verifiedInCircuit: boolean | null = null;
    if (issuerPublicKey) {
      const check = await this.circuitVerifier.verifyRevocationBundle(revocation, issuerPublicKey);
      verifiedInCircuit = check.verifiedInCircuit;
    }

    return { revocation, verifiedInCircuit };
  }

  async rotateIssuerKey(
    officerToken?: string,
  ): Promise<{ issuerId: string; publicKey: WirePoint; allKeys: IssuerKeySummary[] }> {
    const token = officerToken ?? this.storage.loadSession().officerToken;
    const rotated = await this.caspGateway.rotateIssuerKey(token);
    const wellKnown = await this.caspGateway.getWellKnownKeys();
    return { ...rotated, allKeys: wellKnown.keys };
  }

  async revokeIssuerKey(
    issuerId: string,
    reason: string,
    publicKey?: WirePoint,
    officerToken?: string,
  ): Promise<{
    revocation: RevocationBundle;
    verifiedInCircuit: boolean | null;
    allKeys: IssuerKeySummary[];
  }> {
    if (!issuerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Issuer ID is required');
    }
    const token = officerToken ?? this.storage.loadSession().officerToken;
    const revocation = await this.caspGateway.revokeIssuerKey(
      issuerId.trim(),
      reason.trim() || 'key compromise drill',
      token,
    );

    const session = this.storage.loadSession();
    this.storage.saveSession({
      revocationBundles: [revocation, ...session.revocationBundles],
    });

    let verifiedInCircuit: boolean | null = null;
    if (publicKey) {
      const check = await this.circuitVerifier.verifyRevocationBundle(revocation, publicKey);
      verifiedInCircuit = check.verifiedInCircuit;
    }

    const wellKnown = await this.caspGateway.getWellKnownKeys();
    return { revocation, verifiedInCircuit, allKeys: wellKnown.keys };
  }

  async inspectAuditChain(
    officerToken?: string,
  ): Promise<{ entries: AuditEntry[]; verification: AuditVerificationResult }> {
    const token = officerToken ?? this.storage.loadSession().officerToken;
    const [entries, verification] = await Promise.all([
      this.caspGateway.getAuditLog(token),
      this.caspGateway.verifyAuditLog(token),
    ]);
    return { entries, verification };
  }
}

export class DiscloseAndVerifyTravelRuleUseCase {
  constructor(
    private readonly caspGateway: ICaspGateway,
    private readonly cryptoPort: ICryptoPort,
    private readonly storage: IStoragePort,
  ) {}

  async execute(
    reference: string,
    expectedTravelRuleRefHex?: string,
    authToken?: string,
  ): Promise<VerifiedTravelRuleDisclosure> {
    if (!reference.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Attestation reference is required');
    }
    const session = this.storage.loadSession();
    const token = authToken ?? (session.notaryToken || session.officerToken);
    const disclosure = await this.caspGateway.discloseTravelRule(reference.trim(), token);

    const recomputedCommitmentHex = this.cryptoPort.computeTravelRuleCommitmentHex(
      disclosure.record,
      disclosure.salt,
    );

    const matchedBundle = session.issuedBundles.find((b) => b.reference === reference.trim());
    const expectedHex =
      expectedTravelRuleRefHex?.trim().toLowerCase() ??
      matchedBundle?.attestation.travelRuleRef.toLowerCase();

    const commitmentVerified = expectedHex
      ? this.cryptoPort.verifyTravelRuleCommitment(disclosure.record, disclosure.salt, expectedHex)
      : true;

    return {
      ...disclosure,
      recomputedCommitmentHex,
      expectedCommitmentHex: expectedHex,
      commitmentVerified,
    };
  }
}
