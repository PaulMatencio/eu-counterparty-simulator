/**
 * Travel Rule record (EU Transfer of Funds Regulation) in a simplified
 * IVMS101-shaped JSON, plus its salted commitment `travelRuleRef`, which the
 * attestation carries and the escrow contract stores on-chain.
 *
 * travelRuleRef = sha256("re-escrow:travel-rule:v1" || canonicalJson(record) || salt)
 * The record and salt stay with the CASP and are disclosed only to authorized
 * parties (counterparty CASP, notary, supervisor), who recompute the hash.
 */
import { canonicalJson } from '../util/canonical-json.js';
import { bytesEqual, sha256, toHex, utf8 } from '../util/bytes.js';
import type { CustomerProfile } from './types.js';

export type TravelRuleRole = 'originator' | 'beneficiary';

export interface Ivms101Record {
  ivmsVersion: 'IVMS101.2023-simplified';
  role: TravelRuleRole;
  person:
    | { naturalPerson: { name: { primaryIdentifier: string; secondaryIdentifier: string; nameIdentifierType: 'LEGL' }; dateAndPlaceOfBirth?: { dateOfBirth: string }; countryOfResidence: string; nationalIdentification?: { identifierType: string } } }
    | { legalPerson: { name: { legalPersonName: string; legalPersonNameIdentifierType: 'LEGL' }; nationalIdentification?: { identifier: string; identifierType: 'LEIX' }; countryOfRegistration?: string } };
  geographicAddress?: { streetName: string; postCode: string; townName: string; country: string };
  /** Self-hosted shielded wallet key (hex), verified by the CASP. */
  accountNumber: string;
  caspName: string;
  createdAt: number;
}

export function buildIvms101(profile: CustomerProfile, role: TravelRuleRole, walletKey: Uint8Array, caspName: string, now: number): Ivms101Record {
  const person: Ivms101Record['person'] =
    profile.type === 'legal'
      ? {
          legalPerson: {
            name: { legalPersonName: profile.legalName ?? '', legalPersonNameIdentifierType: 'LEGL' },
            nationalIdentification: profile.lei ? { identifier: profile.lei, identifierType: 'LEIX' } : undefined,
            countryOfRegistration: profile.registrationCountry,
          },
        }
      : {
          naturalPerson: {
            name: { primaryIdentifier: profile.person.familyName, secondaryIdentifier: profile.person.givenName, nameIdentifierType: 'LEGL' },
            dateAndPlaceOfBirth: profile.person.dateOfBirth ? { dateOfBirth: profile.person.dateOfBirth } : undefined,
            countryOfResidence: profile.person.countryOfResidence,
          },
        };
  return {
    ivmsVersion: 'IVMS101.2023-simplified',
    role,
    person,
    geographicAddress: profile.address
      ? { streetName: profile.address.street, postCode: profile.address.postCode, townName: profile.address.town, country: profile.address.country }
      : undefined,
    accountNumber: toHex(walletKey),
    caspName,
    createdAt: now,
  };
}

export function travelRuleRefOf(record: Ivms101Record, salt: Uint8Array): Uint8Array {
  return sha256(utf8('re-escrow:travel-rule:v1'), utf8(canonicalJson(record)), salt);
}

export function verifyTravelRuleRef(record: Ivms101Record, salt: Uint8Array, ref: Uint8Array): boolean {
  return bytesEqual(travelRuleRefOf(record, salt), ref);
}
