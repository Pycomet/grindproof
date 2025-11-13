import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act as hookAct } from '@testing-library/react';
import { render, screen, act } from '@testing-library/react';
import {
  useOnlineStatus,
  useNetworkInformation,
  useOfflineBanner,
} from '@/hooks/useOnlineStatus';

describe('useOnlineStatus Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set initial online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should return true when online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('should update when going offline', async () => {
    vi.useRealTimers(); // This test doesn't need fake timers
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);

    // Simulate going offline
    await hookAct(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    }, { timeout: 5000 });
  });

  it('should update when going back online', async () => {
    vi.useRealTimers(); // This test doesn't need fake timers
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(false);

    // Simulate going online
    await hookAct(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    }, { timeout: 5000 });
  });

  it('should log when connection changes', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    renderHook(() => useOnlineStatus());

    // Go offline
    await hookAct(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(consoleSpy).toHaveBeenCalledWith('⚠️ Network connection lost');

    // Go online
    await hookAct(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(consoleSpy).toHaveBeenCalledWith('✅ Network connection restored');
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('useNetworkInformation Hook', () => {
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return network information when available', async () => {
    const { result } = renderHook(() => useNetworkInformation());

    await waitFor(() => {
      expect(result.current).toEqual({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      });
    });
  });

  it('should return null when Network Information API not available', () => {
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useNetworkInformation());
    expect(result.current).toBeNull();
  });

  it('should update when connection changes', async () => {
    const { result } = renderHook(() => useNetworkInformation());

    await waitFor(() => {
      expect(result.current?.effectiveType).toBe('4g');
    });

    // Simulate connection change
    await hookAct(async () => {
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 2;
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];
      if (changeHandler) changeHandler();
    });

    await waitFor(() => {
      expect(result.current?.effectiveType).toBe('3g');
      expect(result.current?.downlink).toBe(2);
    });
  });

  it('should cleanup event listener on unmount', () => {
    const { unmount } = renderHook(() => useNetworkInformation());
    unmount();

    expect(mockConnection.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('should work with mozConnection', () => {
    Object.defineProperty(navigator, 'connection', { value: undefined });
    Object.defineProperty(navigator, 'mozConnection', {
      value: mockConnection,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useNetworkInformation());

    expect(result.current).not.toBeNull();
  });

  it('should work with webkitConnection', () => {
    Object.defineProperty(navigator, 'connection', { value: undefined });
    Object.defineProperty(navigator, 'webkitConnection', {
      value: mockConnection,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useNetworkInformation());

    expect(result.current).not.toBeNull();
  });
});

describe('useOfflineBanner Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should return null when online and never been offline', () => {
    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div>{banner}</div>;
    };

    render(<TestComponent />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('should show offline banner when going offline', async () => {
    vi.useRealTimers(); // Use real timers for event-driven state updates
    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div data-testid="container">{banner}</div>;
    };

    render(<TestComponent />);

    // Go offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });
  });

  it('should show "back online" message when reconnecting', async () => {
    vi.useRealTimers(); // Use real timers initially for event handling
    Object.defineProperty(navigator, 'onLine', { value: false });

    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div data-testid="container">{banner}</div>;
    };

    render(<TestComponent />);

    // Initially offline - should show banner
    await waitFor(() => {
      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Back online/i)).toBeInTheDocument();
    });
  });

  it('should hide "back online" banner after 3 seconds', async () => {
    vi.useRealTimers(); // Start with real timers for event handling
    Object.defineProperty(navigator, 'onLine', { value: false });

    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div data-testid="container">{banner}</div>;
    };

    render(<TestComponent />);

    // Go offline
    await waitFor(() => {
      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });

    // Go back online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Back online/i)).toBeInTheDocument();
    });

    // Wait for banner to auto-hide (3 seconds)
    await waitFor(() => {
      expect(screen.queryByText(/Back online/i)).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('should apply correct styles for offline state', async () => {
    vi.useRealTimers(); // Use real timers for event-driven state updates
    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div data-testid="container">{banner}</div>;
    };

    render(<TestComponent />);

    // Go offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      const bannerText = screen.getByText(/You're offline/i);
      // The banner div itself has the class, not the parent
      expect(bannerText.closest('div[class*="bg-orange"]')).toBeInTheDocument();
    });
  });

  it('should apply correct styles for online state', async () => {
    vi.useRealTimers(); // Use real timers for event-driven state updates
    Object.defineProperty(navigator, 'onLine', { value: false });

    const TestComponent = () => {
      const banner = useOfflineBanner();
      return <div data-testid="container">{banner}</div>;
    };

    render(<TestComponent />);

    // Go offline first
    await waitFor(() => {
      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });

    // Go back online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      const bannerText = screen.getByText(/Back online/i);
      // The banner div itself has the class, not the parent
      expect(bannerText.closest('div[class*="bg-green"]')).toBeInTheDocument();
    });
  });
});

