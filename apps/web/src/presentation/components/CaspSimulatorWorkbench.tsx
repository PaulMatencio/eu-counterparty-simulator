'use client';

/**
 * Presentation Layer — Main CASP Simulator Workbench View.
 * Orchestrates the 3 interactive workspaces:
 *  1. Customer Onboarding & CDD/EDD Portal
 *  2. Self-Hosted Wallet Proof & ZK Attestation Workbench
 *  3. Compliance Officer, Notary Travel Rule & Tamper-Evident Audit Console
 */
import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAppDependencies } from '../providers/dependency-injection.provider.js';
import {
  useCaspOverview,
  useSimulatorWorkflow,
} from '../hooks/use-simulator-workflow.js';
import { TopHeaderBar } from './layout/TopHeaderBar.js';
import { OnboardingWorkspace } from './onboarding/OnboardingWorkspace.js';
import { AttestationWorkspace } from './attestation/AttestationWorkspace.js';
import { ComplianceConsoleWorkspace } from './compliance-console/ComplianceConsoleWorkspace.js';

type ActiveTab = 'onboarding' | 'attestation' | 'compliance';

export function CaspSimulatorWorkbench() {
  const { t, officerComplianceUseCase } = useAppDependencies();
  const {
    health,
    personas,
    issuerKeys,
    setIssuerKeys,
    error: overviewError,
    advanceClock,
  } = useCaspOverview();

  const wf = useSimulatorWorkflow();
  const [activeTab, setActiveTab] = useState<ActiveTab>('onboarding');

  const handleRotateKey = async () => {
    const res = await officerComplianceUseCase.rotateIssuerKey();
    setIssuerKeys(res.allKeys);
  };

  const handleRevokeKey = async (issuerId: string, reason: string) => {
    const target = issuerKeys.find((k) => k.issuerId === issuerId);
    const res = await officerComplianceUseCase.revokeIssuerKey(
      issuerId,
      reason,
      target?.publicKey,
    );
    setIssuerKeys(res.allKeys);
    wf.setLatestRevocation({
      bundle: res.revocation,
      verifiedInCircuit: res.verifiedInCircuit,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopHeaderBar
        health={health}
        onAdvanceClock={(sec) => void advanceClock(sec)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 space-y-6">
        {/* Workspace Navigation Tabs */}
        <nav
          aria-label="Simulator Workspaces"
          className="flex flex-wrap gap-2 rounded-2xl bg-slate-950/75 border border-indigo-500/20 p-1.5"
        >
          {(
            [
              { id: 'onboarding', label: t.tabs.onboarding },
              { id: 'attestation', label: t.tabs.attestation },
              { id: 'compliance', label: t.tabs.complianceConsole },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[210px] rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Global Status & Error Notifications */}
        {(wf.statusBanner || wf.actionError || overviewError) && (
          <div className="space-y-2">
            {wf.statusBanner && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {wf.statusBanner}
                </span>
                {wf.activeBundle && activeTab === 'onboarding' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('attestation')}
                    className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 px-2.5 py-1 text-[11px] font-bold text-emerald-200 shrink-0"
                  >
                    Inspect Bundle & Witness →
                  </button>
                )}
              </div>
            )}
            {(wf.actionError || overviewError) && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200 flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{wf.actionError ?? overviewError}</span>
              </div>
            )}
          </div>
        )}

        {/* Active Workspace Content */}
        {activeTab === 'onboarding' && (
          <OnboardingWorkspace
            personas={personas}
            activeCustomerId={wf.activeCustomerId}
            assessment={wf.assessment}
            erasureOutcome={wf.erasureOutcome}
            busy={wf.busy}
            onRunPersonaOneShot={wf.runPersonaOneShot}
            onSubmitCustomProfile={wf.submitCustomOnboarding}
            onRequestErasure={wf.triggerGdprErasure}
          />
        )}

        {activeTab === 'attestation' && (
          <AttestationWorkspace
            activeCustomerId={wf.activeCustomerId}
            challenge={wf.challenge}
            walletVerified={wf.walletVerified}
            activeBundle={wf.activeBundle}
            circuitCheck={wf.circuitCheck}
            witnessExport={wf.witnessExport}
            busy={wf.busy}
            onCreateChallenge={wf.createOwnershipChallenge}
            onSubmitProof={wf.submitOwnershipProof}
            onIssueAttestation={wf.issueKycAttestation}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceConsoleWorkspace
            activeCustomerId={wf.activeCustomerId}
            activeBundle={wf.activeBundle}
            issuerKeys={issuerKeys}
            inspectedCustomer={wf.inspectedCustomer}
            latestRevocation={wf.latestRevocation}
            travelRuleResult={wf.travelRuleResult}
            auditEntries={wf.auditEntries}
            auditVerification={wf.auditVerification}
            busy={wf.busy}
            onInspectCustomer={wf.inspectCustomerAsOfficer}
            onApproveEdd={wf.approveEddAsOfficer}
            onRotateKey={handleRotateKey}
            onRevokeKey={handleRevokeKey}
            onRevokeAttestation={wf.revokeAttestationAsOfficer}
            onDiscloseTravelRule={wf.discloseTravelRuleRecord}
            onRefreshAuditChain={wf.refreshAuditChain}
          />
        )}
      </main>
    </div>
  );
}
