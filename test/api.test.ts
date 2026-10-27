import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createCaspServer } from '../src/api/server.js';
import { bundleToWitness, pointFromWire, type AttestationBundle } from '../src/attestation/wire.js';
import { hex32, inCircuitCheckAttestation, makeCasp } from './helpers.js';

let server: Server;
let base = '';
const OFFICER = 'officer-test-token', NOTARY = 'notary-test-token';

before(async () => {
  const { casp } = makeCasp();
  server = createCaspServer(casp, { officerToken: OFFICER, notaryToken: NOTARY });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const call = async (method: string, path: string, body?: unknown, token?: string) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as any };
};

test('well-known keys are public', async () => {
  const r = await call('GET', '/.well-known/casp-keys');
  assert.equal(r.status, 200);
  assert.equal(r.json.keys[0].status, 'active');
  assert.equal(r.json.keys[0].format, 'KycAttestationV1');
});

test('full customer flow over HTTP, bundle verifies in-circuit', async () => {
  const wallet = hex32(0x65);
  const { json: onb } = await call('POST', '/customers', { profile: (await import('../src/compliance/personas.js')).PERSONAS['buyer-clean'].profile });
  assert.equal(onb.assessment.decision, 'approve');
  const { json: ch } = await call('POST', `/customers/${onb.customerId}/wallet-challenge`, { walletKey: wallet });
  const { json: pr } = await call('POST', `/customers/${onb.customerId}/wallet-proof`, { challengeId: ch.challengeId, evidence: { declared: true } });
  assert.equal(pr.verified, true);
  const { status, json: bundle } = await call('POST', `/customers/${onb.customerId}/attestations`, { subject: hex32(0x11), walletKey: wallet, role: 'originator' });
  assert.equal(status, 200);
  const [att, sig] = bundleToWitness(bundle as AttestationBundle);
  assert.equal(inCircuitCheckAttestation(pointFromWire(bundle.issuerPublicKey), att, sig), true);

  assert.equal((await call('GET', `/attestations/${bundle.reference}`)).status, 401);
  assert.equal((await call('GET', `/attestations/${bundle.reference}`, undefined, NOTARY)).json.status, 'active');
  assert.equal((await call('GET', `/travel-rule/${bundle.reference}`, undefined, NOTARY)).json.record.role, 'originator');
  assert.equal((await call('POST', `/attestations/${bundle.reference}/revoke`, { reason: 'x' }, NOTARY)).status, 401);
  const rev = await call('POST', `/attestations/${bundle.reference}/revoke`, { reason: 'test' }, OFFICER);
  assert.equal(rev.json.kind, 'attestation');
  assert.equal((await call('GET', '/audit/verify', undefined, OFFICER)).json.valid, true);
});

test('persona shortcut: approved and rejected personas', async () => {
  const ok = await call('POST', '/test/personas/seller-clean/attestation', { subject: hex32(0x12), walletKey: hex32(0x66), role: 'beneficiary' });
  assert.equal(ok.json.bundle.attestation.kycLevel, 2);
  const ko = await call('POST', '/test/personas/buyer-sanctioned/attestation', { subject: hex32(0x13), walletKey: hex32(0x67) });
  assert.equal(ko.json.bundle, null);
  assert.equal(ko.json.assessment.sanctionsHit, true);
  assert.equal((await call('POST', '/test/personas/nobody/attestation', {})).status, 404);
});

test('errors are explicit', async () => {
  const r = await call('POST', '/customers/unknown/attestations', { subject: hex32(1), walletKey: hex32(2), role: 'originator' });
  assert.equal(r.status, 422);
  assert.equal(r.json.error, 'UNKNOWN_CUSTOMER');
});
