import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { OverviewDashboard } from './pages/OverviewDashboard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <OverviewDashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
