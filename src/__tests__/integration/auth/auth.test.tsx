import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { supabase } from '@/lib/supabase/client';
import LoginPage from '@/app/auth/login/page';
import SignupPage from '@/app/auth/signup/page';

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

describe('Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Page', () => {
    it('renders login form', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('Grindproof')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('submits login form with valid credentials', async () => {
      const mockWindowLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockWindowLocation,
        writable: true,
      });

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' }, session: { access_token: 'token' } },
        error: null,
      } as any);

      render(<LoginPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@test.com',
          password: 'password123',
        });
      });

      // Wait for timeout to execute
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockWindowLocation.href).toBe('/dashboard');
    });

    it('shows error message on failed login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      } as any);

      render(<LoginPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('disables submit button while loading', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { user: {}, session: {} }, error: null } as any), 100))
      );

      render(<LoginPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  describe('Signup Page', () => {
    it('renders signup form', () => {
      render(<SignupPage />);
      
      expect(screen.getByText('Grindproof')).toBeInTheDocument();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument();
    });

    it('submits signup form successfully', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: '123', email: 'new@test.com' }, session: null },
        error: null,
      } as any);

      render(<SignupPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const termsCheckbox = screen.getByRole('checkbox', { name: /I agree to the/i });
      const submitButton = screen.getByRole('button', { name: /^sign up$/i });

      fireEvent.change(emailInput, { target: { value: 'new@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(termsCheckbox); // Check terms before submitting
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });
    });

    it('shows error message on failed signup', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      } as any);

      render(<SignupPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const termsCheckbox = screen.getByRole('checkbox', { name: /I agree to the/i });
      const submitButton = screen.getByRole('button', { name: /^sign up$/i });

      fireEvent.change(emailInput, { target: { value: 'existing@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(termsCheckbox); // Check terms before submitting
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('validates password minimum length', () => {
      render(<SignupPage />);
      
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput.minLength).toBe(6);
      expect(screen.getByText('At least 6 characters')).toBeInTheDocument();
    });
  });
});

