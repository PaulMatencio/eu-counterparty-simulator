import type { SanctionsEntry } from './types.js';

/** Lower-case, strip accents and punctuation, collapse spaces, sort tokens. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Screening against a sanctions list. Token-set equality after normalization,
 * so word order, case and accents don't matter. Real screening uses fuzzy
 * matching with analyst review; this is deliberately simple and deterministic.
 */
export class SanctionsScreener {
  private readonly index: Map<string, SanctionsEntry>;

  constructor(entries: SanctionsEntry[]) {
    this.index = new Map(entries.map((e) => [normalizeName(e.name), e]));
  }

  screen(name: string): SanctionsEntry | undefined {
    return this.index.get(normalizeName(name));
  }
}
