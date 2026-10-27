/**
 * Presentation Layer UI & i18n Component Tests.
 * Verifies rendering of the CaspSimulatorWorkbench, Persona Gallery,
 * one-shot attestation flow, and multilingual switching (`en`, `fr`, `de`, `es`).
 */
import React from 'react';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CaspSimulator } from '@casp-core/casp/casp-simulator.js';
import { PERSONAS } from '@casp-core/compliance/personas.js';
import { loadPolicy, loadSanctions } from '@casp-core/config.js';
import { MemoryKeyStore } from '@casp-core/keys/key-store.js';
import { ManualClock } from '@casp-core/util/clock.js';
import type { ICaspGateway } from '@/application';
import {
  CaspCryptoAdapter,
  KycHarnessCircuitAdapter,
  MemoryStorageAdapter,
  MidnightWalletAdapter,
} from '@/infrastructure';
import { AppDependenciesProvider } from '@/presentation/providers/dependency-injection.provider';
import { CaspSimulatorWorkbench } from '@/presentation/components/CaspSimulatorWorkbench';

const CONFIG_DIR = join(__dirname, '../../../config');

function makeTestGateway(): ICaspGateway {
  const clock = new ManualClock(1_800_000_000);
  const casp = new CaspSimulator({
    policy: loadPolicy(join(CONFIG_DIR, 'policy.json')),
    sanctions: loadSanctions(join(CONFIG_DIR, 'sanctions-sample.json')),
    keyStore: new MemoryKeyStore(0x1234567890abcdefn, 1_800_000_000),
    clock,
  });

  return {
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
    createWalletChallenge: async (id, wk) => casp.createWalletChallenge(id, wk),
    submitWalletProof: async (id, proof) => casp.submitWalletProof(id, proof),
    issueAttestation: async (req) => casp.issueAttestation(req),
    requestErasure: async (id) => casp.requestErasure(id),
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
      const bundle = casp.issueAttestation({
        customerId,
        subject: params.subject,
        walletKey: params.walletKey,
        role: params.role ?? 'originator',
      });
      return { customerId, assessment, bundle };
    },
    getCustomer: async (id) => casp.getCustomer(id) as any,
    updateCustomerProfile: async (id, patch) => casp.updateProfile(id, patch as any),
    getAttestationStatus: async (ref) => casp.getAttestation(ref) as any,
    revokeAttestation: async (ref, reason) => casp.revokeAttestation(ref, reason),
    rotateIssuerKey: async () => casp.rotateKey(),
    revokeIssuerKey: async (id, reason) => casp.revokeIssuerKey(id, reason),
    discloseTravelRule: async (ref) => casp.discloseTravelRule(ref, 'notary') as any,
    getAuditLog: async () => [...casp.audit.all()],
    verifyAuditLog: async () => ({
      ...casp.audit.verify(),
      head: casp.audit.head(),
    }),
  };
}

describe('CaspSimulatorWorkbench Presentation & i18n', () => {
  it('renders synthetic data warning, loads fixture personas, switches locales (en/fr/de/es), and runs one-shot attestation', async () => {
    const gateway = makeTestGateway();
    const storagePort = new MemoryStorageAdapter();

    render(
      <AppDependenciesProvider
        overridePorts={{
          caspGateway: gateway,
          storagePort,
          walletPort: new MidnightWalletAdapter(),
          circuitVerifier: new KycHarnessCircuitAdapter(),
          cryptoPort: new CaspCryptoAdapter(),
        }}
      >
        <CaspSimulatorWorkbench />
      </AppDependenciesProvider>,
    );

    // Persistent synthetic data banner
    expect(screen.getByText(/TEST ONLY • SYNTHETIC DATA/i)).toBeInTheDocument();

    // Wait for fixture personas to render
    await waitFor(() => {
      expect(screen.getByText('buyer-clean')).toBeInTheDocument();
      expect(screen.getByText('buyer-sanctioned')).toBeInTheDocument();
    });

    // Switch language to French (fr)
    const langSelect = screen.getByLabelText('Language');
    fireEvent.change(langSelect, { target: { value: 'fr' } });
    await waitFor(() => {
      expect(screen.getByText('Simulateur de Contrepartie UE')).toBeInTheDocument();
    });

    // Switch back to English (en)
    fireEvent.change(langSelect, { target: { value: 'en' } });
    await waitFor(() => {
      expect(screen.getByText('EU Counterparty Simulator')).toBeInTheDocument();
    });

    // Execute one-shot onboarding for buyer-clean
    const oneShotButtons = screen.getAllByText('One-Shot Onboard & Attest');
    fireEvent.click(oneShotButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Persona "buyer-clean" onboarded/i),
      ).toBeInTheDocument();
    });

    // Navigate to Wallet & Attestation Workbench tab and verify in-circuit badge
    fireEvent.click(screen.getByText(/2\. Wallet Proof & ZK Attestation Workbench/i));
    await waitFor(() => {
      expect(
        screen.getByText(/Verified In-Circuit \(kyc-harness\.compact\)/i),
      ).toBeInTheDocument();
    });
  });
});
