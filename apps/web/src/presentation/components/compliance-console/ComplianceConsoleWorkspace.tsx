'use client';

/**
 * Presentation Layer — Officer EDD Review, Issuer Key Rotation/Revocation,
 * Travel Rule IVMS101 Disclosure & Hash-Chained Audit Log Explorer.
 */
import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileSearch,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldAlert,
  UserCog,
} from 'lucide-react';
import type {
  AttestationBundle,
  AuditEntry,
  AuditVerificationResult,
  CustomerRecord,
  IssuerKeySummary,
  RevocationBundle,
  VerifiedTravelRuleDisclosure,
} from '@/domain';
import { useAppDependencies } from '../../providers/dependency-injection.provider.js';

export function ComplianceConsoleWorkspace({
  activeCustomerId,
  activeBundle,
  issuerKeys,
  inspectedCustomer,
  latestRevocation,
  travelRuleResult,
  auditEntries,
  auditVerification,
  busy,
  onInspectCustomer,
  onApproveEdd,
  onRotateKey,
  onRevokeKey,
  onRevokeAttestation,
  onDiscloseTravelRule,
  onRefreshAuditChain,
}: {
  activeCustomerId: string;
  activeBundle: AttestationBundle | null;
  issuerKeys: IssuerKeySummary[];
  inspectedCustomer: CustomerRecord | null;
  latestRevocation: {
    bundle: RevocationBundle;
    verifiedInCircuit: boolean | null;
  } | null;
  travelRuleResult: VerifiedTravelRuleDisclosure | null;
  auditEntries: AuditEntry[];
  auditVerification: AuditVerificationResult | null;
  busy: boolean;
  onInspectCustomer: (customerId: string) => Promise<void>;
  onApproveEdd: (customerId: string) => Promise<void>;
  onRotateKey: () => Promise<void>;
  onRevokeKey: (issuerId: string, reason: string) => Promise<void>;
  onRevokeAttestation: (reference: string, reason: string) => Promise<void>;
  onDiscloseTravelRule: (reference: string) => Promise<void>;
  onRefreshAuditChain: () => Promise<void>;
}) {
  const { t } = useAppDependencies();
  const [customerIdInput, setCustomerIdInput] = useState(activeCustomerId);
  const [attestationRefInput, setAttestationRefInput] = useState(
    activeBundle?.reference ?? '',
  );
  const [revocationReason, setRevocationReason] = useState(
    'Sanctions / adverse media hit (simulation)',
  );

  React.useEffect(() => {
    if (activeCustomerId) setCustomerIdInput(activeCustomerId);
  }, [activeCustomerId]);

  React.useEffect(() => {
    if (activeBundle?.reference) setAttestationRefInput(activeBundle.reference);
  }, [activeBundle?.reference]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Officer Customer Inspection & EDD Approval */}
        <section className="midnight-card rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-indigo-400" />
              {t.compliance.eddReviewTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.compliance.eddReviewSubtitle}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              placeholder="Customer ID (24 hex chars)"
              className="midnight-input flex-1 rounded-lg px-3 py-1.5 font-mono text-xs"
            />
            <button
              type="button"
              disabled={busy || !customerIdInput.trim()}
              onClick={() => void onInspectCustomer(customerIdInput)}
              className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition disabled:opacity-40"
            >
              {t.compliance.inspectCustomerBtn}
            </button>
          </div>

          {inspectedCustomer && (
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-indigo-300">
                  ID: {inspectedCustomer.id}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono uppercase text-[11px]">
                  Status: {inspectedCustomer.status}
                </span>
              </div>
              <div className="text-slate-300">
                Decision:{' '}
                <strong className="uppercase text-white">
                  {inspectedCustomer.assessment.decision}
                </strong>{' '}
                • KYC Level: <strong>L{inspectedCustomer.assessment.kycLevel}</strong>{' '}
                • Score: <strong>{inspectedCustomer.assessment.amlRiskScore}</strong>
              </div>
              {inspectedCustomer.profile && (
                <div className="text-slate-400">
                  Subject: {inspectedCustomer.profile.person.givenName}{' '}
                  {inspectedCustomer.profile.person.familyName} (
                  {inspectedCustomer.profile.person.countryOfResidence}) • EDD
                  Completed:{' '}
                  <strong className="text-slate-200">
                    {String(inspectedCustomer.profile.eddCompleted)}
                  </strong>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={busy || !customerIdInput.trim()}
            onClick={() => void onApproveEdd(customerIdInput)}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
          >
            {t.compliance.completeEddBtn}
          </button>
        </section>

        {/* 2. CASP Issuer Key Management */}
        <section className="midnight-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-violet-400" />
              {t.compliance.keyManagementTitle}
            </h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRotateKey()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t.compliance.rotateKeyBtn}
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {issuerKeys.map((k) => (
              <div
                key={k.issuerId}
                className="rounded-xl bg-slate-950/75 border border-slate-800 p-3 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        k.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {k.status}
                    </span>
                    <span className="font-mono text-slate-200 truncate">
                      {k.issuerId.slice(0, 24)}…
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 truncate mt-1">
                    pk.x: {k.publicKey.x.slice(0, 28)}…
                  </div>
                </div>
                {k.status === 'active' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void onRevokeKey(k.issuerId, 'key compromise drill')
                    }
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition"
                  >
                    {t.compliance.revokeKeyBtn}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Attestation Revocation & Travel Rule Disclosure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attestation Revocation */}
        <section className="midnight-card rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            {t.compliance.revocationTitle}
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">
                Attestation Reference (32-byte hex)
              </label>
              <input
                type="text"
                value={attestationRefInput}
                onChange={(e) => setAttestationRefInput(e.target.value)}
                placeholder="64-character hex reference"
                className="midnight-input w-full rounded-lg px-3 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Revocation Reason
              </label>
              <input
                type="text"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="midnight-input w-full rounded-lg px-3 py-1.5"
              />
            </div>

            <button
              type="button"
              disabled={busy || !attestationRefInput.trim()}
              onClick={() =>
                void onRevokeAttestation(attestationRefInput, revocationReason)
              }
              className="w-full rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/35 py-2 font-semibold text-rose-200 transition disabled:opacity-40"
            >
              {t.compliance.revokeAttestationBtn}
            </button>
          </div>

          {latestRevocation && (
            <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-300 uppercase">
                  Signed {latestRevocation.bundle.kind} RevocationBundle
                </span>
                {latestRevocation.verifiedInCircuit !== null && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    In-Circuit Verified: {String(latestRevocation.verifiedInCircuit)}
                  </span>
                )}
              </div>
              <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40">
                {JSON.stringify(latestRevocation.bundle, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Travel Rule IVMS101 Disclosure & Verification */}
        <section className="midnight-card rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-emerald-400" />
              {t.compliance.travelRuleTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.compliance.travelRuleSubtitle}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={attestationRefInput}
              onChange={(e) => setAttestationRefInput(e.target.value)}
              placeholder="Attestation reference (64 hex chars)"
              className="midnight-input flex-1 rounded-lg px-3 py-1.5 font-mono text-xs"
            />
            <button
              type="button"
              disabled={busy || !attestationRefInput.trim()}
              onClick={() => void onDiscloseTravelRule(attestationRefInput)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
            >
              <Eye className="h-3.5 w-3.5" />
              {t.compliance.discloseTravelRuleBtn}
            </button>
          </div>

          {travelRuleResult && (
            <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3.5 text-xs space-y-2">
              {travelRuleResult.commitmentVerified && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.compliance.commitmentMatchBadge}
                </div>
              )}
              <div className="font-mono text-[11px] text-slate-400 truncate">
                Recomputed SHA-256: {travelRuleResult.recomputedCommitmentHex}
              </div>
              <div className="font-mono text-[11px] text-slate-400 truncate">
                Salt: {travelRuleResult.salt}
              </div>
              <pre className="rounded-lg bg-slate-900/90 p-2.5 font-mono text-[10px] text-slate-200 overflow-x-auto max-h-44">
                {JSON.stringify(travelRuleResult.record, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* 4. Tamper-Evident Audit Chain Explorer */}
      <section className="midnight-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-400" />
              {t.compliance.auditChainTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.compliance.auditChainSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {auditVerification && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  auditVerification.valid
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {auditVerification.valid
                  ? `${t.compliance.chainValidBadge} (${auditVerification.length} entries)`
                  : t.compliance.chainBrokenBadge}
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRefreshAuditChain()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t.compliance.verifyChainBtn}
            </button>
          </div>
        </div>

        {auditEntries.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Click &ldquo;{t.compliance.verifyChainBtn}&rdquo; to inspect the tamper-evident hash chain.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Event Type</th>
                  <th className="py-2 px-2">Actor</th>
                  <th className="py-2 px-2">Data (No PII)</th>
                  <th className="py-2 px-2">prevHash → hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                {auditEntries.map((entry) => (
                  <tr key={entry.seq} className="hover:bg-slate-900/50">
                    <td className="py-2 px-2 text-indigo-400">{entry.seq}</td>
                    <td className="py-2 px-2 font-semibold text-slate-200">
                      {entry.type}
                    </td>
                    <td className="py-2 px-2 text-slate-400">{entry.actor}</td>
                    <td className="py-2 px-2 text-slate-300 max-w-md truncate">
                      {JSON.stringify(entry.data)}
                    </td>
                    <td className="py-2 px-2 text-slate-400">
                      {entry.prevHash.slice(0, 8)}… →{' '}
                      <span className="text-emerald-300">
                        {entry.hash.slice(0, 10)}…
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
