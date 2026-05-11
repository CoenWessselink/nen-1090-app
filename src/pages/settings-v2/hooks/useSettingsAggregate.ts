import { useEffect, useState } from 'react';

import {
  fetchCompanySettings,
  SettingsV2Response,
} from '../services/settingsV2Api';

export function useSettingsAggregate() {
  const [data, setData] = useState<any>(null);
  const [meta, setMeta] = useState<SettingsV2Response<any>['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const response = await fetchCompanySettings();

        if (!mounted) {
          return;
        }

        setData(response.data);
        setMeta(response.meta);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Unknown runtime error');
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
  }, []);

  return {
    data,
    meta,
    loading,
    error,
  };
}
