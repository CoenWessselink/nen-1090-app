import React from 'react';
import { RouteObject } from 'react-router-dom';

import CeAggregateRoute from '../pages/ce-v2/CeAggregateRoute';

export const ceV2Routes: RouteObject[] = [
  {
    path: '/projects/:projectId/ce-v2',
    element: <CeAggregateRoute />,
  },
];
