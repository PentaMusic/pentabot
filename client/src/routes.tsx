
import ResetPassword from './components/Auth/ResetPassword';
import MainLayout from './components/Layout/MainLayout';


const routes = [
  {
    path: '/',
    element: <MainLayout />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
];

export default routes;
