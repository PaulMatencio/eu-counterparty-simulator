/**
 * Domain Layer — Domain Errors.
 * Pure TypeScript, zero external dependencies.
 */

export type CaspDomainErrorCode =
  | 'UNKNOWN_CUSTOMER'
  | 'CUSTOMER_RESTRICTED'
  | 'UNKNOWN_CHALLENGE'
  | 'NOT_APPROVED'
  | 'WALLET_NOT_VERIFIED'
  | 'UNKNOWN_ATTESTATION'
  | 'UNKNOWN_TRAVEL_RULE_RECORD'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'WALLET_ERROR'
  | 'NETWORK_ERROR';

export class DomainError extends Error {
  constructor(
    public readonly code: CaspDomainErrorCode | string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
