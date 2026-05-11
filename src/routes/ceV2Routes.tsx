import React from 'react';
import { RouteObject } from 'react-router-dom';

import CeAggregatePage from '../pages/ce-v2/CeAggregatePage';

export const ceV2Routes: RouteObject[] = [
  {
    path: '/projects/:projectId/ce-v2',
    element: <CeAggregatePage projectId={':projectId'} />,
  },
];
