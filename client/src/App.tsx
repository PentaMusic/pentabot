import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import MainLayout from './components/Layout/MainLayout';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;