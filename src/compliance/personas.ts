/**
 * Synthetic test personas. Names, dates and addresses are FICTIONAL.
 * Each persona documents the outcome the simulator is expected to produce.
 */
import type { CustomerProfile } from './types.js';

export interface Persona {
  name: string;
  description: string;
  expected: { decision: 'approve' | 'refer' | 'reject'; kycLevel: number };
  profile: CustomerProfile;
}

const addr = (country: string, town: string) => ({ street: '1 Rue de Test', postCode: '00000', town, country });

export const PERSONAS: Record<string, Persona> = {
  'buyer-clean': {
    name: 'buyer-clean',
    description: 'Retail buyer, EU resident, documented savings and mortgage: full CDD, low risk.',
    expected: { decision: 'approve', kycLevel: 2 },
    profile: {
      type: 'natural',
      person: { givenName: 'Camille', familyName: 'Testard', dateOfBirth: '1985-04-12', nationality: 'FR', countryOfResidence: 'FR', pep: false },
      address: addr('FR', 'Lyon'),
      identityVerified: true, identityEvidence: 'eudi-pid', addressVerified: true,
      sourceOfFunds: { declared: 'Savings and mortgage loan', documented: true },
      expectedVolumeEur: 450_000, eddCompleted: false,
    },
  },
  'seller-clean': {
    name: 'seller-clean',
    description: 'Retail seller, EU resident, property ownership documented: full CDD, low risk.',
    expected: { decision: 'approve', kycLevel: 2 },
    profile: {
      type: 'natural',
      person: { givenName: 'Lucía', familyName: 'Pruebas', dateOfBirth: '1972-11-03', nationality: 'ES', countryOfResidence: 'ES', pep: false },
      address: addr('ES', 'Valencia'),
      identityVerified: true, identityEvidence: 'national-id', addressVerified: true,
      sourceOfFunds: { declared: 'Sale of residential property', documented: true },
      expectedVolumeEur: 450_000, eddCompleted: false,
    },
  },
  'buyer-corporate-edd': {
    name: 'buyer-corporate-edd',
    description: 'Institutional buyer (SPV), two UBOs, high volume: EDD completed, approved at level 3.',
    expected: { decision: 'approve', kycLevel: 3 },
    profile: {
      type: 'legal',
      legalName: 'Testimmo Beteiligungs GmbH', lei: '529900TESTSIMULATOR01', registrationCountry: 'DE',
      person: { givenName: 'Jonas', familyName: 'Probemann', nationality: 'DE', countryOfResidence: 'DE', pep: false },
      beneficialOwners: [
        { givenName: 'Anna', familyName: 'Musterfrau', nationality: 'DE', countryOfResidence: 'AT', pep: false },
        { givenName: 'Pieter', familyName: 'Testvelde', nationality: 'NL', countryOfResidence: 'NL', pep: false },
      ],
      address: addr('DE', 'Berlin'),
      identityVerified: true, identityEvidence: 'company-registry', addressVerified: true,
      sourceOfFunds: { declared: 'Fund capital call', documented: true },
      expectedVolumeEur: 12_000_000, eddCompleted: true,
    },
  },
  'buyer-pep-edd': {
    name: 'buyer-pep-edd',
    description: 'Politically exposed person, EDD completed: approved at level 3 with an elevated score.',
    expected: { decision: 'approve', kycLevel: 3 },
    profile: {
      type: 'natural',
      person: { givenName: 'Marco', familyName: 'Provatore', nationality: 'IT', countryOfResidence: 'IT', pep: true },
      address: addr('IT', 'Torino'),
      identityVerified: true, identityEvidence: 'passport', addressVerified: true,
      sourceOfFunds: { declared: 'Salary and inheritance', documented: true },
      expectedVolumeEur: 800_000, eddCompleted: true,
    },
  },
  'buyer-pep-no-edd': {
    name: 'buyer-pep-no-edd',
    description: 'Politically exposed person, EDD not yet done: referred, no attestation.',
    expected: { decision: 'refer', kycLevel: 2 },
    profile: {
      type: 'natural',
      person: { givenName: 'Sofia', familyName: 'Probova', nationality: 'SK', countryOfResidence: 'SK', pep: true },
      address: addr('SK', 'Bratislava'),
      identityVerified: true, identityEvidence: 'passport', addressVerified: true,
      sourceOfFunds: { declared: 'Salary', documented: true },
      expectedVolumeEur: 300_000, eddCompleted: false,
    },
  },
  'buyer-high-risk': {
    name: 'buyer-high-risk',
    description: 'PEP, high-risk third country, undocumented source of funds: rejected on score.',
    expected: { decision: 'reject', kycLevel: 1 },
    profile: {
      type: 'natural',
      person: { givenName: 'Victor', familyName: 'Riskante', nationality: 'XA', countryOfResidence: 'XA', pep: true },
      address: addr('XA', 'Testville'),
      identityVerified: true, identityEvidence: 'passport', addressVerified: true,
      sourceOfFunds: { declared: 'Cash business', documented: false },
      expectedVolumeEur: 2_000_000, eddCompleted: false,
    },
  },
  'buyer-sanctioned': {
    name: 'buyer-sanctioned',
    description: 'Name matches the fictional sample sanctions list: rejected, score 255.',
    expected: { decision: 'reject', kycLevel: 0 },
    profile: {
      type: 'natural',
      person: { givenName: 'Testo', familyName: 'Sanctionedperson', nationality: 'XA', countryOfResidence: 'FR', pep: false },
      address: addr('FR', 'Paris'),
      identityVerified: true, identityEvidence: 'passport', addressVerified: true,
      sourceOfFunds: { declared: 'Savings', documented: true },
      expectedVolumeEur: 500_000, eddCompleted: false,
    },
  },
  'buyer-basic-only': {
    name: 'buyer-basic-only',
    description: 'Identity verified but no address proof: approved at level 1 only, below an escrow policy of 2.',
    expected: { decision: 'approve', kycLevel: 1 },
    profile: {
      type: 'natural',
      person: { givenName: 'Emma', familyName: 'Basisdottir', nationality: 'DK', countryOfResidence: 'DK', pep: false },
      identityVerified: true, identityEvidence: 'eudi-pid', addressVerified: false,
      sourceOfFunds: { declared: 'Savings', documented: true },
      expectedVolumeEur: 200_000, eddCompleted: false,
    },
  },
  'buyer-unverified': {
    name: 'buyer-unverified',
    description: 'Identity check not passed: referred, no attestation.',
    expected: { decision: 'refer', kycLevel: 0 },
    profile: {
      type: 'natural',
      person: { givenName: 'Nils', familyName: 'Unbekannt', nationality: 'SE', countryOfResidence: 'SE', pep: false },
      identityVerified: false, addressVerified: false,
      sourceOfFunds: { declared: 'Savings', documented: false },
      expectedVolumeEur: 100_000, eddCompleted: false,
    },
  },
};
