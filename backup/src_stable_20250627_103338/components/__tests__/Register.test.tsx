import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Register from '../Register.tsx';

// Mock Firebase
jest.mock('../../firebase/config', () => ({
  auth: {},
  db: {},
  storage: {}
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  updateProfile: jest.fn()
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn()
}));

// Mock utilities
jest.mock('../../utils/auth', () => ({
  validateEmail: jest.fn(() => true),
  validatePassword: jest.fn(() => true),
  validatePhone: jest.fn(() => true)
}));

jest.mock('../../utils/security', () => ({
  generateCSRFToken: jest.fn(() => 'mock-csrf-token'),
  validateCSRFToken: jest.fn(() => true),
  hashPassword: jest.fn(() => 'hashed-password'),
  generateSalt: jest.fn(() => 'mock-salt')
}));

jest.mock('../../utils/securityLogging', () => ({
  logSecurityEvent: jest.fn()
}));

const mockOnNavigate = jest.fn();

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render registration form correctly', () => {
    render(<Register onNavigate={mockOnNavigate} />);
    
    // Verifica che gli elementi principali siano presenti
    expect(screen.getByText('Crea il tuo account')).toBeInTheDocument();
    expect(screen.getByText('Unisciti alla community di Free to Smoke')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrati/i })).toBeInTheDocument();
  });

  it('should show login link', () => {
    render(<Register onNavigate={mockOnNavigate} />);
    
    expect(screen.getByText('Hai già un account?')).toBeInTheDocument();
    expect(screen.getByText('Accedi')).toBeInTheDocument();
  });

  it('should call onNavigate when login link is clicked', () => {
    render(<Register onNavigate={mockOnNavigate} />);
    
    const loginLink = screen.getByText('Accedi');
    fireEvent.click(loginLink);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('login', null);
  });

  it('should have required form fields', () => {
    render(<Register onNavigate={mockOnNavigate} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cognome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/numero di cellulare/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});