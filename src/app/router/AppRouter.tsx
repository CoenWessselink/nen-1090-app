import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routerConfig } from '@/app/router/routes';

const router = createBrowserRouter(routerConfig);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
