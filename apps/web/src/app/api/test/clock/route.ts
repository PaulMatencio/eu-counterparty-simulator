import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(req: NextRequest) {
  return withEmbeddedCaspHandler(async () => {
    const body = await req.json();
    const seconds = Number(body.advanceSeconds ?? 0);
    const { clock } = getEmbeddedCasp();
    if (Number.isFinite(seconds) && seconds !== 0) {
      clock.advance(Math.floor(seconds));
    }
    return { currentTimestamp: clock.now() };
  });
}
