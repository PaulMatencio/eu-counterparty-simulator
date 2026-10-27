/**
 * Unit & Integration Tests for Domain, Application Use-Cases, and Infrastructure Adapters.
 * Exercises the real CaspSimulator + KycHarnessCircuitAdapter + CaspCryptoAdapter through
 * the Clean Architecture ports.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { CaspSimulator } from '@casp-core/casp/casp-simulator.js';
import { PERSONAS } from '@casp-core/compliance/personas.js';
import { loadPolicy, loadSanctions } from '@casp-core/config.js';
import { MemoryKeyStore } from '@casp-core/keys/key-store.js';
import { ManualClock, DAY, YEAR } from '@casp-core/util/clock.js';
import {
  DiscloseAndVerifyTravelRuleUseCase,
  IssueAttestationUseCase,
  OfficerComplianceUseCase,
  OnboardCustomerUseCase,
  QuickOnboardPersonaUseCase,
  RequestGdprErasureUseCase,
  VerifyWalletOwnershipUseCase,
  type ICaspGateway,
} from '@/application';
import {
  CaspCryptoAdapter,
  KycHarnessCircuitAdapter,
  MemoryStorageAdapter,
  MidnightWalletAdapter,
} from '@/infrastructure';

const CONFIG_DIR = join(__dirname, '../../../config');

function createInProcessGateway(): { gateway: ICaspGateway; clock: ManualClock } {
  const clock = new ManualClock(1_800_000_000);
  const casp = new CaspSimulator({
    policy: loadPolicy(join(CONFIG_DIR, 'policy.json')),
    sanctions: loadSanctions(join(CONFIG_DIR, 'sanctions-sample.json')),
    keyStore: new MemoryKeyStore(0x1234567890abcdefn, 1_800_000_000),
    clock,
  });

  const gateway: ICaspGateway = {
    getHealth: async () => ({
      ok: true,
      casp: casp.policy.caspName,
      testOnly: true,
      currentTimestamp: clock.now(),
    }),
    getWellKnownKeys: async () => ({
      casp: casp.policy.caspName,
      keys: casp.publicKeys() as any,
    }),
    listPersonas: async () => Object.values(PERSONAS) as any,
    onboardCustomer: async (profile) => casp.onboard(profile as any),
    createWalletChallenge: async (customerId, walletKey) =>
      casp.createWalletChallenge(customerId, walletKey),
    submitWalletProof: async (customerId, proof) =>
      casp.submitWalletProof(customerId, proof),
    issueAttestation: async (req) => casp.issueAttestation(req),
    requestErasure: async (customerId) => casp.requestErasure(customerId),
    onboardPersonaOneShot: async (name, params) => {
      const p = PERSONAS[name];
      const { customerId, assessment } = casp.onboard(p.profile, 'test-harness');
      const ch = casp.createWalletChallenge(customerId, params.walletKey);
      casp.submitWalletProof(
        customerId,
        { challengeId: ch.challengeId, evidence: { declared: true } },
        'test-harness',
      );
      if (assessment.decision !== 'approve') {
        return { customerId, assessment, bundle: null };
      }
      const bundle = casp.issueAttestation(
        {
          customerId,
          subject: params.subject,
          walletKey: params.walletKey,
          role: params.role ?? 'originator',
          validityDays: params.validityDays,
        },
        'test-harness',
      );
      return { customerId, assessment, bundle };
    },
    getCustomer: async (id) => casp.getCustomer(id) as any,
    updateCustomerProfile: async (id, patch) => casp.updateProfile(id, patch as any),
    getAttestationStatus: async (ref) => casp.getAttestation(ref) as any,
    revokeAttestation: async (ref, reason) => casp.revokeAttestation(ref, reason),
    rotateIssuerKey: async () => casp.rotateKey(),
    revokeIssuerKey: async (issuerId, reason) => casp.revokeIssuerKey(issuerId, reason),
    discloseTravelRule: async (ref) => casp.discloseTravelRule(ref, 'notary') as any,
    getAuditLog: async () => [...casp.audit.all()],
    verifyAuditLog: async () => ({
      ...casp.audit.verify(),
      head: casp.audit.head(),
    }),
    advanceClock: async (sec) => {
      clock.advance(sec);
      return { currentTimestamp: clock.now() };
    },
  };

  return { gateway, clock };
}

describe('Application Use-Cases & Infrastructure Adapters', () => {
  const WALLET_HEX = '65'.repeat(32);
  const SUBJECT_HEX = '11'.repeat(32);

  it('executes QuickOnboardPersonaUseCase, verifies KycAttestationV1 in-circuit, and verifies IVMS101 Travel Rule SHA-256 commitment', async () => {
    const { gateway } = createInProcessGateway();
    const storage = new MemoryStorageAdapter();
    const circuitVerifier = new KycHarnessCircuitAdapter();
    const cryptoAdapter = new CaspCryptoAdapter();

    const quickOnboard = new QuickOnboardPersonaUseCase(
      gateway,
      circuitVerifier,
      cryptoAdapter,
      storage,
    );
    const travelRuleUseCase = new DiscloseAndVerifyTravelRuleUseCase(
      gateway,
      cryptoAdapter,
      storage,
    );

    const res = await quickOnboard.execute({
      personaName: 'buyer-clean',
      subjectHex: SUBJECT_HEX,
      walletKeyHex: WALLET_HEX,
      role: 'originator',
    });

    expect(res.assessment.decision).toBe('approve');
    expect(res.assessment.kycLevel).toBe(2);
    expect(res.bundle).not.toBeNull();
    expect(res.circuitVerification?.verifiedInCircuit).toBe(true);
    expect(res.circuitVerification?.verifiedOffChain).toBe(true);
    expect(res.circuitVerification?.referenceMatches).toBe(true);
    expect(res.witnessExport?.typescriptSnippet).toContain('bundleToWitness');

    const tr = await travelRuleUseCase.execute(res.bundle!.reference);
    expect(tr.commitmentVerified).toBe(true);
    expect(tr.recomputedCommitmentHex).toBe(res.bundle!.attestation.travelRuleRef);
    expect(tr.record.role).toBe('originator');
  });

  it('handles PEP referral -> Officer EDD completion -> Level 3 Attestation -> Revocation in-circuit check', async () => {
    const { gateway } = createInProcessGateway();
    const storage = new MemoryStorageAdapter();
    const circuitVerifier = new KycHarnessCircuitAdapter();
    const cryptoAdapter = new CaspCryptoAdapter();

    const onboardUseCase = new OnboardCustomerUseCase(gateway, storage);
    const walletUseCase = new VerifyWalletOwnershipUseCase(gateway);
    const issueUseCase = new IssueAttestationUseCase(
      gateway,
      circuitVerifier,
      cryptoAdapter,
      storage,
    );
    const officerUseCase = new OfficerComplianceUseCase(
      gateway,
      circuitVerifier,
      storage,
    );

    // 1. Onboard PEP without EDD -> referred
    const { customerId, assessment } = await onboardUseCase.execute(
      PERSONAS['buyer-pep-no-edd'].profile as any,
    );
    expect(assessment.decision).toBe('refer');

    // 2. Verify wallet ownership
    const ch = await walletUseCase.createChallenge(customerId, WALLET_HEX);
    const proofRes = await walletUseCase.submitProof(customerId, ch.challengeId);
    expect(proofRes.verified).toBe(true);

    // 3. Officer approves EDD -> approved at Level 3
    const updatedAssessment = await officerUseCase.completeEddAndReassess(customerId, {
      eddCompleted: true,
    });
    expect(updatedAssessment.decision).toBe('approve');
    expect(updatedAssessment.kycLevel).toBe(3);

    // 4. Issue attestation & verify in circuit
    const issued = await issueUseCase.execute({
      customerId,
      subjectHex: SUBJECT_HEX,
      walletKeyHex: WALLET_HEX,
      role: 'originator',
    });
    expect(issued.bundle.attestation.kycLevel).toBe(3);
    expect(issued.circuitVerification.verifiedInCircuit).toBe(true);

    // 5. Revoke attestation & verify kycRevocationMessage in-circuit
    const rev = await officerUseCase.revokeAttestation(
      issued.bundle.reference,
      'adverse media test',
      issued.bundle.issuerPublicKey,
    );
    expect(rev.revocation.kind).toBe('attestation');
    expect(rev.verifiedInCircuit).toBe(true);

    // 6. Verify tamper-evident audit chain
    const audit = await officerUseCase.inspectAuditChain();
    expect(audit.verification.valid).toBe(true);
    expect(audit.entries.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces GDPR erasure restriction during 5-year AML retention and purges after clock advance', async () => {
    const { gateway, clock } = createInProcessGateway();
    const storage = new MemoryStorageAdapter();
    const onboardUseCase = new OnboardCustomerUseCase(gateway, storage);
    const erasureUseCase = new RequestGdprErasureUseCase(gateway);

    const { customerId } = await onboardUseCase.execute(
      PERSONAS['buyer-clean'].profile as any,
    );

    const restricted = await erasureUseCase.execute(customerId);
    expect(restricted.status).toBe('restricted');

    clock.advance(5 * YEAR + DAY);
    const erased = await erasureUseCase.execute(customerId);
    expect(erased.status).toBe('erased');
  });

  it('connects to both Simulated Wallet and mocked Lace DApp Connector v4 (window.midnight)', async () => {
    const walletAdapter = new MidnightWalletAdapter();

    // Simulated mode
    const sim = await walletAdapter.connect({
      mode: 'simulated',
      simulatedWalletKeyHex: WALLET_HEX,
      simulatedSubjectRoleIdHex: SUBJECT_HEX,
    });
    expect(sim.mode).toBe('simulated');
    expect(sim.shieldedCoinPublicKeyHex).toBe(WALLET_HEX);

    // Mocked Lace DApp Connector v4 in window.midnight
    (window as any).midnight = {
      'uuid-lace': {
        name: 'Lace Midnight Preview',
        apiVersion: '4.0.1',
        rdns: 'io.lace.midnight',
        connect: async (networkId: string) => ({
          getConfiguration: async () => ({
            indexerUri: 'http://127.0.0.1:8088/api/v4/graphql',
            indexerWsUri: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
            substrateNodeUri: 'http://127.0.0.1:9944',
            networkId,
          }),
          getShieldedAddresses: async () => ({
            shieldedAddress: 'mn_shield-addr_preprod1test',
            shieldedCoinPublicKey: 'aa'.repeat(32),
            shieldedEncryptionPublicKey: 'bb'.repeat(32),
          }),
          getUnshieldedAddress: async () => ({
            unshieldedAddress: 'mn_addr_preprod1test',
          }),
        }),
      },
    };

    const detected = await walletAdapter.detectInjectedWallets();
    expect(detected).toHaveLength(1);
    expect(detected[0].rdns).toBe('io.lace.midnight');

    const connectedLace = await walletAdapter.connect({
      mode: 'lace',
      networkId: 'preprod',
    });
    expect(connectedLace.mode).toBe('lace');
    expect(connectedLace.shieldedCoinPublicKeyHex).toBe('aa'.repeat(32));

    delete (window as any).midnight;
  });
});
