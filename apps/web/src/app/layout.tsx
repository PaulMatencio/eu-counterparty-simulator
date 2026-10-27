import type { Metadata } from 'next';
import '@/presentation/styles/midnight-theme.css';
import { AppDependenciesProvider } from '@/presentation/providers/dependency-injection.provider';

export const metadata: Metadata = {
  title: 'EU Counterparty Simulator — MiCA CASP Workbench (TEST ONLY)',
  description:
    'TEST-ONLY simulator of EU regulated counterparties (MiCA CASP: KYC/AML, IVMS101 Travel Rule, KycAttestationV1 signing and revocation) for Midnight dApps.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppDependenciesProvider>{children}</AppDependenciesProvider>
      </body>
    </html>
  );
}
