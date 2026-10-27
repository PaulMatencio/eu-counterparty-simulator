import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ref: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer', 'notary']);
    const { ref } = await context.params;
    const { casp } = getEmbeddedCasp();
    return casp.getAttestation(ref);
  });
}
