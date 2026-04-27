import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'nen1090.weld-follow-up';

function readStoredIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function persist(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useWeldFollowUp() {
  const [ids, setIds] = useState<string[]>(() => readStoredIds());

  useEffect(() => {
    persist(ids);
  }, [ids]);

  return useMemo(() => ({
    ids,
    has: (id: string | number) => ids.includes(String(id)),
    add: (id: string | number) => setIds((current) => current.includes(String(id)) ? current : [...current, String(id)]),
    remove: (id: string | number) => setIds((current) => current.filter((item) => item !== String(id))),
    toggle: (id: string | number) => setIds((current) => current.includes(String(id)) ? current.filter((item) => item !== String(id)) : [...current, String(id)]),
    replace: (nextIds: Array<string | number>) => setIds(Array.from(new Set(nextIds.map((item) => String(item))))),
    clear: () => setIds([]),
  }), [ids]);
}
