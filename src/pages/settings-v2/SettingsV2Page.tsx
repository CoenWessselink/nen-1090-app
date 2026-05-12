/**
 * SettingsV2Page — delegates to the canonical InstellingenPage.
 * The previous implementation showed a raw JSON dump (development artifact).
 * This component now renders the real settings UI directly.
 */
import { InstellingenPage } from '@/features/instellingen/InstellingenPage';

export default function SettingsV2Page() {
  return <InstellingenPage />;
}
