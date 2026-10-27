/** Synthetic customer data model (TEST ONLY: never load real personal data). */

export interface Person {
  givenName: string;
  familyName: string;
  dateOfBirth?: string; // ISO date
  nationality: string; // ISO 3166-1 alpha-2
  countryOfResidence: string;
  pep: boolean;
}

export interface Address {
  street: string;
  postCode: string;
  town: string;
  country: string;
}

export interface CustomerProfile {
  type: 'natural' | 'legal';
  /** Natural person, or the legal representative of a legal person. */
  person: Person;
  /** Legal persons only. */
  legalName?: string;
  lei?: string;
  registrationCountry?: string;
  beneficialOwners?: Person[];
  address?: Address;
  /** Identity document + liveness check passed (e.g. EUDI Wallet PID presentation). */
  identityVerified: boolean;
  identityEvidence?: 'eudi-pid' | 'passport' | 'national-id' | 'company-registry';
  addressVerified: boolean;
  sourceOfFunds: { declared: string; documented: boolean };
  expectedVolumeEur: number;
  /** Enhanced due diligence completed (senior approval, extra evidence). */
  eddCompleted: boolean;
}

export type Decision = 'approve' | 'refer' | 'reject';

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
