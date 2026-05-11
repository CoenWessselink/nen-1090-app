import { RouteObject } from 'react-router-dom';

import { runtimeCutoverRoutes } from './runtimeCutoverRoutes';

/**
 * Registers aggregate-first runtime routes into the active router tree.
 *
 * This becomes the central cutover integration point for:
 * - Settings V2
 * - CE V2
 * - render-only runtime ownership
 */
export function registerRuntimeCutoverRoutes(
  existingRoutes: RouteObject[],
): RouteObject[] {
  return [
    ...runtimeCutoverRoutes,
    ...existingRoutes,
  ];
}
