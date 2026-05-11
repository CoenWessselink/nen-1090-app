import { useCallback, useState } from 'react';

export function useAggregateInvalidation() {
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return {
    version,
    invalidate,
  };
}
