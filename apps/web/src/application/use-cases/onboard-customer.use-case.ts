/**
 * Application Use-Case — Customer Onboarding & GDPR Erasure.
 * Depends ONLY on `src/domain` and `src/application/ports`.
 */
import {
  DomainError,
  validateCustomerProfile,
  type CustomerProfile,
  type ErasureOutcome,
} from '@/domain';
import type { ICaspGateway, OnboardCustomerResult } from '../ports/casp-gateway.port.js';
import type { IStoragePort } from '../ports/storage.port.js';

export class OnboardCustomerUseCase {
  constructor(
    private readonly caspGateway: ICaspGateway,
    private readonly storage: IStoragePort,
  ) {}

  async execute(profile: CustomerProfile): Promise<OnboardCustomerResult> {
    const validationErrors = validateCustomerProfile(profile);
    if (validationErrors.length > 0) {
      throw new DomainError('VALIDATION_ERROR', validationErrors.join('; '));
    }

    const result = await this.caspGateway.onboardCustomer(profile);
    this.storage.saveSession({ activeCustomerId: result.customerId });
    return result;
  }
}

export class RequestGdprErasureUseCase {
  constructor(private readonly caspGateway: ICaspGateway) {}

  async execute(customerId: string): Promise<ErasureOutcome> {
    if (!customerId.trim()) {
      throw new DomainError('VALIDATION_ERROR', 'Customer ID is required for erasure');
    }
    return this.caspGateway.requestErasure(customerId.trim());
  }
}
