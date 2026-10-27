/**
 * Schnorr over Jubjub, matching KycAttestationV1.verifySchnorr:
 *   R = k*G,  c = transientHash(Rx, Ry, pkx, pky, msg),  c' = c mod 2^248,
 *   s = k + c'*sk (mod Jubjub order);  valid iff s*G == R + c'*pk.
 */
import { randomBytes } from 'node:crypto';
import * as rt from '@midnight-ntwrk/compact-runtime';
import type { JubjubPoint, SchnorrSignature } from '../attestation/format.js';

/** Order of the Jubjub prime-order subgroup. */
export const JUBJUB_ORDER = 0x0e7db4ea6533afa906673b0101343b00a6682093ccc81082d0970e5ed6f72cb7n;
export const TWO_248 = 1n << 248n;

const VEC5_FIELD = new rt.CompactTypeVector(5, rt.CompactTypeField);
const mod = (a: bigint, m: bigint = JUBJUB_ORDER): bigint => ((a % m) + m) % m;

/** Random scalar in [1, order-1] (512 random bits reduced; bias negligible). */
export function randomScalar(): bigint {
  const big = BigInt('0x' + randomBytes(64).toString('hex'));
  return mod(big, JUBJUB_ORDER - 1n) + 1n;
}

export const publicKeyOf = (secret: bigint): JubjubPoint => rt.ecMulGenerator(mod(secret));

/** Full challenge, exactly as the circuit computes `cFull`. */
export function challengeFull(announcement: JubjubPoint, publicKey: JubjubPoint, msg: bigint): bigint {
  return rt.transientHash(VEC5_FIELD, [
    rt.jubjubPointX(announcement), rt.jubjubPointY(announcement),
    rt.jubjubPointX(publicKey), rt.jubjubPointY(publicKey),
    msg,
  ]) as bigint;
}

/** Implementation of the `schnorrReduction` witness: c = q*2^248 + r. */
export const schnorrReduction = (cFull: bigint): [bigint, bigint] => [cFull / TWO_248, cFull % TWO_248];

export function isIdentity(p: JubjubPoint): boolean {
  return rt.jubjubPointX(p) === 0n && rt.jubjubPointY(p) === 1n;
}

/** Signs a field message. Never reuse a nonce: two signatures with one nonce leak the key. */
export function signMessage(secret: bigint, msg: bigint, nonce: bigint = randomScalar()): SchnorrSignature {
  const sk = mod(secret);
  const k = mod(nonce);
  if (sk === 0n || k === 0n) throw new Error('secret and nonce must be non-zero');
  const pk = publicKeyOf(sk);
  const announcement = rt.ecMulGenerator(k);
  const c = challengeFull(announcement, pk, msg) % TWO_248;
  return { announcement, response: mod(k + c * sk) };
}

/** Off-chain mirror of the circuit verifier. */
export function verifyMessage(publicKey: JubjubPoint, msg: bigint, sig: SchnorrSignature): boolean {
  if (isIdentity(publicKey)) return false;
  const c = challengeFull(sig.announcement, publicKey, msg) % TWO_248;
  const lhs = rt.ecMulGenerator(sig.response);
  const rhs = rt.ecAdd(sig.announcement, rt.ecMul(publicKey, c));
  return rt.jubjubPointX(lhs) === rt.jubjubPointX(rhs) && rt.jubjubPointY(lhs) === rt.jubjubPointY(rhs);
}
