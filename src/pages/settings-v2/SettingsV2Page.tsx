import React from 'react';

import { useSettingsAggregate } from './hooks/useSettingsAggregate';

export default function SettingsV2Page() {
  const {
    data,
    meta,
    loading,
    error,
  } = useSettingsAggregate();

  if (loading) {
    return <div className="page-container">Loading Settings V2...</div>;
  }

  if (error) {
    return <div className="page-container">{error}</div>;
  }

  return (
    <div className="page-container">
      <div className="enterprise-card">
        <div className="enterprise-card-header">
          <h1>Settings V2</h1>
        </div>

        <div className="enterprise-card-body">
          <p>Runtime: deterministic enterprise foundation</p>

          <pre>{JSON.stringify(data, null, 2)}</pre>

          <pre>{JSON.stringify(meta, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
