import { useCallback, useState } from 'react';

export function useRuntimeInvalidation() {
  const [invalidateKeys, setInvalidateKeys] = useState<string[]>([]);

  const invalidate = useCallback((keys: string[]) => {
    setInvalidateKeys((previous) => {
      const merged = [...previous];

      for (const key of keys) {
        if (!merged.includes(key)) {
          merged.push(key);
        }
      }

      return merged;
    });
  }, []);

  const clear = useCallback(() => {
    setInvalidateKeys([]);
  }, []);

  return {
    invalidateKeys,
    invalidate,
    clear,
  };
}
