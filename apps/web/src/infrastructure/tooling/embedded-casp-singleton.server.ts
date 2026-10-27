/**
 * Infrastructure Layer — Embedded CASP Simulator Singleton (Server-Only).
 * Powers Next.js Route Handlers (`/api/*`) for zero-config operation,
 * including a controllable clock (`advanceSeconds`) so users can test
 * attestation expiration and 5-year AML retention vs GDPR erasure.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { CaspError, CaspSimulator } from '@casp-core/casp/casp-simulator.js';
import { PERSONAS } from '@casp-core/compliance/personas.js';
import type { Policy, SanctionsEntry } from '@casp-core/compliance/types.js';
import { MemoryKeyStore } from '@casp-core/keys/key-store.js';
import { ManualClock } from '@casp-core/util/clock.js';

const DEFAULT_POLICY: Policy = {
  caspName: 'EU Counterparty Simulator CASP (TEST)',
  highRiskCountries: ['XA', 'XB', 'XC'],
  eddVolumeThresholdEur: 1_000_000,
  selfHostedWalletVerificationThresholdEur: 1_000,
  riskPoints: {
    base: 5,
    pep: 35,
    highRiskCountry: 35,
    sourceOfFundsUndocumented: 25,
    highVolume: 10,
    complexOwnership: 10,
  },
  eddScoreThreshold: 40,
  rejectScoreThreshold: 80,
  attestationValidityDays: 7,
  retentionYears: 5,
};

const DEFAULT_SANCTIONS: SanctionsEntry[] = [
  { id: 'SIM-0001', name: 'Testo Sanctionedperson', type: 'natural', country: 'XA' },
  { id: 'SIM-0002', name: 'Shellco Blocked Holdings Ltd', type: 'legal', country: 'XB' },
];

export const EMBEDDED_OFFICER_TOKEN =
  process.env.CASP_OFFICER_TOKEN ?? 'officer-dev-token';
export const EMBEDDED_NOTARY_TOKEN =
  process.env.CASP_NOTARY_TOKEN ?? 'notary-dev-token';

interface EmbeddedCaspContext {
  casp: CaspSimulator;
  clock: ManualClock;
  personas: typeof PERSONAS;
}

const globalForCasp = globalThis as unknown as {
  __caspEmbeddedContext?: EmbeddedCaspContext;
};

export function getEmbeddedCasp(): EmbeddedCaspContext {
  if (!globalForCasp.__caspEmbeddedContext) {
    const initialNow = Math.floor(Date.now() / 1000);
    const clock = new ManualClock(initialNow);
    const keyStore = new MemoryKeyStore(0x1234567890abcdefn, initialNow);
    const casp = new CaspSimulator({
      policy: DEFAULT_POLICY,
      sanctions: DEFAULT_SANCTIONS,
      keyStore,
      clock,
    });
    globalForCasp.__caspEmbeddedContext = { casp, clock, personas: PERSONAS };
  }
  return globalForCasp.__caspEmbeddedContext;
}

export type AuthRole = 'officer' | 'notary';

export function resolveRequestRole(req: NextRequest): AuthRole | undefined {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token && token === EMBEDDED_OFFICER_TOKEN) return 'officer';
  if (token && token === EMBEDDED_NOTARY_TOKEN) return 'notary';
  return undefined;
}

export function requireAuthRole(req: NextRequest, allowed: AuthRole[]): AuthRole {
  const role = resolveRequestRole(req);
  if (!role || !allowed.includes(role)) {
    throw new HttpApiError(401, 'UNAUTHORIZED', 'Valid officer or notary bearer token required');
  }
  return role;
}

export class HttpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function toJsonResponse(data: unknown, status = 200): NextResponse {
  const serialized = JSON.stringify(data, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
  return new NextResponse(serialized, {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export async function withEmbeddedCaspHandler(
  fn: () => Promise<unknown> | unknown,
): Promise<NextResponse> {
  try {
    const data = await fn();
    return toJsonResponse(data, 200);
  } catch (err: unknown) {
    if (err instanceof HttpApiError) {
      return toJsonResponse({ error: err.code, message: err.message }, err.status);
    }
    if (err instanceof CaspError) {
      return toJsonResponse({ error: err.code, message: err.message }, 422);
    }
    return toJsonResponse(
      {
        error: 'BAD_REQUEST',
        message: err instanceof Error ? err.message : 'Request failed',
      },
      400,
    );
  }
}
