import { useEffect, useState } from 'react';

import {
  CeAggregateResponse,
  fetchCeAggregate,
} from '../services/ceAggregateApi';

export function useCeAggregate(projectId: string) {
  const [data, setData] = useState<CeAggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const aggregate = await fetchCeAggregate(projectId);

        if (!mounted) {
          return;
        }

        setData(aggregate);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Unknown CE aggregate error');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return {
    data,
    loading,
    error,
  };
}
