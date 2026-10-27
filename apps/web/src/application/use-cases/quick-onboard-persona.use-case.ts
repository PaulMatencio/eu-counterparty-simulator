/**
 * Application Use-Case — Quick Persona Onboarding & Wallet Ownership Verification.
 * Depends ONLY on `src/domain` and `src/application/ports`.
 */
import {
  DomainError,
  isValidHex32,
  normalizeHex32,
  type AttestationBundle,
  type CircuitVerificationSummary,
  type OwnershipVerificationResult,
  type RiskAssessment,
  type TravelRuleRole,
  type WalletChallenge,
} from '@/domain';
import type { ICaspGateway } from '../ports/casp-gateway.port.js';
import type { ICircuitVerifierPort, ICryptoPort, WitnessCodeExport } from '../ports/circuit-verifier.port.js';
import type { IStoragePort } from '../ports/storage.port.js';

export interface QuickPersonaExecutionResult {
  customerId: string;
  assessment: RiskAssessment;
  bundle: AttestationBundle | null;
  circuitVerification: CircuitVerificationSummary | null;
  witnessExport: WitnessCodeExport | null;
}

export class QuickOnboardPersonaUseCase {
  constructor(
    private readonly caspGateway: ICaspGateway,
    private readonly circuitVerifier: ICircuitVerifierPort,
    private readonly cryptoPort: ICryptoPort,
    private readonly storage: IStoragePort,
  ) {}

  async execute(params: {
    personaName: string;
    subjectHex: string;
    walletKeyHex: string;
    role?: TravelRuleRole;
    validityDays?: number;
  }): Promise<QuickPersonaExecutionResult> {
    if (!isValidHex32(params.subjectHex)) {
      throw new DomainError('VALIDATION_ERROR', 'Subject roleId must be a 32-byte (64 hex chars) identifier');
    }
    if (!isValidHex32(params.walletKeyHex)) {
      throw new DomainError('VALIDATION_ERROR', 'Wallet key must be a 32-byte (64 hex chars) public key');
    }

    const res = await this.caspGateway.onboardPersonaOneShot(params.personaName, {
      subject: normalizeHex32(params.subjectHex),
      walletKey: normalizeHex32(params.walletKeyHex),
      role: params.role ?? 'originator',
      validityDays: params.validityDays,
    });

    const currentSession = this.storage.loadSession();
    const updatedBundles = res.bundle
      ? [res.bundle, ...currentSession.issuedBundles.filter((b) => b.reference !== res.bundle!.reference)]
      : currentSession.issuedBundles;

    this.storage.saveSession({
      activeCustomerId: res.customerId,
      issuedBundles: updatedBundles,
    });

    let circuitVerification: CircuitVerificationSummary | null = null;
    let witnessExport: WitnessCodeExport | null = null;

    if (res.bundle) {
      circuitVerification = await this.circuitVerifier.verifyAttestationBundle(res.bundle);
      witnessExport = this.cryptoPort.exportBundleToWitness(res.bundle);
    }

    return {
      customerId: res.customerId,
      assessment: res.assessment,
      bundle: res.bundle,
      circuitVerification,
      witnessExport,
    };
  }
}

export class VerifyWalletOwnershipUseCase {
  constructor(private readonly caspGateway: ICaspGateway) {}

  async createChallenge(customerId: string, walletKeyHex: string): Promise<WalletChallenge> {
    if (!customerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID is required');
    }
    if (!isValidHex32(walletKeyHex)) {
      throw new DomainError('VALIDATION_ERROR', 'Wallet key must be a 32-byte (64 hex chars) value');
    }
    return this.caspGateway.createWalletChallenge(customerId.trim(), normalizeHex32(walletKeyHex));
  }

  async submitProof(
    customerId: string,
    challengeId: string,
    evidence: Record<string, unknown> = { declared: true },
  ): Promise<OwnershipVerificationResult> {
    if (!customerId.trim() || !challengeId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID and Challenge ID are required');
    }
    return this.caspGateway.submitWalletProof(customerId.trim(), {
      challengeId: challengeId.trim(),
      evidence,
    });
  }
}
