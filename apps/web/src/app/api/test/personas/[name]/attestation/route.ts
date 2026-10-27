import type { NextRequest } from 'next/server';
import {
  getEmbeddedCasp,
  HttpApiError,
  withEmbeddedCaspHandler,
} from '@/infrastructure/tooling/embedded-casp-singleton.server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  return withEmbeddedCaspHandler(async () => {
    const { name } = await context.params;
    const body = await req.json();
    const { casp, personas } = getEmbeddedCasp();
    const persona = personas[name];
    if (!persona) {
      throw new HttpApiError(
        404,
        'UNKNOWN_PERSONA',
        `Unknown persona ${name}; known: ${Object.keys(personas).join(', ')}`,
      );
    }

    const { customerId, assessment } = casp.onboard(persona.profile, 'test-harness');
    const ch = casp.createWalletChallenge(customerId, body.walletKey);
    casp.submitWalletProof(
      customerId,
      { challengeId: ch.challengeId, evidence: { declared: true } },
      'test-harness',
    );
    if (assessment.decision !== 'approve') {
      return { customerId, assessment, bundle: null };
    }
    const bundle = casp.issueAttestation(
      {
        customerId,
        subject: body.subject,
        walletKey: body.walletKey,
        role: body.role ?? 'originator',
        validityDays: body.validityDays,
      },
      'test-harness',
    );
    return { customerId, assessment, bundle };
  });
}
