import { useMemo } from 'react';

import { SETTINGS_RUNTIME_MODE } from '../../../runtime/settingsRuntimeCutover';

export function useSettingsRuntime() {
  return useMemo(() => ({
    mode: SETTINGS_RUNTIME_MODE.active,
    legacyEnabled: SETTINGS_RUNTIME_MODE.legacyEnabled,
    renderOnly: true,
  }), []);
}
