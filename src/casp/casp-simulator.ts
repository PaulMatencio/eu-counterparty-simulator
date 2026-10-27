/**
 * CASP simulator (TEST ONLY): models the workflow of a MiCA-authorised CASP
 * acting as KYC/AML attestation issuer for Midnight contracts:
 *   onboarding (CDD/EDD, sanctions, PEP, country risk, source of funds)
 *   -> self-hosted wallet ownership check (Transfer of Funds Regulation)
 *   -> Travel Rule record + salted commitment
 *   -> signed KycAttestationV1 (short validity)
 *   -> revocation of attestations and of the CASP's own key
 *   -> tamper-evident audit log, retention vs GDPR erasure.
 * It is NOT a compliance product and must only ever see synthetic data.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { kycReference, kycMessage, kycRevocationMessage, issuerRevocationMessage, type KycAttestation } from '../attestation/format.js';
import { attestationToWire, pointToWire, sigToWire, type AttestationBundle, type RevocationBundle } from '../attestation/wire.js';
import { AuditLog } from '../audit/audit-log.js';
import { assessRisk } from '../compliance/risk.js';
import { SanctionsScreener } from '../compliance/sanctions.js';
import { buildIvms101, travelRuleRefOf, type Ivms101Record, type TravelRuleRole } from '../compliance/travel-rule.js';
import type { CustomerProfile, Policy, RiskAssessment, SanctionsEntry } from '../compliance/types.js';
import { DeclaredWalletOwnership, type OwnershipProof, type WalletChallenge, type WalletOwnershipVerifier } from '../compliance/wallet-ownership.js';
import type { KeyStore } from '../keys/key-store.js';
import { DAY, systemClock, type Clock } from '../util/clock.js';
import { fromHex, randomBytes32, toHex } from '../util/bytes.js';

export type CustomerStatus = 'active' | 'restricted' | 'erased';

export interface CustomerRecord {
  id: string;
  status: CustomerStatus;
  profile?: CustomerProfile;
  assessment: RiskAssessment;
  wallets: Record<string, { verified: boolean; method: string; verifiedAt?: number }>;
  createdAt: number;
  lastActivityAt: number;
}

export interface AttestationRecord {
  reference: string;
  customerId: string;
  issuerId: string;
  role: TravelRuleRole;
  subject: string;
  wallet: string;
  kycLevel: number;
  validUntil: number;
  issuedAt: number;
  status: 'active' | 'revoked';
  revokedAt?: number;
  revocationReason?: string;
  travelRule?: { record: Ivms101Record; salt: string };
}

export class CaspError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

export interface CaspOptions {
  policy: Policy;
  sanctions: SanctionsEntry[];
  keyStore: KeyStore;
  clock?: Clock;
  ownership?: WalletOwnershipVerifier;
  /** Directory for state.json and audit.jsonl; in-memory only when omitted. */
  dataDir?: string;
}

/** WalletChallenge with bytes as hex, for JSON persistence. */
type StoredChallenge = Omit<WalletChallenge, 'walletKey' | 'nonce'> & { walletKey: string; nonce: string };

interface State {
  customers: Record<string, CustomerRecord>;
  attestations: Record<string, AttestationRecord>;
  challenges: Record<string, StoredChallenge>;
}

export class CaspSimulator {
  readonly policy: Policy;
  readonly audit: AuditLog;
  private readonly clock: Clock;
  private readonly screener: SanctionsScreener;
  private readonly ownership: WalletOwnershipVerifier;
  private readonly keys: KeyStore;
  private state: State = { customers: {}, attestations: {}, challenges: {} };

  constructor(private readonly opts: CaspOptions) {
    this.policy = opts.policy;
    this.clock = opts.clock ?? systemClock;
    this.screener = new SanctionsScreener(opts.sanctions);
    this.ownership = opts.ownership ?? new DeclaredWalletOwnership();
    this.keys = opts.keyStore;
    this.audit = new AuditLog(opts.dataDir ? join(opts.dataDir, 'audit.jsonl') : undefined);
    if (opts.dataDir && existsSync(join(opts.dataDir, 'state.json'))) {
      this.state = JSON.parse(readFileSync(join(opts.dataDir, 'state.json'), 'utf8'));
    }
  }

  private now(): number {
    return this.clock.now();
  }

  private save(): void {
    if (!this.opts.dataDir) return;
    mkdirSync(this.opts.dataDir, { recursive: true });
    writeFileSync(join(this.opts.dataDir, 'state.json'), JSON.stringify(this.state, null, 2), { mode: 0o600 });
  }

  private customer(id: string): CustomerRecord {
    const c = this.state.customers[id];
    if (!c) throw new CaspError('UNKNOWN_CUSTOMER', id);
    return c;
  }

  private activeCustomer(id: string): CustomerRecord {
    const c = this.customer(id);
    if (c.status !== 'active') throw new CaspError('CUSTOMER_RESTRICTED', `customer is ${c.status}`);
    return c;
  }

  // ---------------------------------------------------------------- keys
  publicKeys() {
    return this.keys.keys().map((k) => ({
      issuerId: toHex(k.issuerId),
      publicKey: pointToWire(k.publicKey),
      status: k.status,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
      format: 'KycAttestationV1',
    }));
  }

  rotateKey(actor = 'casp-admin') {
    const k = this.keys.rotate(this.now());
    this.audit.append('issuer.key-rotated', actor, { issuerId: toHex(k.issuerId) }, this.now());
    return { issuerId: toHex(k.issuerId), publicKey: pointToWire(k.publicKey) };
  }

  // ---------------------------------------------------------- onboarding
  onboard(profile: CustomerProfile, actor = 'customer'): { customerId: string; assessment: RiskAssessment } {
    const id = toHex(randomBytes32()).slice(0, 24);
    const assessment = assessRisk(profile, this.policy, this.screener);
    const now = this.now();
    this.state.customers[id] = { id, status: 'active', profile, assessment, wallets: {}, createdAt: now, lastActivityAt: now };
    this.audit.append('customer.onboarded', actor, {
      customerId: id, type: profile.type, decision: assessment.decision, kycLevel: assessment.kycLevel,
      amlRiskScore: assessment.amlRiskScore, factors: assessment.factors.map((f) => f.code), sanctionsHit: assessment.sanctionsHit,
    }, now);
    this.save();
    return { customerId: id, assessment };
  }

  /** Re-run due diligence after new evidence (e.g. EDD completed). */
  updateProfile(customerId: string, patch: Partial<CustomerProfile>, actor = 'casp-analyst'): RiskAssessment {
    const c = this.activeCustomer(customerId);
    c.profile = { ...c.profile!, ...patch };
    c.assessment = assessRisk(c.profile, this.policy, this.screener);
    c.lastActivityAt = this.now();
    this.audit.append('customer.reassessed', actor, {
      customerId, decision: c.assessment.decision, kycLevel: c.assessment.kycLevel, amlRiskScore: c.assessment.amlRiskScore,
    }, this.now());
    this.save();
    return c.assessment;
  }

  getCustomer(customerId: string): CustomerRecord {
    return this.customer(customerId);
  }

  // ------------------------------------------------------ wallet ownership
  createWalletChallenge(customerId: string, walletKeyHex: string) {
    this.activeCustomer(customerId);
    const ch = this.ownership.createChallenge(customerId, fromHex(walletKeyHex, 32), this.now());
    this.state.challenges[ch.challengeId] = { ...ch, walletKey: toHex(ch.walletKey), nonce: toHex(ch.nonce) };
    this.save();
    return { challengeId: ch.challengeId, method: ch.method, nonce: toHex(ch.nonce), expiresAt: ch.expiresAt };
  }

  submitWalletProof(customerId: string, proof: OwnershipProof, actor = 'customer'): { verified: boolean; reason?: string } {
    const c = this.activeCustomer(customerId);
    const stored = this.state.challenges[proof.challengeId];
    if (!stored || stored.customerId !== customerId) throw new CaspError('UNKNOWN_CHALLENGE', proof.challengeId);
    const ch: WalletChallenge = { ...stored, walletKey: fromHex(stored.walletKey), nonce: fromHex(stored.nonce) };
    const result = this.ownership.verify(ch, proof, this.now());
    if (result.verified) {
      c.wallets[stored.walletKey] = { verified: true, method: ch.method, verifiedAt: this.now() };
      delete this.state.challenges[proof.challengeId];
      c.lastActivityAt = this.now();
    }
    this.audit.append('wallet.ownership-checked', actor, {
      customerId, walletHash: stored.walletKey.slice(0, 16), method: ch.method, verified: result.verified, reason: result.reason,
    }, this.now());
    this.save();
    return result;
  }

  // --------------------------------------------------------- attestations
  issueAttestation(req: {
    customerId: string;
    /** Role id of the customer in the relying contract (roleIdOf(secret)), hex. */
    subject: string;
    /** Shielded coin public key the attestation binds (payout key), hex. */
    walletKey: string;
    role: TravelRuleRole;
    validityDays?: number;
  }, actor = 'casp-officer'): AttestationBundle {
    const c = this.activeCustomer(req.customerId);
    const a = c.assessment;
    if (a.decision !== 'approve') throw new CaspError('NOT_APPROVED', `due diligence decision is ${a.decision}: ${a.reasons.join('; ')}`);
    if (a.kycLevel < 1) throw new CaspError('NOT_APPROVED', 'identity not verified');
    const walletHex = req.walletKey.toLowerCase().replace(/^0x/, '');
    if (!c.wallets[walletHex]?.verified) throw new CaspError('WALLET_NOT_VERIFIED', 'verify ownership of this wallet first');

    const now = this.now();
    const days = Math.min(req.validityDays ?? this.policy.attestationValidityDays, 90);
    const record = buildIvms101(c.profile!, req.role, fromHex(walletHex, 32), this.policy.caspName, now);
    const trSalt = randomBytes32();
    const attestation: KycAttestation = {
      subject: fromHex(req.subject, 32),
      wallet: { bytes: fromHex(walletHex, 32) },
      kycLevel: BigInt(a.kycLevel),
      amlRiskScore: BigInt(a.amlRiskScore),
      validUntil: BigInt(now + days * DAY),
      travelRuleRef: travelRuleRefOf(record, trSalt),
      salt: randomBytes32(),
    };
    const key = this.keys.activeKey();
    const signature = this.keys.sign(key.issuerId, kycMessage(attestation));
    const reference = toHex(kycReference(attestation));
    const issuerId = toHex(key.issuerId);

    this.state.attestations[reference] = {
      reference, customerId: c.id, issuerId, role: req.role, subject: toHex(attestation.subject), wallet: walletHex,
      kycLevel: a.kycLevel, validUntil: Number(attestation.validUntil), issuedAt: now, status: 'active',
      travelRule: { record, salt: toHex(trSalt) },
    };
    c.lastActivityAt = now;
    this.audit.append('attestation.issued', actor, {
      reference, customerId: c.id, issuerId, role: req.role, kycLevel: a.kycLevel, validUntil: Number(attestation.validUntil),
      travelRuleRef: toHex(attestation.travelRuleRef),
    }, now);
    this.save();
    return {
      format: 'KycAttestationV1', issuerId, issuerPublicKey: pointToWire(key.publicKey),
      attestation: attestationToWire(attestation), signature: sigToWire(signature), reference, issuedAt: now,
    };
  }

  getAttestation(reference: string): Omit<AttestationRecord, 'travelRule'> {
    const r = this.state.attestations[reference];
    if (!r) throw new CaspError('UNKNOWN_ATTESTATION', reference);
    const { travelRule: _omit, ...pub } = r;
    return { ...pub, status: r.status === 'active' && r.validUntil <= this.now() ? ('expired' as any) : r.status };
  }

  /** Signed revocation; anyone can then submit it on-chain (revokeKycAttestation). */
  revokeAttestation(reference: string, reason: string, actor = 'casp-officer'): RevocationBundle {
    const r = this.state.attestations[reference];
    if (!r) throw new CaspError('UNKNOWN_ATTESTATION', reference);
    const ref = fromHex(reference, 32);
    const signature = this.keys.signSelfRevocation(fromHex(r.issuerId, 32), kycRevocationMessage(ref));
    r.status = 'revoked';
    r.revokedAt = this.now();
    r.revocationReason = reason;
    this.audit.append('attestation.revoked', actor, { reference, issuerId: r.issuerId, reason }, this.now());
    this.save();
    return { format: 'KycAttestationV1', kind: 'attestation', issuerId: r.issuerId, reference, signature: sigToWire(signature), reason, issuedAt: this.now() };
  }

  /** The CASP withdraws one of its keys (compromise, licence withdrawn). */
  revokeIssuerKey(issuerIdHex: string, reason: string, actor = 'casp-admin'): RevocationBundle {
    const issuerId = fromHex(issuerIdHex, 32);
    const signature = this.keys.signSelfRevocation(issuerId, issuerRevocationMessage(issuerId));
    this.keys.markRevoked(issuerId, this.now());
    this.audit.append('issuer.key-revoked', actor, { issuerId: issuerIdHex, reason }, this.now());
    this.save();
    return { format: 'KycAttestationV1', kind: 'issuer', issuerId: issuerIdHex, signature: sigToWire(signature), reason, issuedAt: this.now() };
  }

  // ---------------------------------------------------------- Travel Rule
  /** Discloses a Travel Rule record (+ salt) to an authorised recipient. */
  discloseTravelRule(reference: string, recipient: string) {
    const r = this.state.attestations[reference];
    if (!r?.travelRule) throw new CaspError('UNKNOWN_TRAVEL_RULE_RECORD', reference);
    this.audit.append('travel-rule.disclosed', 'casp-officer', { reference, recipient }, this.now());
    return { reference, record: r.travelRule.record, salt: r.travelRule.salt };
  }

  // ------------------------------------------------- retention / erasure
  /**
   * GDPR erasure request. AML record-keeping (5 years after the end of the
   * relationship) prevails: inside the retention period the customer is only
   * restricted; afterwards personal data and Travel Rule records are purged.
   * The audit log (ids and hashes only) is kept.
   */
  requestErasure(customerId: string, actor = 'customer'): { status: CustomerStatus; retainedUntil: number } {
    const c = this.customer(customerId);
    const retainedUntil = c.lastActivityAt + this.policy.retentionYears * 365 * DAY;
    if (this.now() < retainedUntil) {
      c.status = 'restricted';
    } else {
      c.status = 'erased';
      delete c.profile;
      for (const r of Object.values(this.state.attestations)) if (r.customerId === customerId) delete r.travelRule;
    }
    this.audit.append('customer.erasure-requested', actor, { customerId, outcome: c.status, retainedUntil }, this.now());
    this.save();
    return { status: c.status, retainedUntil };
  }
}
