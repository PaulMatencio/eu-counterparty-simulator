/**
 * Infrastructure Layer — HTTP CASP Gateway Adapter.
 * Connects to either the embedded Next.js Route Handlers (`/api`) or an external
 * standalone `casp-sim serve` instance (`http://127.0.0.1:8787`).
 */
import {
  DomainError,
  type AttestationBundle,
  type AttestationStatusRecord,
  type AuditEntry,
  type AuditVerificationResult,
  type CaspHealthStatus,
  type CustomerProfile,
  type CustomerRecord,
  type ErasureOutcome,
  type IssuerKeySummary,
  type OwnershipProof,
  type OwnershipVerificationResult,
  type Persona,
  type RevocationBundle,
  type RiskAssessment,
  type TravelRuleDisclosure,
  type TravelRuleRole,
  type WalletChallenge,
  type WirePoint,
} from '@/domain';
import type {
  ICaspGateway,
  IssueAttestationRequest,
  OnboardCustomerResult,
  OneShotPersonaResult,
} from '@/application';

export interface HttpCaspGatewayConfig {
  /** Base URL: `"/api"` for embedded Next.js routes or `"http://127.0.0.1:8787"` for external server. */
  baseUrl: string;
  defaultOfficerToken?: string;
  defaultNotaryToken?: string;
}

export class HttpCaspGatewayAdapter implements ICaspGateway {
  constructor(private readonly config: HttpCaspGatewayConfig) {}

  private buildUrl(path: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    bearerToken?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (bearerToken) {
      headers.authorization = `Bearer ${bearerToken}`;
    }

    let response: Response;
    try {
      response = await fetch(this.buildUrl(path), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (err: unknown) {
      throw new DomainError(
        'NETWORK_ERROR',
        `Cannot reach CASP backend at ${this.config.baseUrl}: ${
          err instanceof Error ? err.message : 'network failure'
        }`,
      );
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code =
        typeof payload.error === 'string' && /^[A-Z_]+$/.test(payload.error)
          ? payload.error
          : response.status === 401
            ? 'UNAUTHORIZED'
            : 'NETWORK_ERROR';
      const message = payload.message || payload.error || `HTTP ${response.status}`;
      throw new DomainError(code, message);
    }

    return payload as T;
  }

  async getHealth(): Promise<CaspHealthStatus> {
    return this.request<CaspHealthStatus>('GET', '/health');
  }

  async getWellKnownKeys(): Promise<{ casp: string; keys: IssuerKeySummary[] }> {
    return this.request<{ casp: string; keys: IssuerKeySummary[] }>(
      'GET',
      '/.well-known/casp-keys',
    );
  }

  async listPersonas(): Promise<Persona[]> {
    const res = await this.request<{ personas: Persona[] }>('GET', '/personas');
    return res.personas;
  }

  async onboardCustomer(profile: CustomerProfile): Promise<OnboardCustomerResult> {
    return this.request<OnboardCustomerResult>('POST', '/customers', { profile });
  }

  async createWalletChallenge(
    customerId: string,
    walletKey: string,
  ): Promise<WalletChallenge> {
    return this.request<WalletChallenge>(
      'POST',
      `/customers/${encodeURIComponent(customerId)}/wallet-challenge`,
      { walletKey },
    );
  }

  async submitWalletProof(
    customerId: string,
    proof: OwnershipProof,
  ): Promise<OwnershipVerificationResult> {
    return this.request<OwnershipVerificationResult>(
      'POST',
      `/customers/${encodeURIComponent(customerId)}/wallet-proof`,
      proof,
    );
  }

  async issueAttestation(req: IssueAttestationRequest): Promise<AttestationBundle> {
    return this.request<AttestationBundle>(
      'POST',
      `/customers/${encodeURIComponent(req.customerId)}/attestations`,
      {
        subject: req.subject,
        walletKey: req.walletKey,
        role: req.role,
        validityDays: req.validityDays,
      },
    );
  }

  async requestErasure(customerId: string): Promise<ErasureOutcome> {
    return this.request<ErasureOutcome>(
      'POST',
      `/customers/${encodeURIComponent(customerId)}/erasure`,
      {},
    );
  }

  async onboardPersonaOneShot(
    personaName: string,
    params: {
      subject: string;
      walletKey: string;
      role?: TravelRuleRole;
      validityDays?: number;
    },
  ): Promise<OneShotPersonaResult> {
    return this.request<OneShotPersonaResult>(
      'POST',
      `/test/personas/${encodeURIComponent(personaName)}/attestation`,
      params,
    );
  }

  async getCustomer(customerId: string, officerToken?: string): Promise<CustomerRecord> {
    return this.request<CustomerRecord>(
      'GET',
      `/customers/${encodeURIComponent(customerId)}`,
      undefined,
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async updateCustomerProfile(
    customerId: string,
    patch: Partial<CustomerProfile>,
    officerToken?: string,
  ): Promise<RiskAssessment> {
    return this.request<RiskAssessment>(
      'PATCH',
      `/customers/${encodeURIComponent(customerId)}`,
      { profile: patch },
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async getAttestationStatus(
    reference: string,
    authToken?: string,
  ): Promise<AttestationStatusRecord> {
    return this.request<AttestationStatusRecord>(
      'GET',
      `/attestations/${encodeURIComponent(reference)}`,
      undefined,
      authToken ?? this.config.defaultNotaryToken ?? this.config.defaultOfficerToken,
    );
  }

  async revokeAttestation(
    reference: string,
    reason: string,
    officerToken?: string,
  ): Promise<RevocationBundle> {
    return this.request<RevocationBundle>(
      'POST',
      `/attestations/${encodeURIComponent(reference)}/revoke`,
      { reason },
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async rotateIssuerKey(
    officerToken?: string,
  ): Promise<{ issuerId: string; publicKey: WirePoint }> {
    return this.request<{ issuerId: string; publicKey: WirePoint }>(
      'POST',
      '/issuer/keys/rotate',
      {},
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async revokeIssuerKey(
    issuerId: string,
    reason: string,
    officerToken?: string,
  ): Promise<RevocationBundle> {
    return this.request<RevocationBundle>(
      'POST',
      `/issuer/keys/${encodeURIComponent(issuerId)}/revoke`,
      { reason },
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async discloseTravelRule(
    reference: string,
    authToken?: string,
  ): Promise<TravelRuleDisclosure> {
    return this.request<TravelRuleDisclosure>(
      'GET',
      `/travel-rule/${encodeURIComponent(reference)}`,
      undefined,
      authToken ?? this.config.defaultNotaryToken ?? this.config.defaultOfficerToken,
    );
  }

  async getAuditLog(officerToken?: string): Promise<AuditEntry[]> {
    return this.request<AuditEntry[]>(
      'GET',
      '/audit',
      undefined,
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async verifyAuditLog(officerToken?: string): Promise<AuditVerificationResult> {
    return this.request<AuditVerificationResult>(
      'GET',
      '/audit/verify',
      undefined,
      officerToken ?? this.config.defaultOfficerToken,
    );
  }

  async advanceClock(seconds: number): Promise<{ currentTimestamp: number }> {
    return this.request<{ currentTimestamp: number }>('POST', '/test/clock', {
      advanceSeconds: seconds,
    });
  }
}
