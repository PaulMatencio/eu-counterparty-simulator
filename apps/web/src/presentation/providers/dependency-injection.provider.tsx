'use client';

/**
 * Presentation Layer — Composition Root & Dependency Injection Provider.
 * This is the ONLY file in `src/presentation` that instantiates concrete adapters
 * from `src/infrastructure` and binds them to `src/application` ports & use-cases.
 */
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import type {
  CaspBackendMode,
  ConnectedWalletInfo,
} from '@/domain';
import {
  DiscloseAndVerifyTravelRuleUseCase,
  IssueAttestationUseCase,
  OfficerComplianceUseCase,
  OnboardCustomerUseCase,
  QuickOnboardPersonaUseCase,
  RequestGdprErasureUseCase,
  VerifyWalletOwnershipUseCase,
  type ICaspGateway,
  type ICircuitVerifierPort,
  type ICryptoPort,
  type IIndexerPort,
  type IStoragePort,
  type IWalletPort,
  type PersistedSessionState,
} from '@/application';
import {
  BrowserStorageAdapter,
  CaspCryptoAdapter,
  DEFAULT_SESSION_STATE,
  HttpCaspGatewayAdapter,
  KycHarnessCircuitAdapter,
  MidnightIndexerAdapter,
  MidnightWalletAdapter,
  SIMULATED_WALLET_PRESETS,
} from '@/infrastructure';
import {
  TRANSLATIONS,
  type SupportedLocale,
  type TranslationDictionary,
} from '../i18n/config.js';

export interface AppDependencies {
  // Ports
  caspGateway: ICaspGateway;
  walletPort: IWalletPort;
  circuitVerifier: ICircuitVerifierPort;
  cryptoPort: ICryptoPort;
  storagePort: IStoragePort;
  indexerPort: IIndexerPort;

  // Use-Cases
  onboardCustomerUseCase: OnboardCustomerUseCase;
  requestGdprErasureUseCase: RequestGdprErasureUseCase;
  quickOnboardPersonaUseCase: QuickOnboardPersonaUseCase;
  verifyWalletOwnershipUseCase: VerifyWalletOwnershipUseCase;
  issueAttestationUseCase: IssueAttestationUseCase;
  officerComplianceUseCase: OfficerComplianceUseCase;
  discloseAndVerifyTravelRuleUseCase: DiscloseAndVerifyTravelRuleUseCase;

  // Reactive Session & Wallet State
  session: PersistedSessionState;
  updateSession: (patch: Partial<PersistedSessionState>) => void;
  setBackendMode: (mode: CaspBackendMode) => void;
  wallet: ConnectedWalletInfo;
  setWallet: React.Dispatch<React.SetStateAction<ConnectedWalletInfo>>;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslationDictionary;
}

const AppDependenciesContext = createContext<AppDependencies | null>(null);

export const WALLET_PRESETS = SIMULATED_WALLET_PRESETS;

export function AppDependenciesProvider({
  children,
  overridePorts,
}: {
  children: React.ReactNode;
  overridePorts?: Partial<{
    caspGateway: ICaspGateway;
    walletPort: IWalletPort;
    circuitVerifier: ICircuitVerifierPort;
    cryptoPort: ICryptoPort;
    storagePort: IStoragePort;
    indexerPort: IIndexerPort;
  }>;
}) {
  const storagePort = useMemo<IStoragePort>(
    () => overridePorts?.storagePort ?? new BrowserStorageAdapter(),
    [overridePorts?.storagePort],
  );

  const [session, setSession] = useState<PersistedSessionState>(DEFAULT_SESSION_STATE);
  const [wallet, setWallet] = useState<ConnectedWalletInfo>({
    mode: 'simulated',
    walletName: SIMULATED_WALLET_PRESETS.buyer.label,
    networkId: 'undeployed',
    shieldedCoinPublicKeyHex: SIMULATED_WALLET_PRESETS.buyer.walletKeyHex,
    subjectRoleIdHex: SIMULATED_WALLET_PRESETS.buyer.subjectRoleIdHex,
    shieldedAddressBech32m: `mn_shield-addr_test1${SIMULATED_WALLET_PRESETS.buyer.walletKeyHex.slice(0, 24)}`,
  });

  useEffect(() => {
    setSession(storagePort.loadSession());
  }, [storagePort]);

  const updateSession = (patch: Partial<PersistedSessionState>) => {
    const next = storagePort.saveSession(patch);
    setSession(next);
  };

  const setBackendMode = (mode: CaspBackendMode) => {
    updateSession({ backendMode: mode });
  };

  const setLocale = (locale: SupportedLocale) => {
    updateSession({ locale });
  };

  const walletPort = useMemo<IWalletPort>(
    () => overridePorts?.walletPort ?? new MidnightWalletAdapter(),
    [overridePorts?.walletPort],
  );

  const circuitVerifier = useMemo<ICircuitVerifierPort>(
    () => overridePorts?.circuitVerifier ?? new KycHarnessCircuitAdapter(),
    [overridePorts?.circuitVerifier],
  );

  const cryptoPort = useMemo<ICryptoPort>(
    () => overridePorts?.cryptoPort ?? new CaspCryptoAdapter(),
    [overridePorts?.cryptoPort],
  );

  const indexerPort = useMemo<IIndexerPort>(
    () => overridePorts?.indexerPort ?? new MidnightIndexerAdapter(),
    [overridePorts?.indexerPort],
  );

  const caspGateway = useMemo<ICaspGateway>(() => {
    if (overridePorts?.caspGateway) return overridePorts.caspGateway;
    const baseUrl =
      session.backendMode === 'embedded' ? '/api' : session.externalBaseUrl;
    return new HttpCaspGatewayAdapter({
      baseUrl,
      defaultOfficerToken: session.officerToken,
      defaultNotaryToken: session.notaryToken,
    });
  }, [
    overridePorts?.caspGateway,
    session.backendMode,
    session.externalBaseUrl,
    session.officerToken,
    session.notaryToken,
  ]);

  const useCases = useMemo(() => {
    return {
      onboardCustomerUseCase: new OnboardCustomerUseCase(caspGateway, storagePort),
      requestGdprErasureUseCase: new RequestGdprErasureUseCase(caspGateway),
      quickOnboardPersonaUseCase: new QuickOnboardPersonaUseCase(
        caspGateway,
        circuitVerifier,
        cryptoPort,
        storagePort,
      ),
      verifyWalletOwnershipUseCase: new VerifyWalletOwnershipUseCase(caspGateway),
      issueAttestationUseCase: new IssueAttestationUseCase(
        caspGateway,
        circuitVerifier,
        cryptoPort,
        storagePort,
      ),
      officerComplianceUseCase: new OfficerComplianceUseCase(
        caspGateway,
        circuitVerifier,
        storagePort,
      ),
      discloseAndVerifyTravelRuleUseCase: new DiscloseAndVerifyTravelRuleUseCase(
        caspGateway,
        cryptoPort,
        storagePort,
      ),
    };
  }, [caspGateway, circuitVerifier, cryptoPort, storagePort]);

  const locale = session.locale ?? 'en';
  const t = TRANSLATIONS[locale] ?? TRANSLATIONS.en;

  const value: AppDependencies = {
    caspGateway,
    walletPort,
    circuitVerifier,
    cryptoPort,
    storagePort,
    indexerPort,
    ...useCases,
    session,
    updateSession,
    setBackendMode,
    wallet,
    setWallet,
    locale,
    setLocale,
    t,
  };

  return (
    <AppDependenciesContext.Provider value={value}>
      {children}
    </AppDependenciesContext.Provider>
  );
}

export function useAppDependencies(): AppDependencies {
  const ctx = useContext(AppDependenciesContext);
  if (!ctx) {
    throw new Error('useAppDependencies must be used inside AppDependenciesProvider');
  }
  return ctx;
}
