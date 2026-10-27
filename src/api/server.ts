/**
 * REST API of the CASP simulator (node:http, no framework).
 *
 * Public:     GET  /health, GET /.well-known/casp-keys
 * Customer:   POST /customers, POST /customers/:id/wallet-challenge, POST /customers/:id/wallet-proof,
 *             POST /customers/:id/attestations
 * Test:       POST /test/personas/:name/attestation   (one-shot onboarding of a fixture persona)
 * Officer:    GET  /customers/:id, PATCH /customers/:id, POST /attestations/:ref/revoke,
 *             POST /issuer/keys/rotate, POST /issuer/keys/:issuerId/revoke, GET /audit, GET /audit/verify
 * Notary/CASP counterparty: GET /attestations/:ref, GET /travel-rule/:ref
 * Customer rights: POST /customers/:id/erasure
 *
 * Auth (TEST ONLY): bearer tokens from CASP_OFFICER_TOKEN / CASP_NOTARY_TOKEN.
 * Customer endpoints are open, as a real onboarding front end would be behind its own login.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { CaspError, type CaspSimulator } from '../casp/casp-simulator.js';
import { PERSONAS } from '../compliance/personas.js';
import type { TravelRuleRole } from '../compliance/travel-rule.js';

export interface ApiOptions {
  officerToken: string;
  notaryToken: string;
}

type Role = 'officer' | 'notary';
type Handler = (ctx: { params: Record<string, string>; body: any; req: IncomingMessage }) => unknown;
interface Route { method: string; pattern: RegExp; keys: string[]; auth?: Role[]; handler: Handler }

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function createCaspServer(casp: CaspSimulator, opts: ApiOptions): Server {
  const routes: Route[] = [];
  const add = (method: string, path: string, handler: Handler, auth?: Role[]) => {
    const keys: string[] = [];
    const pattern = new RegExp('^' + path.replace(/:([a-zA-Z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    routes.push({ method, pattern, keys, auth, handler });
  };
  const role = (req: IncomingMessage): Role | undefined => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (token && token === opts.officerToken) return 'officer';
    if (token && token === opts.notaryToken) return 'notary';
    return undefined;
  };

  add('GET', '/health', () => ({ ok: true, casp: casp.policy.caspName, testOnly: true }));
  add('GET', '/.well-known/casp-keys', () => ({ casp: casp.policy.caspName, keys: casp.publicKeys() }));

  add('POST', '/customers', ({ body }) => casp.onboard(body.profile));
  add('POST', '/customers/:id/wallet-challenge', ({ params, body }) => casp.createWalletChallenge(params.id, body.walletKey));
  add('POST', '/customers/:id/wallet-proof', ({ params, body }) => casp.submitWalletProof(params.id, body));
  add('POST', '/customers/:id/attestations', ({ params, body }) =>
    casp.issueAttestation({ customerId: params.id, subject: body.subject, walletKey: body.walletKey, role: body.role as TravelRuleRole, validityDays: body.validityDays }));
  add('POST', '/customers/:id/erasure', ({ params }) => casp.requestErasure(params.id));

  add('POST', '/test/personas/:name/attestation', ({ params, body }) => {
    const p = PERSONAS[params.name];
    if (!p) throw new HttpError(404, `unknown persona ${params.name}; known: ${Object.keys(PERSONAS).join(', ')}`);
    const { customerId, assessment } = casp.onboard(p.profile, 'test-harness');
    const ch = casp.createWalletChallenge(customerId, body.walletKey);
    casp.submitWalletProof(customerId, { challengeId: ch.challengeId, evidence: { declared: true } }, 'test-harness');
    if (assessment.decision !== 'approve') return { customerId, assessment, bundle: null };
    const bundle = casp.issueAttestation({ customerId, subject: body.subject, walletKey: body.walletKey, role: body.role ?? 'originator', validityDays: body.validityDays }, 'test-harness');
    return { customerId, assessment, bundle };
  });

  add('GET', '/customers/:id', ({ params }) => casp.getCustomer(params.id), ['officer']);
  add('PATCH', '/customers/:id', ({ params, body }) => casp.updateProfile(params.id, body.profile), ['officer']);
  add('GET', '/attestations/:ref', ({ params }) => casp.getAttestation(params.ref), ['officer', 'notary']);
  add('POST', '/attestations/:ref/revoke', ({ params, body }) => casp.revokeAttestation(params.ref, body.reason ?? 'unspecified'), ['officer']);
  add('POST', '/issuer/keys/rotate', () => casp.rotateKey(), ['officer']);
  add('POST', '/issuer/keys/:issuerId/revoke', ({ params, body }) => casp.revokeIssuerKey(params.issuerId, body.reason ?? 'unspecified'), ['officer']);
  add('GET', '/travel-rule/:ref', ({ params, req }) => casp.discloseTravelRule(params.ref, role(req) ?? 'unknown'), ['officer', 'notary']);
  add('GET', '/audit', () => casp.audit.all(), ['officer']);
  add('GET', '/audit/verify', () => ({ ...casp.audit.verify(), head: casp.audit.head() }), ['officer']);

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
      if (!route) throw new HttpError(404, 'not found');
      if (route.auth && !route.auth.includes(role(req) as Role)) throw new HttpError(401, 'unauthorized');
      const m = url.pathname.match(route.pattern)!;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      let body: any = {};
      if (req.method !== 'GET') {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw.length > 1_000_000) throw new HttpError(413, 'body too large');
        body = raw ? JSON.parse(raw) : {};
      }
      send(res, 200, await route.handler({ params, body, req }));
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      if (e instanceof CaspError) return send(res, 422, { error: e.code, message: e.message });
      if (e instanceof SyntaxError) return send(res, 400, { error: 'invalid JSON' });
      send(res, 400, { error: (e as Error).message });
    }
  });
}
