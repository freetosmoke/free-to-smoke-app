import React, { useState } from 'react';
import HomePage from './components/HomePage';
import Registration from './components/Registration';
import Login from './components/Login';
import CustomerProfile from './components/CustomerProfile';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import FirebaseInitializer from './components/FirebaseInitializer';
import DebugButton from './components/DebugButton';
import { Customer } from './types';
import { useDebug } from './utils/debugSystem';

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
          <CustomerProfile customer={currentCustomer} onNavigate={handleNavigate} />
        ) : (
          <HomePage onNavigate={handleNavigate} />
        );
      case 'admin':
        return <AdminPanel onNavigate={handleNavigate} />;
      case 'adminLogin':
        return <AdminLogin onNavigate={handleNavigate} />;
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