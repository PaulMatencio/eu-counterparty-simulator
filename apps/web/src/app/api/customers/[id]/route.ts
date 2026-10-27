import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  requireAuthRole,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { id } = await context.params;
    const { casp } = getEmbeddedCasp();
    return casp.getCustomer(id);
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    requireAuthRole(req, ['officer']);
    const { id } = await context.params;
    const body = await req.json();
    const { casp } = getEmbeddedCasp();
    return casp.updateProfile(id, body.profile);
  });
}
