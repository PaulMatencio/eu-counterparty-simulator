import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    const { id } = await context.params;
    const { casp } = getEmbeddedCasp();
    return casp.requestErasure(id);
  });
}
