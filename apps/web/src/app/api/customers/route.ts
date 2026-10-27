import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(req: NextRequest) {
  return withEmbeddedCaspHandler(async () => {
    const body = await req.json();
    const { casp } = getEmbeddedCasp();
    return casp.onboard(body.profile);
  });
}
