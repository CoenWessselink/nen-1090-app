// shortened explanation: changed labels to English, enforce navigation and status sync

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWeld } from '@/api/welds';
import { upsertInspectionForWeld } from '@/api/inspections';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh } from '@/features/mobile/mobile-utils';

export function MobileInspectionPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertInspectionForWeld(projectId, weldId, {});
      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'inspection-updated' });
      navigate(`/projecten/${projectId}/lassen`); // 🔥 FIX: direct terug
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Inspection" subtitle="Weld inspection" backTo={`/projecten/${projectId}/lassen`}>
      <button onClick={handleSave}>{saving ? 'Saving…' : 'Save & close'}</button>
    </MobilePageScaffold>
  );
}
