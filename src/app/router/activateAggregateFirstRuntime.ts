import { RouteObject } from 'react-router-dom';

import { runtimeCutoverBootstrap } from './runtimeCutoverBootstrap';

export function activateAggregateFirstRuntime(
  routes: RouteObject[],
): RouteObject[] {
  return runtimeCutoverBootstrap(routes);
}
