import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { supabase } from '@/lib/supabase/client';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';
import ResetPasswordPage from '@/app/auth/reset-password/page';

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
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

describe('Password Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Forgot Password Page', () => {
    it('renders forgot password form', () => {
      render(<ForgotPasswordPage />);
      
      expect(screen.getByText('Grindproof')).toBeInTheDocument();
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('submits forgot password request successfully', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      render(<ForgotPasswordPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@test.com',
          {
            redirectTo: expect.stringContaining('/auth/reset-password'),
          }
        );
      });

      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText(/We sent you a password reset link/i)).toBeInTheDocument();
    });

    it('shows error message on failed request', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: { message: 'Email not found' },
      } as any);

      render(<ForgotPasswordPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.change(emailInput, { target: { value: 'invalid@test.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null } as any), 100))
      );

      render(<ForgotPasswordPage />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });

    it('has link back to login', () => {
      render(<ForgotPasswordPage />);
      
      const loginLink = screen.getByText('Sign in');
      expect(loginLink).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('Reset Password Page', () => {
    it('renders reset password form when session is valid', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: '123', email: 'test@test.com' },
            access_token: 'token',
          },
        },
        error: null,
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText('Set your new password')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('shows error when session is invalid', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      });

      expect(screen.getByText(/This password reset link is invalid or has expired/i)).toBeInTheDocument();
    });

    it('updates password successfully', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: '123', email: 'test@test.com' },
            access_token: 'token',
          },
        },
        error: null,
      } as any);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          password: 'newpassword123',
        });
      });

      expect(screen.getByText('Password updated!')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: '123', email: 'test@test.com' },
            access_token: 'token',
          },
        },
        error: null,
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(passwordInput, { target: { value: 'password1' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password2' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });

      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('validates minimum password length', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: '123', email: 'test@test.com' },
            access_token: 'token',
          },
        },
        error: null,
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '12345' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('shows error on update failure', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: '123', email: 'test@test.com' },
            access_token: 'token',
          },
        },
        error: null,
      } as any);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Failed to update password' },
      } as any);

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update password')).toBeInTheDocument();
      });
    });
  });
});

