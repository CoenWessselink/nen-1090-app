import { RouteObject } from 'react-router-dom';

import { buildAggregateFirstRouter } from './aggregateFirstRouter';

/**
 * Bootstrap helper for activating aggregate-first runtime routing.
 */
export function runtimeCutoverBootstrap(
  routes: RouteObject[],
): RouteObject[] {
  return buildAggregateFirstRouter(routes);
}
