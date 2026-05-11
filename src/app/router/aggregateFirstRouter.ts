import { RouteObject } from 'react-router-dom';

import { registerRuntimeCutoverRoutes } from './registerRuntimeCutoverRoutes';

/**
 * Aggregate-first router integration.
 *
 * This becomes the canonical router assembly layer for:
 * - Settings V2 runtime
 * - CE V2 runtime
 * - render-only runtime ownership
 */
export function buildAggregateFirstRouter(
  existingRoutes: RouteObject[],
): RouteObject[] {
  return registerRuntimeCutoverRoutes(existingRoutes);
}
