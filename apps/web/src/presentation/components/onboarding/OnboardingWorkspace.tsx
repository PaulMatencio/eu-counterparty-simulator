'use client';

/**
 * Presentation Layer — Customer Onboarding, Persona Gallery, Risk Assessment & GDPR Erasure View.
 */
import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Play,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  formatKycLevel,
  type CustomerProfile,
  type Decision,
  type ErasureOutcome,
  type Persona,
  type RiskAssessment,
  type TravelRuleRole,
} from '@/domain';
import { useAppDependencies } from '../../providers/dependency-injection.provider.js';

const DEFAULT_CUSTOM_PROFILE: CustomerProfile = {
  type: 'natural',
  person: {
    givenName: 'Camille',
    familyName: 'Testard',
    dateOfBirth: '1985-04-12',
    nationality: 'FR',
    countryOfResidence: 'FR',
    pep: false,
  },
  address: {
    street: '1 Rue de Test',
    postCode: '69001',
    town: 'Lyon',
    country: 'FR',
  },
  identityVerified: true,
  identityEvidence: 'eudi-pid',
  addressVerified: true,
  sourceOfFunds: {
    declared: 'Savings and residential mortgage loan',
    documented: true,
  },
  expectedVolumeEur: 450_000,
  eddCompleted: false,
};

function DecisionBadge({ decision }: { decision: Decision }) {
  const { t } = useAppDependencies();
  if (decision === 'approve') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t.onboarding.decisionApprove}
      </span>
    );
  }
  if (decision === 'refer') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300">
        <AlertCircle className="h-3.5 w-3.5" />
        {t.onboarding.decisionRefer}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-bold text-rose-300">
      <ShieldAlert className="h-3.5 w-3.5" />
      {t.onboarding.decisionReject}
    </span>
  );
}

export function OnboardingWorkspace({
  personas,
  activeCustomerId,
  assessment,
  erasureOutcome,
  busy,
  onRunPersonaOneShot,
  onSubmitCustomProfile,
  onRequestErasure,
}: {
  personas: Persona[];
  activeCustomerId: string;
  assessment: RiskAssessment | null;
  erasureOutcome: ErasureOutcome | null;
  busy: boolean;
  onRunPersonaOneShot: (name: string, role: TravelRuleRole) => Promise<void>;
  onSubmitCustomProfile: (profile: CustomerProfile) => Promise<void>;
  onRequestErasure: (customerId?: string) => Promise<void>;
}) {
  const { t } = useAppDependencies();
  const [formProfile, setFormProfile] = useState<CustomerProfile>(
    DEFAULT_CUSTOM_PROFILE,
  );

  const handleLoadPersonaIntoForm = (persona: Persona) => {
    setFormProfile(structuredClone(persona.profile));
  };

  return (
    <div className="space-y-6">
      {/* 1. Fixture Persona Gallery */}
      <section className="midnight-card rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            {t.onboarding.personaGalleryTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.onboarding.personaGallerySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {personas.map((p) => {
            const defaultRole: TravelRuleRole = p.name.startsWith('seller')
              ? 'beneficiary'
              : 'originator';
            return (
              <div
                key={p.name}
                className="rounded-xl border border-indigo-500/20 bg-slate-950/60 p-3.5 flex flex-col justify-between gap-3 hover:border-indigo-500/45 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-indigo-300">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-200">
                        {formatKycLevel(p.expected.kycLevel)}
                      </span>
                      <DecisionBadge decision={p.expected.decision} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onRunPersonaOneShot(p.name, defaultRole)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t.onboarding.runOneShot}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPersonaIntoForm(p)}
                    className="rounded-lg border border-slate-700 hover:border-indigo-400 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition"
                  >
                    {t.onboarding.loadIntoForm}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Custom Profile Form & Risk Assessment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Custom CDD/EDD Form */}
        <section className="midnight-card rounded-2xl p-5 lg:col-span-7">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
            <UserCheck className="h-4 w-4 text-indigo-400" />
            {t.onboarding.customProfileTitle}
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmitCustomProfile(formProfile);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.customerType}
                </label>
                <select
                  value={formProfile.type}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      type: e.target.value as 'natural' | 'legal',
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-2"
                >
                  <option value="natural" className="bg-slate-900">
                    {t.onboarding.naturalPerson}
                  </option>
                  <option value="legal" className="bg-slate-900">
                    {t.onboarding.legalEntity}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.givenName}
                </label>
                <input
                  type="text"
                  value={formProfile.person.givenName}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      person: { ...prev.person, givenName: e.target.value },
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.familyName}
                </label>
                <input
                  type="text"
                  value={formProfile.person.familyName}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      person: { ...prev.person, familyName: e.target.value },
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            {formProfile.type === 'legal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {t.onboarding.legalName}
                  </label>
                  <input
                    type="text"
                    value={formProfile.legalName ?? ''}
                    onChange={(e) =>
                      setFormProfile((prev) => ({
                        ...prev,
                        legalName: e.target.value,
                      }))
                    }
                    placeholder="Testimmo Beteiligungs GmbH"
                    className="midnight-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {t.onboarding.lei}
                  </label>
                  <input
                    type="text"
                    value={formProfile.lei ?? ''}
                    onChange={(e) =>
                      setFormProfile((prev) => ({
                        ...prev,
                        lei: e.target.value,
                      }))
                    }
                    placeholder="529900TESTSIMULATOR01"
                    className="midnight-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.nationality}
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={formProfile.person.nationality}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      person: {
                        ...prev.person,
                        nationality: e.target.value.toUpperCase(),
                      },
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.countryOfResidence}
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={formProfile.person.countryOfResidence}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      person: {
                        ...prev.person,
                        countryOfResidence: e.target.value.toUpperCase(),
                      },
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">
                  {t.onboarding.expectedVolumeEur}
                </label>
                <input
                  type="number"
                  value={formProfile.expectedVolumeEur}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      expectedVolumeEur: Number(e.target.value),
                    }))
                  }
                  className="midnight-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                {t.onboarding.sourceOfFundsDeclared}
              </label>
              <input
                type="text"
                value={formProfile.sourceOfFunds.declared}
                onChange={(e) =>
                  setFormProfile((prev) => ({
                    ...prev,
                    sourceOfFunds: {
                      ...prev.sourceOfFunds,
                      declared: e.target.value,
                    },
                  }))
                }
                className="midnight-input w-full rounded-lg px-2.5 py-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.identityVerified}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      identityVerified: e.target.checked,
                    }))
                  }
                />
                <span>{t.onboarding.identityVerified}</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.addressVerified}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      addressVerified: e.target.checked,
                    }))
                  }
                />
                <span>{t.onboarding.addressVerified}</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.sourceOfFunds.documented}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      sourceOfFunds: {
                        ...prev.sourceOfFunds,
                        documented: e.target.checked,
                      },
                    }))
                  }
                />
                <span>{t.onboarding.sourceOfFundsDocumented}</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 cursor-pointer text-amber-200">
                <input
                  type="checkbox"
                  checked={formProfile.person.pep}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      person: { ...prev.person, pep: e.target.checked },
                    }))
                  }
                />
                <span>{t.onboarding.pepFlag}</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-950/20 px-3 py-2 cursor-pointer text-indigo-200 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={formProfile.eddCompleted}
                  onChange={(e) =>
                    setFormProfile((prev) => ({
                      ...prev,
                      eddCompleted: e.target.checked,
                    }))
                  }
                />
                <span>{t.onboarding.eddCompleted}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50"
            >
              {t.onboarding.submitOnboarding}
            </button>
          </form>
        </section>

        {/* Right: Risk Assessment & GDPR Erasure */}
        <div className="lg:col-span-5 space-y-6">
          <section className="midnight-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-bold text-slate-100">
                {t.onboarding.assessmentTitle}
              </h3>
              {activeCustomerId && (
                <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                  ID: {activeCustomerId.slice(0, 12)}…
                </span>
              )}
            </div>

            {!assessment ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Select a fixture persona above or submit a custom profile to inspect the CASP due diligence decision.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-950/70 p-3.5 border border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-400">Decision</div>
                    <div className="mt-1">
                      <DecisionBadge decision={assessment.decision} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">
                      {t.onboarding.kycLevel}
                    </div>
                    <div className="mt-0.5 font-mono text-xl font-extrabold text-indigo-300">
                      {formatKycLevel(assessment.kycLevel)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">
                      {t.onboarding.amlRiskScore}
                    </div>
                    <div className="mt-0.5 font-mono text-xl font-extrabold text-slate-100">
                      {assessment.amlRiskScore}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        / 255
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Score Bar */}
                <div>
                  <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        assessment.amlRiskScore >= 80
                          ? 'bg-rose-500'
                          : assessment.amlRiskScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (assessment.amlRiskScore / 255) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>0 (Low)</span>
                    <span>40 (EDD Threshold)</span>
                    <span>80 (Reject)</span>
                    <span>255 (Sanctions)</span>
                  </div>
                </div>

                {assessment.factors.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1.5">
                      {t.onboarding.riskFactors}
                    </div>
                    <div className="space-y-1.5">
                      {assessment.factors.map((f, idx) => (
                        <div
                          key={`${f.code}-${idx}`}
                          className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-1.5 text-xs"
                        >
                          <span className="text-slate-300">
                            <strong className="font-mono text-indigo-300">
                              {f.code}
                            </strong>
                            : {f.detail}
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            +{f.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assessment.reasons.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                    {assessment.reasons.join(' • ')}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* GDPR Art. 17 vs AMLR Retention */}
          <section className="midnight-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              <Trash2 className="h-4 w-4 text-rose-400" />
              {t.onboarding.gdprTitle}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {t.onboarding.gdprSubtitle}
            </p>

            <button
              type="button"
              disabled={busy || !activeCustomerId}
              onClick={() => void onRequestErasure(activeCustomerId)}
              className="w-full rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 py-2 text-xs font-semibold text-rose-200 transition disabled:opacity-40"
            >
              {t.onboarding.requestErasureBtn}
            </button>

            {erasureOutcome && (
              <div className="mt-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs space-y-1">
                <div>
                  Customer Status:{' '}
                  <span className="font-mono font-bold text-amber-300 uppercase">
                    {erasureOutcome.status}
                  </span>
                </div>
                <div className="text-slate-400">
                  AML Retention Window Until:{' '}
                  <span className="font-mono text-slate-200">
                    {new Date(erasureOutcome.retainedUntil * 1000)
                      .toISOString()
                      .slice(0, 10)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
