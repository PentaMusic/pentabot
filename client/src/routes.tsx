import ResetPassword from './components/Auth/ResetPassword';
import MainLayout from './components/Layout/MainLayout';
import AdminLogin from './components/Admin/AdminLogin';
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboard from './components/Admin/AdminDashboard';

const routes = [
  {
    path: '/',
    element: <MainLayout />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/admin',
    element: <AdminLogin />,
  },
  {
    path: '/admin/dashboard',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      // Phase 2에서 추가할 라우트들
      // {
      //   path: 'organizations',
      //   element: <OrganizationManagement />,
      // },
      // {
      //   path: 'usage',
      //   element: <UsageManagement />,
      // },
      // {
      //   path: 'admins',
      //   element: <AdminManagement />,
      // },
    ],
  },
];

export default routes;
