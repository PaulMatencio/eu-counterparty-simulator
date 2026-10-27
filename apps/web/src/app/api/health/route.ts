import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET() {
  return withEmbeddedCaspHandler(() => {
    const { casp, clock } = getEmbeddedCasp();
    return {
      ok: true,
      casp: casp.policy.caspName,
      testOnly: true,
      currentTimestamp: clock.now(),
    };
  });
}
