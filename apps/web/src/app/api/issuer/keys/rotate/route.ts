import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(req: NextRequest) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { casp } = getEmbeddedCasp();
    return casp.rotateKey();
  });
}
