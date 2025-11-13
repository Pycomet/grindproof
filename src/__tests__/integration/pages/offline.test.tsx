import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import OfflinePage from '@/app/offline/page';

// Mock the Logo component
vi.mock('@/components/Logo', () => ({
  Logo: ({ size }: { size: string }) => <div data-testid="logo">Logo {size}</div>,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Offline Page', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Save original location
    originalLocation = window.location;

    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: '',
      reload: vi.fn(),
    } as any;

    // Set initial online status
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
    window.location = originalLocation;
  });

  it('should render offline message when offline', () => {
    render(<OfflinePage />);

    expect(screen.getByText("You're Offline")).toBeInTheDocument();
    expect(screen.getByText(/No internet connection detected/i)).toBeInTheDocument();
  });

  it('should render logo', () => {
    render(<OfflinePage />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('should show offline icon when offline', () => {
    const { container } = render(<OfflinePage />);
    
    // Check for the svg with the offline icon
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-orange-600');
  });

  it('should show "Try Again" button when offline', () => {
    render(<OfflinePage />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should show "View Cached Dashboard" link when offline', () => {
    render(<OfflinePage />);
    const link = screen.getByText('View Cached Dashboard');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('should show offline tips when offline', () => {
    render(<OfflinePage />);
    
    expect(screen.getByText('Tips for Offline Mode:')).toBeInTheDocument();
    expect(screen.getByText(/Your progress will sync automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/Previously viewed goals and routines/i)).toBeInTheDocument();
    expect(screen.getByText(/Check your WiFi/i)).toBeInTheDocument();
  });

  it('should reload page when "Try Again" is clicked', () => {
    render(<OfflinePage />);
    
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should show "Back Online!" when connection is restored', async () => {
    vi.useRealTimers(); // Use real timers for event-driven updates
    const { rerender } = render(<OfflinePage />);

    // Initially offline
    expect(screen.getByText("You're Offline")).toBeInTheDocument();

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Back Online!')).toBeInTheDocument();
    });
  });

  it('should show "Reconnecting" message when back online', async () => {
    vi.useRealTimers(); // Use real timers for event-driven updates
    const { rerender } = render(<OfflinePage />);

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Reconnecting you to Grindproof/i)).toBeInTheDocument();
    });
  });

  it('should show online icon when back online', async () => {
    vi.useRealTimers(); // Use real timers for event-driven updates
    const { rerender } = render(<OfflinePage />);

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      // Check that offline tips are not shown when online
      expect(screen.queryByText('Tips for Offline Mode:')).not.toBeInTheDocument();
    });
  });

  it('should redirect to dashboard after 1 second when back online', async () => {
    vi.useRealTimers(); // Use real timers for event handling and setTimeout
    render(<OfflinePage />);

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
    });

    // Wait for redirect (1 second timeout in component)
    await waitFor(() => {
      expect(window.location.href).toBe('/dashboard');
    }, { timeout: 2000 });
  });

  it('should not redirect if connection lost again', async () => {
    const { rerender } = render(<OfflinePage />);

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
    });

    // Go offline again before redirect
    await act(async () => {
      vi.advanceTimersByTime(500); // Only advance 500ms, not all timers
    });

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));
      rerender(<OfflinePage />);
    });

    // Fast forward remaining time
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should not redirect
    expect(window.location.href).toBe('');
  }, 10000);

  it('should cleanup timer on unmount', async () => {
    const { unmount } = render(<OfflinePage />);

    // Go online to start timer
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
    });

    // Unmount before timer completes
    unmount();

    // Fast forward
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should not redirect after unmount
    expect(window.location.href).toBe('');
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<OfflinePage />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should handle rapid online/offline changes', async () => {
    vi.useRealTimers(); // Use real timers for event-driven updates
    const { rerender } = render(<OfflinePage />);

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Back Online!')).toBeInTheDocument();
    });

    // Go offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      expect(screen.getByText("You're Offline")).toBeInTheDocument();
    });

    // Go online again
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      rerender(<OfflinePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Back Online!')).toBeInTheDocument();
    });
  });
});

