/**
 * Application Layer — Outbound Ports for Storage and Indexer Inspection.
 * Depends ONLY on `src/domain`.
 */
import type { AttestationBundle, CaspBackendMode, RevocationBundle } from '@/domain';

export interface PersistedSessionState {
  backendMode: CaspBackendMode;
  externalBaseUrl: string;
  officerToken: string;
  notaryToken: string;
  activeCustomerId: string | null;
  issuedBundles: AttestationBundle[];
  revocationBundles: RevocationBundle[];
  locale: 'en' | 'fr' | 'de' | 'es';
}

export interface IStoragePort {
  loadSession(): PersistedSessionState;
  saveSession(patch: Partial<PersistedSessionState>): PersistedSessionState;
  clearSession(): PersistedSessionState;
}

export interface IndexerHealthSummary {
  reachable: boolean;
  endpoint: string;
  blockHeight?: number;
  latencyMs?: number;
  error?: string;
}

export interface IIndexerPort {
  checkHealth(indexerUri: string): Promise<IndexerHealthSummary>;
}
