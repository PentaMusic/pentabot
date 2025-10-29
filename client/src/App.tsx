import React from 'react';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import routes from './routes';

const App: React.FC = () => {
    const router = createBrowserRouter(routes);
    return <RouterProvider router={router} />;
};

export default App;
