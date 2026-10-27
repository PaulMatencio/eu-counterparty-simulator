/**
 * Clean Architecture Boundary Enforcement Test.
 * Verifies that dependencies point strictly inward:
 *   - `src/domain` imports nothing from `application`, `infrastructure`, `presentation`, or `app`.
 *   - `src/application` imports only from `src/domain` (or relative within `src/application`).
 *   - `src/presentation` never imports concrete `src/infrastructure` modules outside the
 *     Composition Root (`src/presentation/providers/dependency-injection.provider.tsx`).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = join(__dirname, '../src');

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function extractImportSpecifiers(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf8');
  const specs: string[] = [];
  const regex = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

describe('Clean Architecture Layer Boundaries', () => {
  it('src/domain has zero outward or framework dependencies', () => {
    const domainFiles = collectFiles(join(SRC_ROOT, 'domain'));
    expect(domainFiles.length).toBeGreaterThan(0);

    for (const file of domainFiles) {
      const imports = extractImportSpecifiers(file);
      for (const spec of imports) {
        expect(
          spec.startsWith('./') || spec.startsWith('../'),
          `Domain file ${relative(SRC_ROOT, file)} has forbidden import "${spec}"`,
        ).toBe(true);
        expect(spec).not.toMatch(/application|infrastructure|presentation|react|next/);
      }
    }
  });

  it('src/application depends only on src/domain and internal application modules', () => {
    const appFiles = collectFiles(join(SRC_ROOT, 'application'));
    expect(appFiles.length).toBeGreaterThan(0);

    for (const file of appFiles) {
      const imports = extractImportSpecifiers(file);
      for (const spec of imports) {
        const isAllowed =
          spec === '@/domain' ||
          spec.startsWith('@/domain/') ||
          spec.startsWith('./') ||
          spec.startsWith('../');
        expect(
          isAllowed,
          `Application file ${relative(SRC_ROOT, file)} has forbidden import "${spec}"`,
        ).toBe(true);
        expect(spec).not.toMatch(/infrastructure|presentation|react|next/);
      }
    }
  });

  it('src/presentation components and hooks never import src/infrastructure directly (only DI Composition Root may wire adapters)', () => {
    const presentationFiles = collectFiles(join(SRC_ROOT, 'presentation'));
    expect(presentationFiles.length).toBeGreaterThan(0);

    for (const file of presentationFiles) {
      const rel = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (rel === 'presentation/providers/dependency-injection.provider.tsx') {
        continue;
      }
      const imports = extractImportSpecifiers(file);
      for (const spec of imports) {
        expect(
          !spec.includes('infrastructure') && !spec.includes('@casp-core'),
          `Presentation file ${rel} must not import infrastructure directly (found "${spec}")`,
        ).toBe(true);
      }
    }
  });
});
