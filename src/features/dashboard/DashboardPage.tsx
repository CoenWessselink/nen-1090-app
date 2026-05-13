/**
 * Legacy `BrowserRouter` entry (`src/app/routes.tsx`) imports this module.
 * Canonical UI lives in `MobileDashboardPage`; keep a single implementation.
 */
import { MobileDashboardPage as DashboardPage } from '@/features/mobile/MobileDashboardPage';

export { DashboardPage };
export default DashboardPage;
