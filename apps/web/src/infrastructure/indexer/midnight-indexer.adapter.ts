/**
 * Infrastructure Layer — Midnight Indexer Health & Query Adapter.
 * Implements `IIndexerPort` from `src/application`.
 */
import type { IIndexerPort, IndexerHealthSummary } from '@/application';

export class MidnightIndexerAdapter implements IIndexerPort {
  async checkHealth(indexerUri: string): Promise<IndexerHealthSummary> {
    const start = Date.now();
    try {
      const response = await fetch(indexerUri, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'query { block { height } }',
        }),
      });
      const latencyMs = Date.now() - start;
      if (!response.ok) {
        return {
          reachable: false,
          endpoint: indexerUri,
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }
      const payload = (await response.json()) as {
        data?: { block?: { height?: number } };
      };
      return {
        reachable: true,
        endpoint: indexerUri,
        blockHeight: payload.data?.block?.height,
        latencyMs,
      };
    } catch (err: unknown) {
      return {
        reachable: false,
        endpoint: indexerUri,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Indexer unreachable',
      };
    }
  }
}
