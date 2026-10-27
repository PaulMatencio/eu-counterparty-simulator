/**
 * Domain Layer — Customer & Identity Value Objects and Entities.
 * Pure TypeScript, zero external dependencies.
 * TEST ONLY: synthetic data model for MiCA CASP simulation.
 */

export interface Person {
  givenName: string;
  familyName: string;
  dateOfBirth?: string; // ISO 8601 date (YYYY-MM-DD)
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

export type IdentityEvidence = 'eudi-pid' | 'passport' | 'national-id' | 'company-registry';

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
  identityEvidence?: IdentityEvidence;
  addressVerified: boolean;
  sourceOfFunds: {
    declared: string;
    documented: boolean;
  };
  expectedVolumeEur: number;
  /** Enhanced due diligence completed (senior approval, extra evidence). */
  eddCompleted: boolean;
}

export type CustomerStatus = 'active' | 'restricted' | 'erased';

export interface VerifiedWalletEntry {
  verified: boolean;
  method: string;
  verifiedAt?: number;
}

export interface CustomerRecord {
  id: string;
  status: CustomerStatus;
  profile?: CustomerProfile;
  assessment: import('./compliance.js').RiskAssessment;
  wallets: Record<string, VerifiedWalletEntry>;
  createdAt: number;
  lastActivityAt: number;
}

export interface ErasureOutcome {
  status: CustomerStatus;
  retainedUntil: number;
}

/** Validates that a natural or legal profile contains required fields before submission. */
export function validateCustomerProfile(profile: CustomerProfile): string[] {
  const errors: string[] = [];
  if (!profile.person.givenName.trim()) {
    errors.push('Representative or person given name is required');
  }
  if (!profile.person.familyName.trim()) {
    errors.push('Representative or person family name is required');
  }
  if (!/^[A-Z]{2}$/i.test(profile.person.nationality)) {
    errors.push('Nationality must be a 2-letter ISO country code');
  }
  if (!/^[A-Z]{2}$/i.test(profile.person.countryOfResidence)) {
    errors.push('Country of residence must be a 2-letter ISO country code');
  }
  if (profile.type === 'legal' && !profile.legalName?.trim()) {
    errors.push('Legal entity name is required for legal persons');
  }
  if (profile.expectedVolumeEur < 0 || !Number.isFinite(profile.expectedVolumeEur)) {
    errors.push('Expected volume (EUR) must be a non-negative number');
  }
  return errors;
}
