import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kycReference } from '../src/attestation/format.js';
import { bundleToWitness, pointFromWire, sigFromWire } from '../src/attestation/wire.js';
import { kycRevocationMessage, issuerRevocationMessage } from '../src/attestation/format.js';
import { PERSONAS } from '../src/compliance/personas.js';
import { DAY, YEAR } from '../src/util/clock.js';
import { fromHex, toHex } from '../src/util/bytes.js';
import { verifyTravelRuleRef } from '../src/compliance/travel-rule.js';
import { T0, hex32, inCircuitCheckAttestation, inCircuitCheckMessage, makeCasp } from './helpers.js';

const WALLET = hex32(0x65);
const SUBJECT = hex32(0x11);

function onboardVerified(casp: ReturnType<typeof makeCasp>['casp'], persona: string, wallet = WALLET) {
  const { customerId, assessment } = casp.onboard(PERSONAS[persona].profile);
  const ch = casp.createWalletChallenge(customerId, wallet);
  assert.equal(casp.submitWalletProof(customerId, { challengeId: ch.challengeId, evidence: { declared: true } }).verified, true);
  return { customerId, assessment };
}

test('clean buyer: attestation verifies in-circuit and binds subject, wallet and travel rule', () => {
  const { casp } = makeCasp();
  const { customerId } = onboardVerified(casp, 'buyer-clean');
  const b = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' });
  const [att, sig, issuerId] = bundleToWitness(b);
  assert.equal(toHex(att.subject), SUBJECT);
  assert.equal(toHex(att.wallet.bytes), WALLET);
  assert.equal(att.kycLevel, 2n);
  assert.equal(att.validUntil, BigInt(T0 + 7 * DAY));
  assert.equal(toHex(kycReference(att)), b.reference);
  assert.equal(toHex(issuerId), casp.publicKeys()[0].issuerId);
  assert.equal(inCircuitCheckAttestation(pointFromWire(b.issuerPublicKey), att, sig), true);
  const tr = casp.discloseTravelRule(b.reference, 'notary');
  assert.equal(verifyTravelRuleRef(tr.record, fromHex(tr.salt), att.travelRuleRef), true);
  assert.equal(tr.record.role, 'originator');
});

test('no attestation without approval, verified identity or verified wallet', () => {
  const { casp } = makeCasp();
  for (const persona of ['buyer-sanctioned', 'buyer-high-risk', 'buyer-pep-no-edd', 'buyer-unverified']) {
    const { customerId } = onboardVerified(casp, persona);
    assert.throws(() => casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' }), /NOT_APPROVED/, persona);
  }
  const { customerId } = casp.onboard(PERSONAS['buyer-clean'].profile);
  assert.throws(() => casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' }), /WALLET_NOT_VERIFIED/);
  const v = onboardVerified(casp, 'buyer-clean');
  assert.throws(() => casp.issueAttestation({ customerId: v.customerId, subject: SUBJECT, walletKey: hex32(0x66), role: 'originator' }), /WALLET_NOT_VERIFIED/);
});

test('PEP referred, then approved at level 3 once EDD is completed', () => {
  const { casp } = makeCasp();
  const { customerId, assessment } = onboardVerified(casp, 'buyer-pep-no-edd');
  assert.equal(assessment.decision, 'refer');
  const after = casp.updateProfile(customerId, { eddCompleted: true });
  assert.equal(after.decision, 'approve');
  assert.equal(after.kycLevel, 3);
  const b = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' });
  assert.equal(b.attestation.kycLevel, 3);
  assert.ok(b.attestation.amlRiskScore >= 40);
});

test('attestation revocation: signed message verifies in-circuit; status tracked', () => {
  const { casp, clock } = makeCasp();
  const { customerId } = onboardVerified(casp, 'seller-clean');
  const b = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'beneficiary' });
  const rev = casp.revokeAttestation(b.reference, 'sanctions hit (test)');
  const pk = pointFromWire(b.issuerPublicKey);
  assert.equal(inCircuitCheckMessage(pk, kycRevocationMessage(fromHex(b.reference)), sigFromWire(rev.signature)), true);
  assert.equal(casp.getAttestation(b.reference).status, 'revoked');
  const b2 = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'beneficiary', validityDays: 1 });
  clock.advance(2 * DAY);
  assert.equal(casp.getAttestation(b2.reference).status, 'expired');
});

test('issuer key revocation and rotation', () => {
  const { casp } = makeCasp();
  const { customerId } = onboardVerified(casp, 'buyer-clean');
  const old = casp.publicKeys()[0];
  const rev = casp.revokeIssuerKey(old.issuerId, 'key compromise drill');
  assert.equal(inCircuitCheckMessage(pointFromWire(old.publicKey), issuerRevocationMessage(fromHex(old.issuerId)), sigFromWire(rev.signature)), true);
  assert.throws(() => casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' }), /no active issuer key/);
  const fresh = casp.rotateKey();
  const b = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' });
  assert.equal(b.issuerId, fresh.issuerId);
  assert.notEqual(b.issuerId, old.issuerId);
});

test('GDPR erasure: restricted during AML retention, purged afterwards; audit log stays valid', () => {
  const { casp, clock } = makeCasp();
  const { customerId } = onboardVerified(casp, 'buyer-clean');
  const b = casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' });
  assert.equal(casp.requestErasure(customerId).status, 'restricted');
  assert.throws(() => casp.issueAttestation({ customerId, subject: SUBJECT, walletKey: WALLET, role: 'originator' }), /CUSTOMER_RESTRICTED/);
  clock.advance(5 * YEAR + DAY);
  assert.equal(casp.requestErasure(customerId).status, 'erased');
  assert.equal(casp.getCustomer(customerId).profile, undefined);
  assert.throws(() => casp.discloseTravelRule(b.reference, 'notary'), /UNKNOWN_TRAVEL_RULE_RECORD/);
  assert.equal(casp.audit.verify().valid, true);
  const pii = JSON.stringify(casp.audit.all());
  assert.ok(!pii.includes('Testard') && !pii.includes('Camille'), 'audit log must not contain personal data');
});
