import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ ref: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { ref } = await context.params;
    const body = await req.json();
    const { casp } = getEmbeddedCasp();
    return casp.revokeAttestation(ref, body.reason ?? 'unspecified');
  });
}
