/**
 * Infrastructure Layer — Wallet Adapter (Lace DApp Connector v4 + Deterministic Simulated Wallet).
 * Implements `IWalletPort` from `src/application`.
 */
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  DomainError,
  isValidHex32,
  normalizeHex32,
  type ConnectedWalletInfo,
} from '@/domain';
import type {
  ConnectWalletOptions,
  DetectedWalletExtension,
  IWalletPort,
} from '@/application';
import { bytesToHex, sha256Concat } from '../crypto/casp-crypto.adapter.js';

export const SIMULATED_WALLET_PRESETS = {
  buyer: {
    label: 'Simulated Buyer Wallet (FR — Camille Testard)',
    walletKeyHex: '65'.repeat(32),
    subjectRoleIdHex: '11'.repeat(32),
  },
  seller: {
    label: 'Simulated Seller Wallet (ES — Lucía Pruebas)',
    walletKeyHex: '66'.repeat(32),
    subjectRoleIdHex: '12'.repeat(32),
  },
  institutional: {
    label: 'Simulated SPV Treasury (DE — Testimmo GmbH)',
    walletKeyHex: '67'.repeat(32),
    subjectRoleIdHex: '13'.repeat(32),
  },
} as const;

/**
 * Converts a Bech32m or arbitrary string coin public key from Lace into a 32-byte hex key
 * suitable for `KycAttestationV1.wallet` (or preserves it if already 64 hex chars).
 */
export function derive32ByteHexKey(rawKey: string): string {
  const clean = rawKey.trim().replace(/^0x/i, '');
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return clean.toLowerCase();
  }
  const encoded = new TextEncoder().encode(rawKey.trim());
  return bytesToHex(sha256Concat(encoded));
}

export class MidnightWalletAdapter implements IWalletPort {
  async detectInjectedWallets(): Promise<DetectedWalletExtension[]> {
    if (typeof window === 'undefined' || !window.midnight) {
      return [];
    }
    const entries = Object.values(window.midnight).filter(
      (w): w is InitialAPI => w != null && typeof w.connect === 'function',
    );
    const seenRdns = new Set<string>();
    const out: DetectedWalletExtension[] = [];
    for (const w of entries) {
      const id = w.rdns || w.name || 'midnight-wallet';
      if (seenRdns.has(id)) continue;
      seenRdns.add(id);
      out.push({
        rdns: id,
        name: w.name || 'Midnight Wallet',
        apiVersion: w.apiVersion || '4.0.1',
        icon: w.icon,
      });
    }
    return out;
  }

  async connect(options: ConnectWalletOptions): Promise<ConnectedWalletInfo> {
    if (options.mode === 'simulated') {
      const walletKeyHex = options.simulatedWalletKeyHex
        ? normalizeHex32(options.simulatedWalletKeyHex)
        : SIMULATED_WALLET_PRESETS.buyer.walletKeyHex;

      const subjectRoleIdHex = options.simulatedSubjectRoleIdHex
        ? normalizeHex32(options.simulatedSubjectRoleIdHex)
        : SIMULATED_WALLET_PRESETS.buyer.subjectRoleIdHex;

      if (!isValidHex32(walletKeyHex)) {
        throw new DomainError(
          'WALLET_ERROR',
          'Simulated wallet key must be 32 bytes (64 hex characters)',
        );
      }
      if (!isValidHex32(subjectRoleIdHex)) {
        throw new DomainError(
          'WALLET_ERROR',
          'Subject roleId must be 32 bytes (64 hex characters)',
        );
      }

      return {
        mode: 'simulated',
        walletName: options.simulatedLabel ?? 'Simulated Test Wallet',
        networkId: options.networkId ?? 'undeployed',
        shieldedCoinPublicKeyHex: walletKeyHex,
        subjectRoleIdHex,
        shieldedAddressBech32m: `mn_shield-addr_test1${walletKeyHex.slice(0, 24)}`,
        unshieldedAddressBech32m: `mn_addr_test1${subjectRoleIdHex.slice(0, 24)}`,
        indexerUri: 'http://127.0.0.1:8088/api/v4/graphql',
        indexerWsUri: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
        substrateNodeUri: 'http://127.0.0.1:9944',
      };
    }

    // Lace / DApp Connector v4 mode
    if (typeof window === 'undefined' || !window.midnight) {
      throw new DomainError(
        'WALLET_ERROR',
        'No Midnight wallet extension found in window.midnight. Install Lace or switch to Simulated Wallet mode.',
      );
    }

    const wallet = Object.values(window.midnight).find(
      (w): w is InitialAPI => w != null && typeof w.connect === 'function',
    );
    if (!wallet) {
      throw new DomainError(
        'WALLET_ERROR',
        'No compatible CAIP-372 Midnight wallet detected.',
      );
    }

    const targetNetwork = options.networkId ?? 'preprod';
    try {
      const api = await wallet.connect(targetNetwork);
      const [config, shielded, unshielded] = await Promise.all([
        api.getConfiguration(),
        api.getShieldedAddresses(),
        api.getUnshieldedAddress().catch(() => ({ unshieldedAddress: undefined })),
      ]);

      const coinKeyHex = derive32ByteHexKey(shielded.shieldedCoinPublicKey);
      const subjectRoleIdHex =
        options.simulatedSubjectRoleIdHex && isValidHex32(options.simulatedSubjectRoleIdHex)
          ? normalizeHex32(options.simulatedSubjectRoleIdHex)
          : derive32ByteHexKey(`role:${shielded.shieldedAddress}`);

      return {
        mode: 'lace',
        walletName: wallet.name || 'Lace Midnight Wallet',
        networkId: config.networkId || targetNetwork,
        shieldedCoinPublicKeyHex: coinKeyHex,
        subjectRoleIdHex,
        shieldedAddressBech32m: shielded.shieldedAddress,
        unshieldedAddressBech32m: unshielded.unshieldedAddress,
        indexerUri: config.indexerUri,
        indexerWsUri: config.indexerWsUri,
        substrateNodeUri: config.substrateNodeUri,
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'type' in err &&
        (err as { type?: string }).type === 'DAppConnectorAPIError'
      ) {
        const apiErr = err as { code?: string; reason?: string };
        throw new DomainError(
          'WALLET_ERROR',
          `Lace [${apiErr.code ?? 'Error'}]: ${apiErr.reason ?? 'Wallet connection failed'}`,
        );
      }
      throw new DomainError(
        'WALLET_ERROR',
        err instanceof Error ? err.message : 'Failed to connect to Midnight wallet',
      );
    }
  }

  async disconnect(): Promise<void> {
    // DApp Connector v4 holds connection state per session; clearing client state disconnects.
  }
}
