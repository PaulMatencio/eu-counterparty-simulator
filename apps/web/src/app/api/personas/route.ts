import {
  getEmbeddedCasp,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function GET() {
  return withEmbeddedCaspHandler(() => {
    const { personas } = getEmbeddedCasp();
    return {
      personas: Object.values(personas),
    };
  });
}
