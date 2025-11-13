import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { InstallPWA, InstallButton } from '@/components/InstallPWA';

// Mock BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

describe('InstallPWA Component', () => {
  let deferredPrompt: Partial<BeforeInstallPromptEvent>;
  let mockMatchMedia: any;

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Mock matchMedia for display mode detection
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = mockMatchMedia;

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null), // Return null by default (not dismissed)
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Create mock deferred prompt
    deferredPrompt = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should not render if already installed', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<InstallPWA />);
    
    // Should not show banner if already installed
    expect(screen.queryByText(/Install Grindproof/i)).not.toBeInTheDocument();
  });

  it('should not render if install dismissed', () => {
    (window.sessionStorage.getItem as any).mockReturnValue('true');

    render(<InstallPWA />);

    // Trigger beforeinstallprompt
    const event = new Event('beforeinstallprompt');
    Object.assign(event, deferredPrompt);
    window.dispatchEvent(event);

    // Fast forward past delay
    vi.advanceTimersByTime(3000);

    expect(screen.queryByText(/Install Grindproof/i)).not.toBeInTheDocument();
  });

  it('should show install banner after 3 seconds when installable', async () => {
    render(<InstallPWA />);

    // Trigger beforeinstallprompt
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, deferredPrompt);
      window.dispatchEvent(event);
    });

    // Should not show immediately
    expect(screen.queryByText(/Install Grindproof/i)).not.toBeInTheDocument();

    // Fast forward 3 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Should show banner now
    expect(screen.getAllByText(/Install Grindproof/i)[0]).toBeInTheDocument();
  });

  it('should handle install button click', async () => {
    render(<InstallPWA />);

    // Trigger beforeinstallprompt
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, deferredPrompt);
      window.dispatchEvent(event);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getAllByText(/Install Grindproof/i)[0]).toBeInTheDocument();

    // Click install button
    const installButton = screen.getByRole('button', { name: /Install Now/i });
    await act(async () => {
      fireEvent.click(installButton);
      await Promise.resolve(); // Flush promise queue
    });

    // Should call prompt
    expect(deferredPrompt.prompt).toHaveBeenCalled();
  });

  it('should handle dismiss button click', async () => {
    render(<InstallPWA />);

    // Trigger beforeinstallprompt
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, deferredPrompt);
      window.dispatchEvent(event);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getAllByText(/Install Grindproof/i)[0]).toBeInTheDocument();

    // Click dismiss button
    const dismissButton = screen.getAllByLabelText(/Dismiss/i)[0];
    await act(async () => {
      fireEvent.click(dismissButton);
      await Promise.resolve(); // Flush promise queue
    });

    // Should set session storage
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'pwa-install-dismissed',
      'true'
    );

    // Banner should disappear
    expect(screen.queryByText(/Install Grindproof/i)).not.toBeInTheDocument();
  });

  it('should hide banner after app installed event', async () => {
    render(<InstallPWA />);

    // Trigger beforeinstallprompt
    await act(async () => {
      const beforeEvent = new Event('beforeinstallprompt');
      Object.assign(beforeEvent, deferredPrompt);
      window.dispatchEvent(beforeEvent);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getAllByText(/Install Grindproof/i)[0]).toBeInTheDocument();

    // Trigger appinstalled event
    await act(async () => {
      const installedEvent = new Event('appinstalled');
      window.dispatchEvent(installedEvent);
      await Promise.resolve(); // Flush promise queue
    });

    // Banner should disappear
    expect(screen.queryByText(/Install Grindproof/i)).not.toBeInTheDocument();
  });
});

describe('InstallButton Component', () => {
  let deferredPrompt: Partial<BeforeInstallPromptEvent>;
  let mockMatchMedia: any;

  beforeEach(() => {
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = mockMatchMedia;

    deferredPrompt = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if not installable', () => {
    render(<InstallButton />);
    expect(screen.queryByText(/Install App/i)).not.toBeInTheDocument();
  });

  it('should show "App Installed" if already installed', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<InstallButton />);
    expect(screen.getByText(/App Installed/i)).toBeInTheDocument();
  });

  it('should render install button when installable', async () => {
    render(<InstallButton />);

    // Trigger beforeinstallprompt
    const event = new Event('beforeinstallprompt');
    Object.assign(event, deferredPrompt);
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText(/Install App/i)).toBeInTheDocument();
    });
  });

  it('should handle install click', async () => {
    render(<InstallButton />);

    // Trigger beforeinstallprompt
    const event = new Event('beforeinstallprompt');
    Object.assign(event, deferredPrompt);
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText(/Install App/i)).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Install App/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(deferredPrompt.prompt).toHaveBeenCalled();
    });
  });
});

