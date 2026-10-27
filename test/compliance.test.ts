import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS } from '../src/compliance/personas.js';
import { assessRisk } from '../src/compliance/risk.js';
import { SanctionsScreener, normalizeName } from '../src/compliance/sanctions.js';
import { buildIvms101, travelRuleRefOf, verifyTravelRuleRef } from '../src/compliance/travel-rule.js';
import { loadPolicy, loadSanctions } from '../src/config.js';
import { AuditLog } from '../src/audit/audit-log.js';

const policy = loadPolicy();
const screener = new SanctionsScreener(loadSanctions());

for (const p of Object.values(PERSONAS)) {
  test(`persona ${p.name}: ${p.expected.decision}, KYC level ${p.expected.kycLevel}`, () => {
    const a = assessRisk(p.profile, policy, screener);
    assert.equal(a.decision, p.expected.decision, a.reasons.join('; '));
    assert.equal(a.kycLevel, p.expected.kycLevel);
    assert.ok(a.amlRiskScore >= 0 && a.amlRiskScore <= 255);
  });
}

test('sanctions screening ignores case, accents and word order', () => {
  assert.equal(normalizeName('Sanctionedperson, TÉSTO'), normalizeName('testo sanctionedperson'));
  assert.ok(screener.screen('SANCTIONEDPERSON Testo'));
  assert.equal(screener.screen('Camille Testard'), undefined);
});

test('sanctioned UBO blocks a legal person', () => {
  const p = structuredClone(PERSONAS['buyer-corporate-edd'].profile);
  p.beneficialOwners!.push({ givenName: 'Testo', familyName: 'Sanctionedperson', nationality: 'DE', countryOfResidence: 'DE', pep: false });
  const a = assessRisk(p, policy, screener);
  assert.equal(a.decision, 'reject');
  assert.equal(a.amlRiskScore, 255);
});

test('travel rule ref is deterministic, salted and verifiable', () => {
  const wallet = new Uint8Array(32).fill(7);
  const rec = buildIvms101(PERSONAS['buyer-clean'].profile, 'originator', wallet, 'casp', 1);
  const s1 = new Uint8Array(32).fill(1), s2 = new Uint8Array(32).fill(2);
  assert.ok(verifyTravelRuleRef(rec, s1, travelRuleRefOf(rec, s1)));
  assert.notDeepEqual(travelRuleRefOf(rec, s1), travelRuleRefOf(rec, s2));
  assert.equal(verifyTravelRuleRef({ ...rec, accountNumber: '00' }, s1, travelRuleRefOf(rec, s1)), false);
});

test('audit log detects tampering', () => {
  const log = new AuditLog();
  log.append('a', 'x', { n: 1 }, 1);
  log.append('b', 'x', { n: 2 }, 2);
  log.append('c', 'x', { n: 3 }, 3);
  assert.deepEqual(log.verify(), { valid: true, length: 3 });
  const forged = structuredClone(log.all()) as any[];
  forged[1].data.n = 99;
  assert.equal(log.verify(forged).valid, false);
  assert.equal(log.verify(forged).brokenAt, 1);
});
