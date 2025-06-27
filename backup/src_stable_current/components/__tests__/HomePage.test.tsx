import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';

describe('HomePage', () => {
  it('mostra il titolo e il logo', () => {
    render(<HomePage onNavigate={jest.fn()} />);
    expect(screen.getByText('Free To Smoke')).toBeInTheDocument();
    expect(screen.getByAltText('Free To Smoke Logo')).toBeInTheDocument();
  });

  it('mostra i pulsanti Registrati e Accedi se non loggato', () => {
    render(<HomePage onNavigate={jest.fn()} />);
    expect(screen.getByText('Registrati')).toBeInTheDocument();
    expect(screen.getByText('Accedi')).toBeInTheDocument();
  });

  it('naviga alla pagina di registrazione al click su Registrati', () => {
    const onNavigate = jest.fn();
    render(<HomePage onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Registrati'));
    expect(onNavigate).toHaveBeenCalledWith('register');
  });

  it('naviga alla pagina di login al click su Accedi', () => {
    const onNavigate = jest.fn();
    render(<HomePage onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Accedi'));
    expect(onNavigate).toHaveBeenCalledWith('login');
  });

  it('mostra il link Instagram', () => {
    render(<HomePage onNavigate={jest.fn()} />);
    expect(screen.getByText('Seguici su Instagram')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('href', expect.stringContaining('instagram.com'));
  });

  it('mostra il pulsante Area Admin', () => {
    render(<HomePage onNavigate={jest.fn()} />);
    expect(screen.getByText('Area Admin')).toBeInTheDocument();
  });
});
