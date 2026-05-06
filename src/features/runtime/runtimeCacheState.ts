export type RuntimeCacheState = {
  key: string;
  updatedAt: number;
  category: string;
};

const runtimeCacheStates = new Map<string, RuntimeCacheState>();

export function registerRuntimeCacheState(
  key: string,
  category: string,
): RuntimeCacheState {
  const state: RuntimeCacheState = {
    key,
    category,
    updatedAt: Date.now(),
  };

  runtimeCacheStates.set(key, state);

  console.info('[runtime-cache-state] registered', {
    key,
    category,
  });

  return state;
}

export function clearRuntimeCacheState(
  category: string,
): string[] {
  const cleared: string[] = [];

  runtimeCacheStates.forEach((state, key) => {
    if (state.category === category) {
      runtimeCacheStates.delete(key);
      cleared.push(key);
    }
  });

  console.info('[runtime-cache-state] cleared', {
    category,
    cleared,
  });

  return cleared;
}

export function getRuntimeCacheStates(): RuntimeCacheState[] {
  return [...runtimeCacheStates.values()];
}
