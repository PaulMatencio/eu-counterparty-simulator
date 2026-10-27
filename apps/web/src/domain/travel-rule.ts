/**
 * Domain Layer — EU Transfer of Funds Regulation (Travel Rule) IVMS101 Models.
 * Pure TypeScript, zero external dependencies.
 */

export type TravelRuleRole = 'originator' | 'beneficiary';

export interface Ivms101NaturalPerson {
  naturalPerson: {
    name: {
      primaryIdentifier: string;
      secondaryIdentifier: string;
      nameIdentifierType: 'LEGL';
    };
    dateAndPlaceOfBirth?: {
      dateOfBirth: string;
    };
    countryOfResidence: string;
    nationalIdentification?: {
      identifierType: string;
    };
  };
}

export interface Ivms101LegalPerson {
  legalPerson: {
    name: {
      legalPersonName: string;
      legalPersonNameIdentifierType: 'LEGL';
    };
    nationalIdentification?: {
      identifier: string;
      identifierType: 'LEIX';
    };
    countryOfRegistration?: string;
  };
}

export interface Ivms101Record {
  ivmsVersion: 'IVMS101.2023-simplified';
  role: TravelRuleRole;
  person: Ivms101NaturalPerson | Ivms101LegalPerson;
  geographicAddress?: {
    streetName: string;
    postCode: string;
    townName: string;
    country: string;
  };
  /** Self-hosted shielded wallet key (hex), verified by the CASP. */
  accountNumber: string;
  caspName: string;
  createdAt: number;
}

export interface TravelRuleDisclosure {
  reference: string;
  record: Ivms101Record;
  salt: string;
}

export interface VerifiedTravelRuleDisclosure extends TravelRuleDisclosure {
  recomputedCommitmentHex: string;
  expectedCommitmentHex?: string;
  commitmentVerified: boolean;
}
