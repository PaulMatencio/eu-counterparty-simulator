import * as rt from '@midnight-ntwrk/compact-runtime';
import { Contract, type KycAttestation, type SchnorrSignature } from '#kyc-harness';
import { CaspSimulator } from '../src/casp/casp-simulator.js';
import { loadPolicy, loadSanctions } from '../src/config.js';
import { schnorrReduction } from '../src/crypto/schnorr.js';
import { MemoryKeyStore } from '../src/keys/key-store.js';
import { ManualClock } from '../src/util/clock.js';
import { toHex } from '../src/util/bytes.js';
import type { JubjubPoint } from '../src/attestation/format.js';

export const T0 = 1_800_000_000; // fixed test epoch (unix seconds)

export function makeCasp(clock = new ManualClock(T0)) {
  const casp = new CaspSimulator({ policy: loadPolicy(), sanctions: loadSanctions(), keyStore: new MemoryKeyStore(0x1234567890abcdefn, T0), clock });
  return { casp, clock };
}

export const hex32 = (n: number) => toHex(new Uint8Array(32).fill(n));

/** Runs the harness's in-circuit verifier (the same code a relying contract runs). */
const harness = new Contract<undefined>({
  schnorrReduction: (ctx, c) => [ctx.privateState, schnorrReduction(c)],
});
const initial = harness.initialState(rt.createConstructorContext(undefined, '00'.repeat(32)));
const ADDR = rt.sampleContractAddress();

export function inCircuitCheckAttestation(pk: JubjubPoint, att: KycAttestation, sig: SchnorrSignature): boolean {
  const ctx = rt.createCircuitContext(ADDR, '00'.repeat(32), initial.currentContractState, undefined);
  return harness.circuits.checkAttestation(ctx, pk, att, sig).result;
}

export function inCircuitCheckMessage(pk: JubjubPoint, msg: bigint, sig: SchnorrSignature): boolean {
  const ctx = rt.createCircuitContext(ADDR, '00'.repeat(32), initial.currentContractState, undefined);
  return harness.circuits.checkMessage(ctx, pk, msg, sig).result;
}
