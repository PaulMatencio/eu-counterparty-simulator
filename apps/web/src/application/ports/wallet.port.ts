/**
 * Application Layer — Outbound Port for Midnight Wallet Integration.
 * Supports both Lace DApp Connector v4 (`window.midnight`) and Simulated Test Wallets.
 * Depends ONLY on `src/domain`.
 */
import type { ConnectedWalletInfo, WalletConnectionMode } from '@/domain';

export interface DetectedWalletExtension {
  rdns: string;
  name: string;
  apiVersion: string;
  icon?: string;
}

export interface ConnectWalletOptions {
  mode: WalletConnectionMode;
  networkId?: string;
  /** Optional preset seed/byte or explicit hex keys for simulated mode. */
  simulatedWalletKeyHex?: string;
  simulatedSubjectRoleIdHex?: string;
  simulatedLabel?: string;
}

export interface IWalletPort {
  /** Enumerate injected CAIP-372 Midnight wallet extensions in browser. */
  detectInjectedWallets(): Promise<DetectedWalletExtension[]>;

  /** Connect to Lace or initialize a deterministic Simulated Wallet. */
  connect(options: ConnectWalletOptions): Promise<ConnectedWalletInfo>;

  /** Disconnect active wallet session. */
  disconnect(): Promise<void>;
}
