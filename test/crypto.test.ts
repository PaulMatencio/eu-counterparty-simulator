import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kycMessage, kycReference, issuerRevocationMessage, kycRevocationMessage } from '../src/attestation/format.js';
import { publicKeyOf, signMessage, verifyMessage, schnorrReduction, TWO_248 } from '../src/crypto/schnorr.js';
import { inCircuitCheckAttestation, inCircuitCheckMessage } from './helpers.js';

const att = {
  subject: new Uint8Array(32).fill(1),
  wallet: { bytes: new Uint8Array(32).fill(2) },
  kycLevel: 2n, amlRiskScore: 10n, validUntil: 1_900_000_000n,
  travelRuleRef: new Uint8Array(32).fill(3), salt: new Uint8Array(32).fill(4),
};
const sk = 0xabcdef123456789n;
const pk = publicKeyOf(sk);

test('signature verifies off-chain and in-circuit (interop with relying contracts)', () => {
  const sig = signMessage(sk, kycMessage(att));
  assert.equal(verifyMessage(pk, kycMessage(att), sig), true);
  assert.equal(inCircuitCheckAttestation(pk, att, sig), true);
});

test('any claim change breaks the signature, off-chain and in-circuit', () => {
  const sig = signMessage(sk, kycMessage(att));
  const tampered = { ...att, amlRiskScore: 9n };
  assert.equal(verifyMessage(pk, kycMessage(tampered), sig), false);
  assert.equal(inCircuitCheckAttestation(pk, tampered, sig), false);
});

test('another key does not verify', () => {
  const sig = signMessage(sk, kycMessage(att));
  assert.equal(inCircuitCheckAttestation(publicKeyOf(777n), att, sig), false);
});

test('domain separation: an attestation signature is not a revocation signature', () => {
  const ref = kycReference(att);
  const sig = signMessage(sk, kycMessage(att));
  assert.equal(inCircuitCheckMessage(pk, kycRevocationMessage(ref), sig), false);
  const rev = signMessage(sk, kycRevocationMessage(ref));
  assert.equal(inCircuitCheckMessage(pk, kycRevocationMessage(ref), rev), true);
  assert.equal(inCircuitCheckMessage(pk, issuerRevocationMessage(ref), rev), false);
});

test('fresh nonce per signature', () => {
  const a = signMessage(sk, 5n), b = signMessage(sk, 5n);
  assert.notEqual(a.announcement.x, b.announcement.x);
});

test('schnorrReduction splits the challenge exactly', () => {
  const c = (1n << 254n) + 12345n;
  const [q, r] = schnorrReduction(c);
  assert.equal(q * TWO_248 + r, c);
  assert.ok(r < TWO_248);
});
