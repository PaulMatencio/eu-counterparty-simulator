/**
 * Infrastructure Layer — Midnight.js & Compact `kyc-harness` In-Circuit Verifier Adapter.
 * Executes the compiled `compact/kyc-harness.compact` circuits (`checkAttestation`,
 * `checkMessage`, `pureCircuits`) directly in the browser or Node via `@midnight-ntwrk/compact-runtime`.
 */
import * as rt from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  pureCircuits,
  type KycAttestation,
  type SchnorrSignature,
} from '#kyc-harness';
import type {
  AttestationBundle,
  CircuitVerificationSummary,
  RevocationBundle,
  WirePoint,
} from '@/domain';
import type { ICircuitVerifierPort } from '@/application';
import { bytesToHex, hexToBytes } from '../crypto/casp-crypto.adapter.js';

export const JUBJUB_ORDER =
  0x0e7db4ea6533afa906673b0101343b00a6682093ccc81082d0970e5ed6f72cb7n;
export const TWO_248 = 1n << 248n;

const VEC5_FIELD = new rt.CompactTypeVector(5, rt.CompactTypeField);

export const schnorrReduction = (cFull: bigint): [bigint, bigint] => [
  cFull / TWO_248,
  cFull % TWO_248,
];

function challengeFull(
  announcement: rt.JubjubPoint,
  publicKey: rt.JubjubPoint,
  msg: bigint,
): bigint {
  return rt.transientHash(VEC5_FIELD, [
    rt.jubjubPointX(announcement),
    rt.jubjubPointY(announcement),
    rt.jubjubPointX(publicKey),
    rt.jubjubPointY(publicKey),
    msg,
  ]) as bigint;
}

function verifyOffChainSchnorr(
  publicKey: rt.JubjubPoint,
  msg: bigint,
  sig: SchnorrSignature,
): boolean {
  if (rt.jubjubPointX(publicKey) === 0n && rt.jubjubPointY(publicKey) === 1n) {
    return false;
  }
  const c = challengeFull(sig.announcement, publicKey, msg) % TWO_248;
  const lhs = rt.ecMulGenerator(sig.response);
  const rhs = rt.ecAdd(sig.announcement, rt.ecMul(publicKey, c));
  return (
    rt.jubjubPointX(lhs) === rt.jubjubPointX(rhs) &&
    rt.jubjubPointY(lhs) === rt.jubjubPointY(rhs)
  );
}

const harness = new Contract<undefined>({
  schnorrReduction: (ctx, c) => [ctx.privateState, schnorrReduction(c)],
});
const initialHarnessState = harness.initialState(
  rt.createConstructorContext(undefined, '00'.repeat(32)),
);
const SAMPLE_CONTRACT_ADDR = rt.sampleContractAddress();

export class KycHarnessCircuitAdapter implements ICircuitVerifierPort {
  async verifyAttestationBundle(
    bundle: AttestationBundle,
  ): Promise<CircuitVerificationSummary> {
    const pk: rt.JubjubPoint = {
      x: BigInt(bundle.issuerPublicKey.x),
      y: BigInt(bundle.issuerPublicKey.y),
    };
    const w = bundle.attestation;
    const att: KycAttestation = {
      subject: hexToBytes(w.subject, 32),
      wallet: { bytes: hexToBytes(w.wallet, 32) },
      kycLevel: BigInt(w.kycLevel),
      amlRiskScore: BigInt(w.amlRiskScore),
      validUntil: BigInt(w.validUntil),
      travelRuleRef: hexToBytes(w.travelRuleRef, 32),
      salt: hexToBytes(w.salt, 32),
    };
    const sig: SchnorrSignature = {
      announcement: {
        x: BigInt(bundle.signature.announcement.x),
        y: BigInt(bundle.signature.announcement.y),
      },
      response: BigInt(bundle.signature.response),
    };

    const computedKycReference = bytesToHex(pureCircuits.kycReference(att));
    const msg = pureCircuits.kycMessage(att);
    const verifiedOffChain = verifyOffChainSchnorr(pk, msg, sig);

    let verifiedInCircuit = false;
    try {
      const ctx = rt.createCircuitContext(
        SAMPLE_CONTRACT_ADDR,
        '00'.repeat(32),
        initialHarnessState.currentContractState,
        undefined,
      );
      verifiedInCircuit = harness.circuits.checkAttestation(ctx, pk, att, sig).result;
    } catch {
      verifiedInCircuit = false;
    }

    return {
      verifiedInCircuit,
      verifiedOffChain,
      computedKycReference,
      referenceMatches:
        computedKycReference.toLowerCase() === bundle.reference.toLowerCase(),
      checkedAt: Math.floor(Date.now() / 1000),
    };
  }

  async verifyRevocationBundle(
    revocation: RevocationBundle,
    issuerPublicKey: WirePoint,
  ): Promise<{ verifiedInCircuit: boolean; verifiedOffChain: boolean }> {
    const pk: rt.JubjubPoint = {
      x: BigInt(issuerPublicKey.x),
      y: BigInt(issuerPublicKey.y),
    };
    const sig: SchnorrSignature = {
      announcement: {
        x: BigInt(revocation.signature.announcement.x),
        y: BigInt(revocation.signature.announcement.y),
      },
      response: BigInt(revocation.signature.response),
    };

    const msg =
      revocation.kind === 'attestation'
        ? pureCircuits.kycRevocationMessage(hexToBytes(revocation.reference ?? '', 32))
        : pureCircuits.issuerRevocationMessage(hexToBytes(revocation.issuerId, 32));

    const verifiedOffChain = verifyOffChainSchnorr(pk, msg, sig);

    let verifiedInCircuit = false;
    try {
      const ctx = rt.createCircuitContext(
        SAMPLE_CONTRACT_ADDR,
        '00'.repeat(32),
        initialHarnessState.currentContractState,
        undefined,
      );
      verifiedInCircuit = harness.circuits.checkMessage(ctx, pk, msg, sig).result;
    } catch {
      verifiedInCircuit = false;
    }

    return { verifiedInCircuit, verifiedOffChain };
  }
}
