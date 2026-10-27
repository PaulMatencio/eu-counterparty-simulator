'use client';

/**
 * Presentation Layer — Self-Hosted Wallet Ownership & KycAttestationV1 Issuance + Compact Circuit Verifier.
 */
import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileCode2,
  Key,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AttestationBundle,
  CircuitVerificationSummary,
  TravelRuleRole,
  WalletChallenge,
} from '@/domain';
import type { WitnessCodeExport } from '@/application';
import { useAppDependencies } from '../../providers/dependency-injection.provider.js';

export function AttestationWorkspace({
  activeCustomerId,
  challenge,
  walletVerified,
  activeBundle,
  circuitCheck,
  witnessExport,
  busy,
  onCreateChallenge,
  onSubmitProof,
  onIssueAttestation,
}: {
  activeCustomerId: string;
  challenge: WalletChallenge | null;
  walletVerified: boolean;
  activeBundle: AttestationBundle | null;
  circuitCheck: CircuitVerificationSummary | null;
  witnessExport: WitnessCodeExport | null;
  busy: boolean;
  onCreateChallenge: () => Promise<void>;
  onSubmitProof: () => Promise<void>;
  onIssueAttestation: (role: TravelRuleRole, validityDays: number) => Promise<void>;
}) {
  const { t, wallet } = useAppDependencies();
  const [role, setRole] = useState<TravelRuleRole>('originator');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Self-Hosted Wallet Ownership Challenge */}
        <section className="midnight-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-400" />
                {t.attestation.ownershipTitle}
              </h2>
              {walletVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.attestation.walletVerifiedBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.attestation.ownershipSubtitle}
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs font-mono">
              <div className="text-slate-400">
                Active Customer ID:{' '}
                <span className="text-indigo-300">
                  {activeCustomerId || '(Onboard a customer first)'}
                </span>
              </div>
              <div className="text-slate-400 truncate">
                Target Wallet Key:{' '}
                <span className="text-slate-200">
                  0x{wallet.shieldedCoinPublicKeyHex}
                </span>
              </div>
              {challenge && (
                <div className="pt-1 border-t border-slate-800 text-amber-300">
                  Challenge ID: {challenge.challengeId} ({challenge.method})
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy || !activeCustomerId}
              onClick={() => void onCreateChallenge()}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/30 py-2.5 text-xs font-semibold text-indigo-200 transition disabled:opacity-40"
            >
              {t.attestation.createChallengeBtn}
            </button>
            <button
              type="button"
              disabled={busy || !challenge}
              onClick={() => void onSubmitProof()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40"
            >
              {t.attestation.submitProofBtn}
            </button>
          </div>
        </section>

        {/* Step 2: Issue KycAttestationV1 */}
        <section className="midnight-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              {t.attestation.issueTitle}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.attestation.issueSubtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Travel Rule Role (IVMS101)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TravelRuleRole)}
                  className="midnight-input w-full rounded-lg px-2.5 py-2"
                >
                  <option value="originator" className="bg-slate-900">
                    {t.attestation.roleOriginator}
                  </option>
                  <option value="beneficiary" className="bg-slate-900">
                    {t.attestation.roleBeneficiary}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  {t.attestation.validityDays}
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !activeCustomerId}
            onClick={() => void onIssueAttestation(role, validityDays)}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-40"
          >
            {t.attestation.issueBundleBtn}
          </button>
        </section>
      </div>

      {/* Signed Bundle, In-Circuit Verification Status & Witness Export */}
      {activeBundle && (
        <section className="midnight-card rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
            <div>
              <div className="text-xs font-mono text-indigo-300">
                Reference (kycReference): {activeBundle.reference}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Issuer ID: <span className="font-mono">{activeBundle.issuerId}</span> •
                KYC Level: <strong className="text-slate-200">L{activeBundle.attestation.kycLevel}</strong> •
                AML Score: <strong className="text-slate-200">{activeBundle.attestation.amlRiskScore}</strong>
              </div>
            </div>

            {circuitCheck && (
              <div className="flex items-center gap-2">
                {circuitCheck.verifiedInCircuit ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {t.attestation.circuitVerifiedBadge}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                    <XCircle className="h-4 w-4" />
                    {t.attestation.circuitFailedBadge}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Witness Snippet */}
            {witnessExport && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <FileCode2 className="h-4 w-4" />
                    {t.attestation.witnessSnippetTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText('witness', witnessExport.typescriptSnippet)
                    }
                    className="inline-flex items-center gap-1 rounded bg-indigo-500/20 hover:bg-indigo-500/35 px-2 py-1 text-[11px] font-medium text-indigo-200"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedKey === 'witness'
                      ? t.attestation.copiedBtn
                      : t.attestation.copyBtn}
                  </button>
                </div>
                <pre className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-80">
                  {witnessExport.typescriptSnippet}
                </pre>
              </div>
            )}

            {/* Raw Bundle JSON */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                  <FileCode2 className="h-4 w-4" />
                  {t.attestation.bundleJsonTitle}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText('bundle', JSON.stringify(activeBundle, null, 2))
                  }
                  className="inline-flex items-center gap-1 rounded bg-violet-500/20 hover:bg-violet-500/35 px-2 py-1 text-[11px] font-medium text-violet-200"
                >
                  <Copy className="h-3 w-3" />
                  {copiedKey === 'bundle'
                    ? t.attestation.copiedBtn
                    : t.attestation.copyBtn}
                </button>
              </div>
              <pre className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-80">
                {JSON.stringify(activeBundle, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
