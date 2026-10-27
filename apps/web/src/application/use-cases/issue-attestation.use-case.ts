/**
 * Application Use-Case — Issue KycAttestationV1 Bundle & Verify In-Circuit.
 * Depends ONLY on `src/domain` and `src/application/ports`.
 */
import {
  DomainError,
  isValidHex32,
  normalizeHex32,
  type AttestationBundle,
  type CircuitVerificationSummary,
  type TravelRuleRole,
} from '@/domain';
import type { ICaspGateway } from '../ports/casp-gateway.port.js';
import type { ICircuitVerifierPort, ICryptoPort, WitnessCodeExport } from '../ports/circuit-verifier.port.js';
import type { IStoragePort } from '../ports/storage.port.js';

export interface IssueAttestationResult {
  bundle: AttestationBundle;
  circuitVerification: CircuitVerificationSummary;
  witnessExport: WitnessCodeExport;
}

export class IssueAttestationUseCase {
  constructor(
    private readonly caspGateway: ICaspGateway,
    private readonly circuitVerifier: ICircuitVerifierPort,
    private readonly cryptoPort: ICryptoPort,
    private readonly storage: IStoragePort,
  ) {}

  async execute(params: {
    customerId: string;
    subjectHex: string;
    walletKeyHex: string;
    role: TravelRuleRole;
    validityDays?: number;
  }): Promise<IssueAttestationResult> {
    if (!params.customerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID is required');
    }
    if (!isValidHex32(params.subjectHex)) {
      throw new DomainError('VALIDATION_ERROR', 'Subject roleId must be 32-byte hex (64 chars)');
    }
    if (!isValidHex32(params.walletKeyHex)) {
      throw new DomainError('VALIDATION_ERROR', 'Wallet key must be 32-byte hex (64 chars)');
    }

    const bundle = await this.caspGateway.issueAttestation({
      customerId: params.customerId.trim(),
      subject: normalizeHex32(params.subjectHex),
      walletKey: normalizeHex32(params.walletKeyHex),
      role: params.role,
      validityDays: params.validityDays,
    });

    const circuitVerification = await this.circuitVerifier.verifyAttestationBundle(bundle);
    const witnessExport = this.cryptoPort.exportBundleToWitness(bundle);

    const session = this.storage.loadSession();
    this.storage.saveSession({
      issuedBundles: [
        bundle,
        ...session.issuedBundles.filter((b) => b.reference !== bundle.reference),
      ],
    });

    return { bundle, circuitVerification, witnessExport };
  }
}
