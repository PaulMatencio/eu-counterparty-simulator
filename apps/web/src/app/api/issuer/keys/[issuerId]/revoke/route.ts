import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ issuerId: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { issuerId } = await context.params;
    const body = await req.json();
    const { casp } = getEmbeddedCasp();
    return casp.revokeIssuerKey(issuerId, body.reason ?? 'unspecified');
  });
}
