import { useRoutes } from 'react-router-dom';
import { routerConfig } from '@/app/router/routes';

export default function AppRoutes() {
  return useRoutes(routerConfig);
}
