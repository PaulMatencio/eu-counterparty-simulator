# EU Counterparty Simulator: design

*2026-10-27. Status: steps 1–2 implemented (shared attestation format and CASP simulator core). Steps 3–4 are planned.*

> **TEST ONLY.** This project simulates the *workflow* of EU regulated counterparties so that Midnight dApps can be tested end to end. It is not a compliance product. Use only synthetic data, and never load real personal data or real sanctions decisions into it.

## 1. Purpose

Midnight dApps such as [conditional-real-estate-escrow-contingency-settlement](https://github.com/PaulMatencio/conditional-real-estate-escrow-contingency-settlement) gate funds on **KYC/AML attestations** signed by a crypto-asset service provider (CASP) and, with shielded custody, settle in a **shielded e-money token (EMT)**. End-to-end tests on `preprod` need both counterparties:

| Counterparty | Real world | Simulated here |
| :--- | :--- | :--- |
| **CASP** (MiCA-authorised) | CDD/EDD, sanctions and PEP screening, self-hosted wallet checks and Travel Rule (Transfer of Funds Regulation), record keeping (AMLR) | Rule engine, fictional sanctions list, `declared` wallet check, simplified IVMS101 records, Schnorr-signed `KycAttestationV1`, revocations, hash-chained audit log, retention and erasure |
| **EMT issuer** (credit institution or EMI) | Issues and redeems a EUR e-money token | *Step 3:* a shielded test-EUR minting contract on `preprod` |

It is a separate project because the CASP is a separate party in production: dApps must reach it only through its API and the shared attestation format, never through its internals. It can also serve other Midnight projects.

## 2. The interface: `KycAttestationV1`

- `compact/KycAttestationV1.compact` is a Compact **module** and the canonical definition of:
  - the `KycAttestation` claims;
  - the Schnorr/Jubjub signature;
  - the signed messages (`kycMessage`, `kycRevocationMessage`, `issuerRevocationMessage`), each with its own domain tag;
  - the in-circuit verifier.
- Relying contracts **vendor** the file byte for byte (`import "KycAttestationV1";`). Both repositories pin its sha256 (`compact/KycAttestationV1.sha256`, checked by `npm run check:module`).
- **Never edit it in place.** A format change is a new module (`KycAttestationV2`) with new domain tags, so an old signature can never verify as a new message.
- `compact/kyc-harness.compact` imports the module. It gives the simulator the exact hash functions of a relying contract (`#kyc-harness` → `pureCircuits`) and an in-circuit verifier for interoperability tests.

## 3. Architecture

```
src/
  attestation/format.ts   KycAttestationV1 hashes (from the compiled harness)
  attestation/wire.ts     JSON bundles <-> witness values (bundleToWitness)
  crypto/schnorr.ts       sign / verify / schnorrReduction witness
  keys/key-store.ts       KeyStore interface; MemoryKeyStore, FileKeyStore (TEST ONLY; HSM/KMS later)
  compliance/             risk rules, sanctions screening, personas, Travel Rule, wallet ownership
  audit/audit-log.ts      hash-chained JSONL, ids and hashes only (no personal data)
  casp/casp-simulator.ts  the CASP workflow
  api/server.ts           REST API (node:http)
  cli.ts                  casp-sim serve | personas
config/policy.json        thresholds and risk points (sample)
config/sanctions-sample.json   fictional entries
```

### CASP workflow

1. **Onboarding:** `POST /customers` runs `assessRisk`:
   - sanctions screening of the customer, legal name and UBOs gives `reject` and score 255 on a hit;
   - risk points for PEP, high-risk country, undocumented source of funds, high volume and complex ownership;
   - **KYC level:** 1 = identity verified, 2 = plus address and documented source of funds, 3 = plus EDD;
   - **decision:** `approve`, `refer` (identity missing, or EDD required but not done) or `reject` (score at or above the threshold).
2. **Re-assessment:** `PATCH /customers/:id` (officer), for example once EDD is completed.
3. **Wallet ownership** (Transfer of Funds Regulation, self-hosted wallets above EUR 1,000): challenge, then proof. Only `declared-test-only` exists today (see §6).
4. **Attestation:** `POST /customers/:id/attestations {subject, walletKey, role}`. This needs an `approve` decision and a verified wallet. It then:
   - builds the IVMS101 record;
   - computes `travelRuleRef = sha256(tag || canonicalJson(record) || salt)`;
   - signs `KycAttestationV1` with a short validity (7 days by default, 90 days at most).
   The response is an `AttestationBundle`; `bundleToWitness(bundle)` gives the relying contract's `kycAttestation()` witness value.
5. **Revocation:**
   - `POST /attestations/:ref/revoke` returns a signed `kycRevocationMessage`;
   - `POST /issuer/keys/:id/revoke` returns a signed `issuerRevocationMessage`, and `POST /issuer/keys/rotate` creates a new key.
   Anyone can submit the bundles on-chain.
6. **Travel Rule disclosure:** `GET /travel-rule/:ref` (notary or officer token) returns the record and salt for verification. Each disclosure is logged.
7. **Retention and erasure:** `POST /customers/:id/erasure`. During the AML retention period (5 years after the last activity) the customer is only `restricted`; afterwards the personal data and Travel Rule records are purged. The audit log is kept, and it contains no personal data.

### Personas (`casp-sim personas`)

| Persona | Expected | Scenario |
| :--- | :--- | :--- |
| `buyer-clean` / `seller-clean` | approve, L2 | Happy path |
| `buyer-corporate-edd` | approve, L3 | SPV with UBOs and high volume, EDD done |
| `buyer-pep-edd` | approve, L3 | PEP with EDD; elevated score (40) |
| `buyer-pep-no-edd` | refer | EDD missing, so no attestation |
| `buyer-high-risk` | reject | PEP + high-risk country + undocumented funds |
| `buyer-sanctioned` | reject, score 255 | Fictional sanctions match |
| `buyer-basic-only` | approve, L1 | Attestation issued, but below an escrow policy of `minKycLevel = 2` |
| `buyer-unverified` | refer | No identity verification |

## 4. Regulatory mapping (what is modelled, and how faithfully)

| Obligation | Source | Simulator |
| :--- | :--- | :--- |
| Customer due diligence, EDD for PEPs and high-risk third countries | AMLD / AMLR | Rule engine with configurable points and thresholds; sample country codes `XA`–`XC` |
| Sanctions screening | EU restrictive measures | Exact token-set match against a **fictional** list (no fuzzy matching or analyst review) |
| Travel Rule data, self-hosted wallet verification | Transfer of Funds Regulation (EU) 2023/1113 | Simplified IVMS101 record and a salted on-chain anchor; wallet check `declared` only |
| Record keeping | AMLR (5 years) | Hash-chained audit log; retention takes priority over erasure |
| Data protection | GDPR | Only salted hashes leave the CASP; erasure purges salts and records after retention |
| CASP authorisation and conduct | MiCA | Out of scope (organisational) |

## 5. Roadmap

1. ✅ **Shared `KycAttestationV1` module**, used by the escrow contract (its 149 simulator checks pass) and by this project.
2. ✅ **CASP simulator core:** library, REST API and 29 tests, including in-circuit verification of every signature kind. A one-off cross-check confirmed that simulator-issued bundles pass the escrow contract's `depositToEscrow`, `submitSellerKyc` and `revokeKycAttestation`.
3. ⏳ **Test-EUR issuer:** a shielded token minting contract (`mintShieldedToken`) with mint and redeem on `preprod`, plus a faucet endpoint for test wallets.
4. ⏳ **Escrow e2e on `preprod`** (in the escrow repo, `e2e/`):
   - headless wallets from the Midnight wallet SDK and test mnemonics;
   - the flow deploy → configure → onboard parties here → `addKycIssuer` from `/.well-known/casp-keys` → accept → finalize → deposit → attestations → seller KYC → release, plus refund and revocation variants;
   - answers the SRS validation items V-1 to V-5.

## 6. Open questions

- **Wallet-ownership proof.** Can a Midnight wallet sign an arbitrary challenge with its shielded coin key through DApp Connector v4? If yes, add a `wallet-signature` verifier. If not, implement `micro-transfer`: the customer sends a tiny shielded amount whose coin carries the challenge, and the CASP checks it arrived.
- **Key custody.** Add a PKCS#11 / cloud-KMS `KeyStore` before sharing the simulator beyond local tests. Jubjub Schnorr is not a standard HSM algorithm, so check what the KMS supports.
- **Sanctions data.** Plug the EU consolidated financial sanctions list feed in only for realistic, non-public test environments, and keep fixtures fictional.
- **Source of funds.** The escrow's R-6 recommends a dedicated attestation claim. That is a `KycAttestationV2` change, to be coordinated across both repositories.
