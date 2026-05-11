import React from 'react';
import { RouteObject } from 'react-router-dom';

import SettingsV2Page from '../pages/settings-v2/SettingsV2Page';

export const settingsV2Routes: RouteObject[] = [
  {
    path: '/settings-v2',
    element: <SettingsV2Page />,
  },
];
