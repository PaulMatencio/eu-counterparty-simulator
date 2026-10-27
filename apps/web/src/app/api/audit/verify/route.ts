import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET(req: NextRequest) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { casp } = getEmbeddedCasp();
    return {
      ...casp.audit.verify(),
      head: casp.audit.head(),
    };
  });
}
