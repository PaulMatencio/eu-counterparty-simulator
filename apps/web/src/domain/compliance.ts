/**
 * Domain Layer — Compliance, Risk Scoring, Sanctions & Personas.
 * Pure TypeScript, zero external dependencies.
 */
import type { CustomerProfile } from './customer.js';

export type Decision = 'approve' | 'refer' | 'reject';

export type KycLevelLabel = 'L0' | 'L1' | 'L2' | 'L3';

export interface RiskFactor {
  code: string;
  points: number;
  detail: string;
}

export interface RiskAssessment {
  decision: Decision;
  /** 0 = not verified, 1 = basic, 2 = full CDD, 3 = enhanced DD. */
  kycLevel: number;
  /** 0..255, the value put in the attestation. */
  amlRiskScore: number;
  eddRequired: boolean;
  sanctionsHit: boolean;
  factors: RiskFactor[];
  reasons: string[];
}

export interface Policy {
  caspName: string;
  highRiskCountries: string[];
  eddVolumeThresholdEur: number;
  selfHostedWalletVerificationThresholdEur: number;
  riskPoints: {
    base: number;
    pep: number;
    highRiskCountry: number;
    sourceOfFundsUndocumented: number;
    highVolume: number;
    complexOwnership: number;
  };
  eddScoreThreshold: number;
  rejectScoreThreshold: number;
  attestationValidityDays: number;
  retentionYears: number;
}

export interface SanctionsEntry {
  id: string;
  name: string;
  type: 'natural' | 'legal';
  country?: string;
}

export interface Persona {
  name: string;
  description: string;
  expected: {
    decision: Decision;
    kycLevel: number;
  };
  profile: CustomerProfile;
}

export function formatKycLevel(level: number): KycLevelLabel {
  if (level <= 0) return 'L0';
  if (level === 1) return 'L1';
  if (level === 2) return 'L2';
  return 'L3';
}

export function canIssueAttestation(
  assessment: RiskAssessment | null | undefined,
  walletVerified: boolean,
): boolean {
  if (!assessment) return false;
  return assessment.decision === 'approve' && assessment.kycLevel >= 1 && walletVerified;
}
