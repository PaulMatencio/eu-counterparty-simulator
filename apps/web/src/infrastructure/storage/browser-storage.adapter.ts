/**
 * Infrastructure Layer — Browser & In-Memory Storage Adapters.
 * Implements `IStoragePort` from `src/application`.
 */
import type { IStoragePort, PersistedSessionState } from '@/application';

const STORAGE_KEY = 'casp_simulator_session_v1';

export const DEFAULT_SESSION_STATE: PersistedSessionState = {
  backendMode: 'embedded',
  externalBaseUrl: 'http://127.0.0.1:8787',
  officerToken: 'officer-dev-token',
  notaryToken: 'notary-dev-token',
  activeCustomerId: null,
  issuedBundles: [],
  revocationBundles: [],
  locale: 'en',
};

export class BrowserStorageAdapter implements IStoragePort {
  private memoryFallback: PersistedSessionState = { ...DEFAULT_SESSION_STATE };

  loadSession(): PersistedSessionState {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...this.memoryFallback };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SESSION_STATE };
      const parsed = JSON.parse(raw) as Partial<PersistedSessionState>;
      return {
        ...DEFAULT_SESSION_STATE,
        ...parsed,
        issuedBundles: Array.isArray(parsed.issuedBundles) ? parsed.issuedBundles : [],
        revocationBundles: Array.isArray(parsed.revocationBundles)
          ? parsed.revocationBundles
          : [],
      };
    } catch {
      return { ...DEFAULT_SESSION_STATE };
    }
  }

  saveSession(patch: Partial<PersistedSessionState>): PersistedSessionState {
    const next: PersistedSessionState = {
      ...this.loadSession(),
      ...patch,
    };
    this.memoryFallback = next;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors in private browsing
      }
    }
    return next;
  }

  clearSession(): PersistedSessionState {
    this.memoryFallback = { ...DEFAULT_SESSION_STATE };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    return { ...DEFAULT_SESSION_STATE };
  }
}

export class MemoryStorageAdapter implements IStoragePort {
  private state: PersistedSessionState;

  constructor(initial?: Partial<PersistedSessionState>) {
    this.state = { ...DEFAULT_SESSION_STATE, ...initial };
  }

  loadSession(): PersistedSessionState {
    return { ...this.state };
  }

  saveSession(patch: Partial<PersistedSessionState>): PersistedSessionState {
    this.state = { ...this.state, ...patch };
    return { ...this.state };
  }

  clearSession(): PersistedSessionState {
    this.state = { ...DEFAULT_SESSION_STATE };
    return { ...this.state };
  }
}
