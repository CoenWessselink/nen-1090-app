import React from 'react';
import { useParams } from 'react-router-dom';

import CeAggregatePage from './CeAggregatePage';

export default function CeAggregateRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  return <CeAggregatePage projectId={projectId} />;
}
