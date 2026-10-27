/**
 * Rule-based CDD / EDD risk assessment (TEST ONLY).
 * Models the shape of a CASP's AML decision: sanctions screening, PEP,
 * country risk, source of funds, volume and ownership complexity, then a
 * KYC level and a 0..255 risk score for the on-chain attestation.
 */
import type { SanctionsScreener } from './sanctions.js';
import type { CustomerProfile, Person, Policy, RiskAssessment, RiskFactor } from './types.js';

const fullName = (p: Person) => `${p.givenName} ${p.familyName}`;

export function assessRisk(profile: CustomerProfile, policy: Policy, screener: SanctionsScreener): RiskAssessment {
  const P = policy.riskPoints;
  const factors: RiskFactor[] = [{ code: 'BASE', points: P.base, detail: 'Baseline' }];
  const reasons: string[] = [];
  const people: Person[] = [profile.person, ...(profile.beneficialOwners ?? [])];

  // 1. Sanctions screening: customer, legal entity name and every beneficial owner.
  const names = people.map(fullName);
  if (profile.legalName) names.push(profile.legalName);
  const hits = names.map((n) => screener.screen(n)).filter((e) => e !== undefined);
  if (hits.length > 0) {
    reasons.push(`Sanctions match: ${hits.map((h) => h!.id).join(', ')}`);
    return { decision: 'reject', kycLevel: 0, amlRiskScore: 255, eddRequired: true, sanctionsHit: true, factors, reasons };
  }

  // 2. Risk factors.
  if (people.some((p) => p.pep)) factors.push({ code: 'PEP', points: P.pep, detail: 'Politically exposed person involved' });
  const countries = new Set<string>();
  for (const p of people) {
    countries.add(p.nationality);
    countries.add(p.countryOfResidence);
  }
  if (profile.registrationCountry) countries.add(profile.registrationCountry);
  const risky = [...countries].filter((c) => policy.highRiskCountries.includes(c));
  if (risky.length) factors.push({ code: 'HIGH_RISK_COUNTRY', points: P.highRiskCountry, detail: risky.join(', ') });
  if (!profile.sourceOfFunds.documented) {
    factors.push({ code: 'SOF_UNDOCUMENTED', points: P.sourceOfFundsUndocumented, detail: profile.sourceOfFunds.declared });
  }
  if (profile.expectedVolumeEur >= policy.eddVolumeThresholdEur) {
    factors.push({ code: 'HIGH_VOLUME', points: P.highVolume, detail: `${profile.expectedVolumeEur} EUR` });
  }
  if ((profile.beneficialOwners?.length ?? 0) > 3) {
    factors.push({ code: 'COMPLEX_OWNERSHIP', points: P.complexOwnership, detail: `${profile.beneficialOwners!.length} UBOs` });
  }
  const score = Math.min(254, factors.reduce((a, f) => a + f.points, 0));
  const eddRequired = score >= policy.eddScoreThreshold || people.some((p) => p.pep) || risky.length > 0;

  // 3. KYC level from the evidence collected.
  let kycLevel = 0;
  if (profile.identityVerified) kycLevel = 1;
  if (kycLevel === 1 && profile.addressVerified && profile.sourceOfFunds.documented) kycLevel = 2;
  if (kycLevel === 2 && profile.eddCompleted) kycLevel = 3;

  // 4. Decision.
  let decision: RiskAssessment['decision'] = 'approve';
  if (!profile.identityVerified) {
    decision = 'refer';
    reasons.push('Identity not verified');
  }
  if (eddRequired && !profile.eddCompleted) {
    decision = 'refer';
    reasons.push('Enhanced due diligence required but not completed');
  }
  if (score >= policy.rejectScoreThreshold) {
    decision = 'reject';
    reasons.push(`Risk score ${score} >= reject threshold ${policy.rejectScoreThreshold}`);
  }
  return { decision, kycLevel, amlRiskScore: score, eddRequired, sanctionsHit: false, factors, reasons };
}
