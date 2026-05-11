import { RouteObject } from 'react-router-dom';

import { ceV2Routes } from '../../routes/ceV2Routes';
import { settingsV2Routes } from '../../routes/settingsV2Routes';

/**
 * Aggregate-first runtime route registry.
 *
 * Centralizes:
 * - Settings V2 runtime ownership
 * - CE V2 aggregate runtime ownership
 * - render-only runtime routing
 */
export const runtimeCutoverRoutes: RouteObject[] = [
  ...settingsV2Routes,
  ...ceV2Routes,
];
