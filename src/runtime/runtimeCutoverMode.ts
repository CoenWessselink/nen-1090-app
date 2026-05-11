export type RuntimeCutoverMode =
  | 'legacy'
  | 'settings-v2'
  | 'ce-v2'
  | 'aggregate-first';

export const ACTIVE_RUNTIME_CUTOVER_MODE: RuntimeCutoverMode = 'aggregate-first';
