/**
 * Infrastructure Layer Barrel Export.
 * Used ONLY by the Composition Root in `src/presentation/providers/dependency-injection.provider.tsx`
 * and by Next.js server routes (`src/app/api/*`).
 */
export * from './crypto/casp-crypto.adapter.js';
export * from './midnight-js/kyc-harness.adapter.js';
export * from './wallet/midnight-wallet.adapter.js';
export * from './storage/browser-storage.adapter.js';
export * from './indexer/midnight-indexer.adapter.js';
export * from './tooling/http-casp-gateway.adapter.js';
