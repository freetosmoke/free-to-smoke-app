import { useState } from 'react';
import HomePage from './components/HomePage';
import Registration from './components/Registration';
import Login from './components/Login';
import CustomerProfile from './components/CustomerProfile';
import AdminPanel from './components/AdminPanel';
import { Customer } from './types';

type Page = 'home' | 'register' | 'login' | 'profile' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const handleNavigate = (page: string, data?: unknown) => {
    if (page === 'profile' && data) {
      setCurrentCustomer(data as Customer);
    }
    setCurrentPage(page as Page);
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
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
}

export default App;