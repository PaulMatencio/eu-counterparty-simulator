'use client';

/**
 * Presentation Layer — Custom React 19 Hooks driving Use-Cases.
 * Depends ONLY on `src/domain`, `src/application`, and `useAppDependencies`.
 */
import { useState, useCallback, useEffect } from 'react';
import type {
  AttestationBundle,
  AuditEntry,
  AuditVerificationResult,
  CaspHealthStatus,
  CircuitVerificationSummary,
  CustomerProfile,
  CustomerRecord,
  ErasureOutcome,
  IssuerKeySummary,
  Persona,
  RevocationBundle,
  RiskAssessment,
  TravelRuleRole,
  VerifiedTravelRuleDisclosure,
  WalletChallenge,
} from '@/domain';
import type { WitnessCodeExport } from '@/application';
import {
  useAppDependencies,
  WALLET_PRESETS,
} from '../providers/dependency-injection.provider.js';

export function useCaspOverview() {
  const { caspGateway } = useAppDependencies();
  const [health, setHealth] = useState<CaspHealthStatus | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [issuerKeys, setIssuerKeys] = useState<IssuerKeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, wk, p] = await Promise.all([
        caspGateway.getHealth(),
        caspGateway.getWellKnownKeys(),
        caspGateway.listPersonas().catch(() => []),
      ]);
      setHealth(h);
      setIssuerKeys(wk.keys);
      if (p.length > 0) setPersonas(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load CASP status');
    } finally {
      setLoading(false);
    }
  }, [caspGateway]);

  const advanceClock = useCallback(
    async (seconds: number) => {
      if (!caspGateway.advanceClock) return;
      try {
        const res = await caspGateway.advanceClock(seconds);
        setHealth((prev) =>
          prev ? { ...prev, currentTimestamp: res.currentTimestamp } : prev,
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Clock advance failed');
      }
    },
    [caspGateway],
  );

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  return {
    health,
    personas,
    issuerKeys,
    setIssuerKeys,
    loading,
    error,
    refreshOverview,
    advanceClock,
  };
}

export function useWalletContext() {
  const { wallet, setWallet, walletPort } = useAppDependencies();
  const [walletError, setWalletError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const selectPreset = useCallback(
    async (presetKey: keyof typeof WALLET_PRESETS) => {
      setWalletError(null);
      const preset = WALLET_PRESETS[presetKey];
      const info = await walletPort.connect({
        mode: 'simulated',
        simulatedLabel: preset.label,
        simulatedWalletKeyHex: preset.walletKeyHex,
        simulatedSubjectRoleIdHex: preset.subjectRoleIdHex,
      });
      setWallet(info);
    },
    [walletPort, setWallet],
  );

  const updateCustomHexKeys = useCallback(
    (walletKeyHex: string, subjectRoleIdHex: string) => {
      setWalletError(null);
      setWallet((prev) => ({
        ...prev,
        mode: 'simulated',
        shieldedCoinPublicKeyHex: walletKeyHex,
        subjectRoleIdHex,
      }));
    },
    [setWallet],
  );

  const connectLace = useCallback(
    async (networkId = 'preprod') => {
      setConnecting(true);
      setWalletError(null);
      try {
        const info = await walletPort.connect({
          mode: 'lace',
          networkId,
          simulatedSubjectRoleIdHex: wallet.subjectRoleIdHex,
        });
        setWallet(info);
      } catch (err: unknown) {
        setWalletError(err instanceof Error ? err.message : 'Lace connection failed');
      } finally {
        setConnecting(false);
      }
    },
    [walletPort, wallet.subjectRoleIdHex, setWallet],
  );

  return {
    wallet,
    walletError,
    connecting,
    selectPreset,
    updateCustomHexKeys,
    connectLace,
  };
}

export function useSimulatorWorkflow() {
  const {
    onboardCustomerUseCase,
    requestGdprErasureUseCase,
    quickOnboardPersonaUseCase,
    verifyWalletOwnershipUseCase,
    issueAttestationUseCase,
    officerComplianceUseCase,
    discloseAndVerifyTravelRuleUseCase,
    wallet,
    session,
    updateSession,
  } = useAppDependencies();

  const [activeCustomerId, setActiveCustomerId] = useState<string>(
    session.activeCustomerId ?? '',
  );
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [challenge, setChallenge] = useState<WalletChallenge | null>(null);
  const [walletVerified, setWalletVerified] = useState<boolean>(false);
  const [activeBundle, setActiveBundle] = useState<AttestationBundle | null>(null);
  const [circuitCheck, setCircuitCheck] =
    useState<CircuitVerificationSummary | null>(null);
  const [witnessExport, setWitnessExport] = useState<WitnessCodeExport | null>(null);
  const [erasureOutcome, setErasureOutcome] = useState<ErasureOutcome | null>(null);

  // Officer / Notary state
  const [inspectedCustomer, setInspectedCustomer] = useState<CustomerRecord | null>(
    null,
  );
  const [latestRevocation, setLatestRevocation] = useState<{
    bundle: RevocationBundle;
    verifiedInCircuit: boolean | null;
  } | null>(null);
  const [travelRuleResult, setTravelRuleResult] =
    useState<VerifiedTravelRuleDisclosure | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditVerification, setAuditVerification] =
    useState<AuditVerificationResult | null>(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const runPersonaOneShot = useCallback(
    async (personaName: string, role: TravelRuleRole = 'originator') => {
      setBusy(true);
      setActionError(null);
      setStatusBanner(null);
      setErasureOutcome(null);
      try {
        const res = await quickOnboardPersonaUseCase.execute({
          personaName,
          subjectHex: wallet.subjectRoleIdHex,
          walletKeyHex: wallet.shieldedCoinPublicKeyHex,
          role,
        });
        setActiveCustomerId(res.customerId);
        setAssessment(res.assessment);
        setWalletVerified(true);
        setActiveBundle(res.bundle);
        setCircuitCheck(res.circuitVerification);
        setWitnessExport(res.witnessExport);
        updateSession({ activeCustomerId: res.customerId });
        setStatusBanner(
          res.bundle
            ? `Persona "${personaName}" onboarded (${res.assessment.decision.toUpperCase()}, L${res.assessment.kycLevel}) & KycAttestationV1 verified in-circuit.`
            : `Persona "${personaName}" assessed as ${res.assessment.decision.toUpperCase()} (L${res.assessment.kycLevel}) — no attestation issued.`,
        );
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'One-shot persona failed');
      } finally {
        setBusy(false);
      }
    },
    [quickOnboardPersonaUseCase, wallet, updateSession],
  );

  const submitCustomOnboarding = useCallback(
    async (profile: CustomerProfile) => {
      setBusy(true);
      setActionError(null);
      setStatusBanner(null);
      setErasureOutcome(null);
      try {
        const res = await onboardCustomerUseCase.execute(profile);
        setActiveCustomerId(res.customerId);
        setAssessment(res.assessment);
        setChallenge(null);
        setWalletVerified(false);
        setActiveBundle(null);
        setCircuitCheck(null);
        updateSession({ activeCustomerId: res.customerId });
        setStatusBanner(
          `Customer ${res.customerId.slice(0, 10)}… onboarded: ${res.assessment.decision.toUpperCase()} (Level L${res.assessment.kycLevel}, Score ${res.assessment.amlRiskScore}).`,
        );
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Onboarding failed');
      } finally {
        setBusy(false);
      }
    },
    [onboardCustomerUseCase, updateSession],
  );

  const createOwnershipChallenge = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const ch = await verifyWalletOwnershipUseCase.createChallenge(
        activeCustomerId,
        wallet.shieldedCoinPublicKeyHex,
      );
      setChallenge(ch);
      setStatusBanner(`Wallet challenge ${ch.challengeId.slice(0, 12)}… issued.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Challenge creation failed');
    } finally {
      setBusy(false);
    }
  }, [verifyWalletOwnershipUseCase, activeCustomerId, wallet.shieldedCoinPublicKeyHex]);

  const submitOwnershipProof = useCallback(async () => {
    if (!challenge) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await verifyWalletOwnershipUseCase.submitProof(
        activeCustomerId,
        challenge.challengeId,
        { declared: true },
      );
      setWalletVerified(res.verified);
      setStatusBanner(
        res.verified
          ? 'Self-hosted wallet ownership verified.'
          : `Wallet verification failed: ${res.reason ?? 'unknown'}`,
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Proof submission failed');
    } finally {
      setBusy(false);
    }
  }, [verifyWalletOwnershipUseCase, activeCustomerId, challenge]);

  const issueKycAttestation = useCallback(
    async (role: TravelRuleRole, validityDays = 7) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await issueAttestationUseCase.execute({
          customerId: activeCustomerId,
          subjectHex: wallet.subjectRoleIdHex,
          walletKeyHex: wallet.shieldedCoinPublicKeyHex,
          role,
          validityDays,
        });
        setActiveBundle(res.bundle);
        setCircuitCheck(res.circuitVerification);
        setWitnessExport(res.witnessExport);
        setStatusBanner(
          `Signed KycAttestationV1 issued (ref ${res.bundle.reference.slice(0, 12)}…) and verified in Compact circuit.`,
        );
      } catch (err: unknown) {
        setActionError(
          err instanceof Error ? err.message : 'Attestation issuance failed',
        );
      } finally {
        setBusy(false);
      }
    },
    [issueAttestationUseCase, activeCustomerId, wallet],
  );

  const triggerGdprErasure = useCallback(
    async (targetCustomerId?: string) => {
      const id = targetCustomerId || activeCustomerId;
      setBusy(true);
      setActionError(null);
      try {
        const outcome = await requestGdprErasureUseCase.execute(id);
        setErasureOutcome(outcome);
        setStatusBanner(
          `GDPR Art. 17 erasure outcome for ${id.slice(0, 10)}…: ${outcome.status.toUpperCase()}.`,
        );
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Erasure request failed');
      } finally {
        setBusy(false);
      }
    },
    [requestGdprErasureUseCase, activeCustomerId],
  );

  const inspectCustomerAsOfficer = useCallback(
    async (targetCustomerId?: string) => {
      const id = targetCustomerId || activeCustomerId;
      setBusy(true);
      setActionError(null);
      try {
        const rec = await officerComplianceUseCase.inspectCustomer(id);
        setInspectedCustomer(rec);
        setAssessment(rec.assessment);
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Customer inspection failed');
      } finally {
        setBusy(false);
      }
    },
    [officerComplianceUseCase, activeCustomerId],
  );

  const approveEddAsOfficer = useCallback(
    async (targetCustomerId?: string) => {
      const id = targetCustomerId || activeCustomerId;
      setBusy(true);
      setActionError(null);
      try {
        const updated = await officerComplianceUseCase.completeEddAndReassess(id, {
          eddCompleted: true,
        });
        setAssessment(updated);
        const rec = await officerComplianceUseCase.inspectCustomer(id);
        setInspectedCustomer(rec);
        setStatusBanner(
          `EDD approved for customer ${id.slice(0, 10)}…: Decision is now ${updated.decision.toUpperCase()} (Level L${updated.kycLevel}).`,
        );
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'EDD reassessment failed');
      } finally {
        setBusy(false);
      }
    },
    [officerComplianceUseCase, activeCustomerId],
  );

  const revokeAttestationAsOfficer = useCallback(
    async (reference: string, reason: string) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await officerComplianceUseCase.revokeAttestation(
          reference,
          reason,
          activeBundle?.issuerPublicKey,
        );
        setLatestRevocation({
          bundle: res.revocation,
          verifiedInCircuit: res.verifiedInCircuit,
        });
        setStatusBanner(
          `Attestation ${reference.slice(0, 12)}… revoked and signed revocation verified in-circuit.`,
        );
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Revocation failed');
      } finally {
        setBusy(false);
      }
    },
    [officerComplianceUseCase, activeBundle],
  );

  const discloseTravelRuleRecord = useCallback(
    async (reference: string) => {
      setBusy(true);
      setActionError(null);
      try {
        const expected =
          activeBundle?.reference === reference
            ? activeBundle.attestation.travelRuleRef
            : undefined;
        const res = await discloseAndVerifyTravelRuleUseCase.execute(
          reference,
          expected,
        );
        setTravelRuleResult(res);
        setStatusBanner(
          `Travel Rule IVMS101 record disclosed & SHA-256 commitment verified: ${res.commitmentVerified}.`,
        );
      } catch (err: unknown) {
        setActionError(
          err instanceof Error ? err.message : 'Travel Rule disclosure failed',
        );
      } finally {
        setBusy(false);
      }
    },
    [discloseAndVerifyTravelRuleUseCase, activeBundle],
  );

  const refreshAuditChain = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await officerComplianceUseCase.inspectAuditChain();
      setAuditEntries(res.entries);
      setAuditVerification(res.verification);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Audit chain fetch failed');
    } finally {
      setBusy(false);
    }
  }, [officerComplianceUseCase]);

  return {
    activeCustomerId,
    setActiveCustomerId,
    assessment,
    challenge,
    walletVerified,
    activeBundle,
    circuitCheck,
    witnessExport,
    erasureOutcome,
    inspectedCustomer,
    latestRevocation,
    setLatestRevocation,
    travelRuleResult,
    auditEntries,
    auditVerification,
    busy,
    actionError,
    statusBanner,
    runPersonaOneShot,
    submitCustomOnboarding,
    createOwnershipChallenge,
    submitOwnershipProof,
    issueKycAttestation,
    triggerGdprErasure,
    inspectCustomerAsOfficer,
    approveEddAsOfficer,
    revokeAttestationAsOfficer,
    discloseTravelRuleRecord,
    refreshAuditChain,
  };
}
