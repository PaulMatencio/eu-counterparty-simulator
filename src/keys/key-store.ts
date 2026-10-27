/**
 * Issuer key management. The CASP's signing key never leaves the KeyStore;
 * callers ask it to sign. A production deployment would back this interface
 * with an HSM / cloud KMS (PKCS#11); the simulator ships two TEST-ONLY stores.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import * as rt from '@midnight-ntwrk/compact-runtime';
import type { JubjubPoint, SchnorrSignature } from '../attestation/format.js';
import { publicKeyOf, randomScalar, signMessage } from '../crypto/schnorr.js';
import { sha256, toHex, utf8 } from '../util/bytes.js';

export type KeyStatus = 'active' | 'revoked';

export interface IssuerKeyInfo {
  /** 32-byte issuer id used on-chain (addKycIssuer / attestation issuerId). */
  issuerId: Uint8Array;
  publicKey: JubjubPoint;
  status: KeyStatus;
  createdAt: number;
  revokedAt?: number;
}

export interface KeyStore {
  activeKey(): IssuerKeyInfo;
  keys(): IssuerKeyInfo[];
  /** Creates a new active key; the previous active key stays valid until revoked. */
  rotate(now: number): IssuerKeyInfo;
  sign(issuerId: Uint8Array, msg: bigint): SchnorrSignature;
  /** Signs the key's own revocation message, allowed even after the key is marked revoked. */
  signSelfRevocation(issuerId: Uint8Array, msg: bigint): SchnorrSignature;
  markRevoked(issuerId: Uint8Array, now: number): void;
}

/** issuerId = sha256("casp-issuer:v1" || pkx || pky): stable and collision-free per key. */
export function issuerIdOf(pk: JubjubPoint): Uint8Array {
  const enc = (v: bigint) => utf8(v.toString(16).padStart(64, '0'));
  return sha256(utf8('casp-issuer:v1'), enc(rt.jubjubPointX(pk)), enc(rt.jubjubPointY(pk)));
}

interface StoredKey {
  secret: string;
  createdAt: number;
  status: KeyStatus;
  revokedAt?: number;
}

/** In-memory store. Keys vanish with the process (TEST ONLY). */
export class MemoryKeyStore implements KeyStore {
  protected stored: StoredKey[] = [];

  constructor(initialSecret?: bigint, now = 0) {
    this.stored.push({ secret: (initialSecret ?? randomScalar()).toString(), createdAt: now, status: 'active' });
  }

  private info(k: StoredKey): IssuerKeyInfo {
    const publicKey = publicKeyOf(BigInt(k.secret));
    return { issuerId: issuerIdOf(publicKey), publicKey, status: k.status, createdAt: k.createdAt, revokedAt: k.revokedAt };
  }

  private find(issuerId: Uint8Array): StoredKey {
    const id = toHex(issuerId);
    const k = this.stored.find((s) => toHex(this.info(s).issuerId) === id);
    if (!k) throw new Error(`unknown issuer key ${id.slice(0, 12)}…`);
    return k;
  }

  activeKey(): IssuerKeyInfo {
    const k = [...this.stored].reverse().find((s) => s.status === 'active');
    if (!k) throw new Error('no active issuer key (all revoked): rotate first');
    return this.info(k);
  }

  keys(): IssuerKeyInfo[] {
    return this.stored.map((s) => this.info(s));
  }

  rotate(now: number): IssuerKeyInfo {
    const k: StoredKey = { secret: randomScalar().toString(), createdAt: now, status: 'active' };
    this.stored.push(k);
    this.persist();
    return this.info(k);
  }

  sign(issuerId: Uint8Array, msg: bigint): SchnorrSignature {
    const k = this.find(issuerId);
    if (k.status !== 'active') throw new Error('issuer key is revoked');
    return signMessage(BigInt(k.secret), msg);
  }

  /** Signing with a revoked key is refused, except for the key's own self-revocation message. */
  signSelfRevocation(issuerId: Uint8Array, msg: bigint): SchnorrSignature {
    return signMessage(BigInt(this.find(issuerId).secret), msg);
  }

  markRevoked(issuerId: Uint8Array, now: number): void {
    const k = this.find(issuerId);
    k.status = 'revoked';
    k.revokedAt = now;
    this.persist();
  }

  protected persist(): void {}
}

/**
 * Plain JSON key file, mode 0600. TEST ONLY: secrets are unencrypted on disk.
 * Loads an existing file or creates one with a fresh key.
 */
export class FileKeyStore extends MemoryKeyStore {
  constructor(private readonly path: string, now = 0) {
    super(undefined, now);
    if (existsSync(path)) {
      this.stored = JSON.parse(readFileSync(path, 'utf8')) as StoredKey[];
    } else {
      this.persist();
    }
  }

  protected override persist(): void {
    if (!this.path) return; // called from super() before path is set
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.stored, null, 2), { mode: 0o600 });
    chmodSync(this.path, 0o600);
  }
}
