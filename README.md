# EU Counterparty Simulator

> **TEST ONLY: synthetic data only.** This project simulates the KYC/AML attestation workflow of a MiCA-authorised CASP so Midnight dApps can be tested end to end. It is not a compliance product.

It issues **`KycAttestationV1`** attestations (Schnorr over Jubjub) that Midnight contracts verify in zero knowledge, along with Travel Rule anchors, signed revocations and a tamper-evident audit log. Built for, and cross-checked against, [conditional-real-estate-escrow-contingency-settlement](https://github.com/PaulMatencio/conditional-real-estate-escrow-contingency-settlement).

The design, regulatory mapping and roadmap are in [`docs/DESIGN.md`](docs/DESIGN.md).

## Requirements

- Node.js ≥ 22
- Compact toolchain with compiler 0.31.1 (`compact update 0.31.1`)

## Quick start

```sh
npm install
npm run compile:compact     # compact/KycAttestationV1 + harness -> compact/managed/kyc-harness
npm test                    # module hash check, build, 29 tests
npm start                   # http://127.0.0.1:8787, prints officer and notary tokens
node dist/src/cli.js personas
```

Set `CASP_OFFICER_TOKEN` / `CASP_NOTARY_TOKEN` to fix the tokens. State, issuer keys (plain JSON, mode 0600, **test only**) and the audit log go to `./data` (`--data` to change).

## Issue an attestation for a test persona

```sh
curl -s -X POST localhost:8787/test/personas/buyer-clean/attestation \
  -H 'content-type: application/json' \
  -d '{"subject":"<buyer roleId hex>","walletKey":"<buyer shielded coin public key hex>","role":"originator"}'
```

In the relying dApp, return `bundleToWitness(bundle)` from its `kycAttestation` witness, and `schnorrReduction(c)` from its `schnorrReduction` witness. Both are exported by this package.

## API

| Method & path | Auth | Purpose |
| :--- | :--- | :--- |
| `GET /health`, `GET /.well-known/casp-keys` | – | Liveness; issuer ids and public keys (for `addKycIssuer`) |
| `POST /customers` | – | Onboard a profile, returning the due-diligence assessment |
| `POST /customers/:id/wallet-challenge`, `/wallet-proof` | – | Self-hosted wallet ownership |
| `POST /customers/:id/attestations` | – | Issue a signed `KycAttestationV1` bundle |
| `POST /customers/:id/erasure` | – | GDPR erasure request (restricted during retention) |
| `POST /test/personas/:name/attestation` | – | One-shot onboarding of a fixture persona |
| `GET /customers/:id`, `PATCH /customers/:id` | officer | Inspect a customer; re-assess (e.g. EDD done) |
| `POST /attestations/:ref/revoke` | officer | Signed attestation revocation |
| `POST /issuer/keys/rotate`, `POST /issuer/keys/:id/revoke` | officer | Key rotation; signed key self-revocation |
| `GET /audit`, `GET /audit/verify` | officer | Audit log and chain verification |
| `GET /attestations/:ref`, `GET /travel-rule/:ref` | officer, notary | Status; Travel Rule record + salt |

## The shared format

`compact/KycAttestationV1.compact` is the canonical definition. Relying contracts vendor it byte for byte and pin its sha256, which `npm run check:module` checks. Changing the format means creating `KycAttestationV2`, never editing V1.
