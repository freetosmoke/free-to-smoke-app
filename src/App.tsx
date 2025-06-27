import React, { useState, Suspense, lazy } from 'react';
import HomePage from './components/HomePage';
import Registration from './components/Registration';
import Login from './components/Login';
import FirebaseInitializer from './components/FirebaseInitializer';
import DebugButton from './components/DebugButton';
import { Customer } from './types';
import { useDebug } from './utils/debugSystem';

// Lazy load heavy components
const CustomerProfile = lazy(() => import('./components/CustomerProfile'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
  </div>
);

type Page = 'home' | 'register' | 'login' | 'profile' | 'admin' | 'adminLogin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const debug = useDebug('App');

  // Log dell'inizializzazione dell'app
  React.useEffect(() => {
    debug.info('App inizializzata', { initialPage: currentPage });
  }, [currentPage, debug]);

  const handleNavigate = (page: string, data?: unknown) => {
    debug.info('Navigazione richiesta', { from: currentPage, to: page, hasData: !!data });
    
    if (page === 'profile' && data) {
      setCurrentCustomer(data as Customer);
      setCurrentPage('profile');
      debug.info('Navigazione al profilo cliente', { customerId: (data as Customer).id });
    } else {
      // Per qualsiasi altra pagina, resetta currentCustomer
      setCurrentCustomer(null);
      setCurrentPage(page as Page);
      debug.info('Navigazione completata', { newPage: page });
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'register':
        return <Registration onNavigate={handleNavigate} />;
      case 'login':
        return <Login onNavigate={handleNavigate} />;
      case 'profile':
        return currentCustomer ? (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomerProfile customer={currentCustomer} onNavigate={handleNavigate} />
          </Suspense>
        ) : (
          <HomePage onNavigate={handleNavigate} />
        );
      case 'admin':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPanel onNavigate={handleNavigate} />
          </Suspense>
        );
      case 'adminLogin':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLogin onNavigate={handleNavigate} />
          </Suspense>
        );
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  }

  return (
    <FirebaseInitializer>
      <div className="app">
        {renderPage()}
        <DebugButton position="bottom-right" />
      </div>
    </FirebaseInitializer>
  );
}

export default App;