import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET() {
  return withEmbeddedCaspHandler(() => {
    const { casp } = getEmbeddedCasp();
    return {
      casp: casp.policy.caspName,
      keys: casp.publicKeys(),
    };
  });
}
