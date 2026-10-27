import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    const { id } = await context.params;
    const body = await req.json();
    const { casp } = getEmbeddedCasp();
    return casp.issueAttestation({
      customerId: id,
      subject: body.subject,
      walletKey: body.walletKey,
      role: body.role,
      validityDays: body.validityDays,
    });
  });
}
