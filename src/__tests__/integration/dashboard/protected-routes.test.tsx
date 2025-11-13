import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { supabase } from '@/lib/supabase/client';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('Protected Routes - Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard when user is authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Grindproof')).toBeInTheDocument();
      expect(screen.getByText('✓ Today')).toBeInTheDocument();
      expect(screen.getByText('🌙 Reality Check')).toBeInTheDocument();
      expect(screen.getByText('📊 Weekly Roast')).toBeInTheDocument();
    });
  });

  it('shows sign out button when authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('handles sign out', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    render(<Dashboard />);

    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out');
      signOutButton.click();
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays today view tasks', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    render(<Dashboard />);

    await waitFor(() => {
      const headers = screen.getAllByText('Today\'s Tasks ✓');
      expect(headers.length).toBeGreaterThan(0);
      
      const completionText = screen.getAllByText(/1 of 3 completed/);
      expect(completionText.length).toBeGreaterThan(0);
    });
  });
});

