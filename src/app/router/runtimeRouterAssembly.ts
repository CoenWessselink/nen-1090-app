import { RouteObject } from 'react-router-dom';

import { activateAggregateFirstRuntime } from './activateAggregateFirstRuntime';

export function runtimeRouterAssembly(
  routes: RouteObject[],
): RouteObject[] {
  return activateAggregateFirstRuntime(routes);
}
