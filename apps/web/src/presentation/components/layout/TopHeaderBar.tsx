'use client';

/**
 * Presentation Layer — Top Navigation Bar, Synthetic Data Warning Banner & Wallet Context Bar.
 */
import React from 'react';
import {
  AlertTriangle,
  Clock,
  Globe,
  KeyRound,
  Server,
  Shield,
  Wallet,
} from 'lucide-react';
import type { CaspHealthStatus } from '@/domain';
import {
  LOCALE_LABELS,
  type SupportedLocale,
} from '../../i18n/config.js';
import { useAppDependencies } from '../../providers/dependency-injection.provider.js';
import { useWalletContext } from '../../hooks/use-simulator-workflow.js';

export function TopHeaderBar({
  health,
  onAdvanceClock,
}: {
  health: CaspHealthStatus | null;
  onAdvanceClock: (seconds: number) => void;
}) {
  const {
    t,
    locale,
    setLocale,
    session,
    setBackendMode,
    updateSession,
  } = useAppDependencies();
  const {
    wallet,
    walletError,
    connecting,
    selectPreset,
    updateCustomHexKeys,
    connectLace,
  } = useWalletContext();

  const formattedClock = health?.currentTimestamp
    ? new Date(health.currentTimestamp * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
    : 'Live System Clock';

  return (
    <header className="border-b border-indigo-500/20 bg-[#070a14]/90 backdrop-blur-md">
      {/* Persistent Synthetic Data Warning Banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="rounded bg-amber-500/25 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
            {t.banner.testOnlyBadge}
          </span>
          <span>{t.banner.syntheticNotice}</span>
        </div>
        <span className="font-mono text-[11px] text-amber-300/90">
          KycAttestationV1 • Jubjub Schnorr
        </span>
      </div>

      {/* Main Brand & Controls */}
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              {t.header.title}
            </h1>
            <p className="text-xs text-slate-400">{t.header.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Simulated Clock Controls */}
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-900/80 px-2.5 py-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-mono text-slate-300">{formattedClock}</span>
            {session.backendMode === 'embedded' && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => onAdvanceClock(8 * 86400)}
                  className="rounded bg-indigo-500/20 hover:bg-indigo-500/35 px-2 py-0.5 text-[11px] font-medium text-indigo-200 transition"
                >
                  {t.header.advance7Days}
                </button>
                <button
                  type="button"
                  onClick={() => onAdvanceClock(5 * 365 * 86400 + 86400)}
                  className="rounded bg-violet-500/20 hover:bg-violet-500/35 px-2 py-0.5 text-[11px] font-medium text-violet-200 transition"
                >
                  {t.header.advance5Years}
                </button>
              </div>
            )}
          </div>

          {/* Backend Mode Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-900/80 px-2.5 py-1.5 text-xs">
            <Server className="h-3.5 w-3.5 text-indigo-400" />
            <select
              aria-label={t.header.backendMode}
              value={session.backendMode}
              onChange={(e) =>
                setBackendMode(e.target.value as 'embedded' | 'external')
              }
              className="bg-transparent text-slate-200 font-medium focus:outline-none"
            >
              <option value="embedded" className="bg-slate-900">
                {t.header.embeddedMode}
              </option>
              <option value="external" className="bg-slate-900">
                {t.header.externalMode}
              </option>
            </select>
            {session.backendMode === 'external' && (
              <input
                type="text"
                value={session.externalBaseUrl}
                onChange={(e) =>
                  updateSession({ externalBaseUrl: e.target.value })
                }
                className="midnight-input ml-1 w-40 rounded px-1.5 py-0.5 font-mono text-[11px]"
                placeholder="http://127.0.0.1:8787"
              />
            )}
          </div>

          {/* Locale Switcher */}
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-900/80 px-2.5 py-1.5 text-xs">
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as SupportedLocale)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none"
            >
              {(Object.keys(LOCALE_LABELS) as SupportedLocale[]).map((loc) => (
                <option key={loc} value={loc} className="bg-slate-900">
                  {LOCALE_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Midnight Wallet & Subject Role Context Bar */}
      <div className="border-t border-indigo-500/15 bg-[#090d1b]/90 px-4 py-3">
        <div className="mx-auto max-w-7xl flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Wallet className="h-4 w-4 text-indigo-400" />
              <span>{t.wallet.title}</span>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] text-indigo-200">
                {wallet.mode === 'lace' ? 'Lace DApp Connector v4' : wallet.walletName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void selectPreset('buyer')}
                className="rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/25 px-2.5 py-1 text-xs font-medium text-indigo-200 transition"
              >
                {t.wallet.presetBuyer}
              </button>
              <button
                type="button"
                onClick={() => void selectPreset('seller')}
                className="rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/25 px-2.5 py-1 text-xs font-medium text-indigo-200 transition"
              >
                {t.wallet.presetSeller}
              </button>
              <button
                type="button"
                onClick={() => void selectPreset('institutional')}
                className="rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/25 px-2.5 py-1 text-xs font-medium text-indigo-200 transition"
              >
                {t.wallet.presetInstitutional}
              </button>
              <button
                type="button"
                disabled={connecting}
                onClick={() => void connectLace('preprod')}
                className="rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-3 py-1 text-xs font-semibold text-white shadow transition disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : t.wallet.connectLace}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-indigo-400" />
                {t.wallet.walletKeyLabel}
              </label>
              <input
                type="text"
                value={wallet.shieldedCoinPublicKeyHex}
                onChange={(e) =>
                  updateCustomHexKeys(e.target.value, wallet.subjectRoleIdHex)
                }
                className="midnight-input w-full rounded-md px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-violet-400" />
                {t.wallet.subjectRoleIdLabel}
              </label>
              <input
                type="text"
                value={wallet.subjectRoleIdHex}
                onChange={(e) =>
                  updateCustomHexKeys(
                    wallet.shieldedCoinPublicKeyHex,
                    e.target.value,
                  )
                }
                className="midnight-input w-full rounded-md px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
          </div>

          {walletError && (
            <p className="text-xs text-rose-400 font-medium">{walletError}</p>
          )}
        </div>
      </div>
    </header>
  );
}
