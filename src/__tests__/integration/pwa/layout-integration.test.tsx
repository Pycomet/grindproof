import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RootLayout from '@/app/layout';

// Mock PWA components
vi.mock('@/components/InstallPWA', () => ({
  InstallPWA: () => <div data-testid="install-pwa">InstallPWA Component</div>,
}));

vi.mock('@/components/UpdateNotification', () => ({
  UpdateNotification: () => <div data-testid="update-notification">UpdateNotification Component</div>,
}));

// Mock TRPC Provider
vi.mock('@/lib/trpc/provider', () => ({
  TRPCProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="trpc-provider">{children}</div>
  ),
}));

// Mock AppContext
vi.mock('@/contexts/AppContext', () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-provider">{children}</div>
  ),
  useApp: () => ({
    tasks: [],
    goals: [],
    integrations: [],
    user: null,
    isLoading: false,
    isHydrated: false,
    syncStatus: 'idle',
    refreshAll: vi.fn(),
    refreshTasks: vi.fn(),
    setSyncStatus: vi.fn(),
    setUser: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    addIntegration: vi.fn(),
    updateIntegration: vi.fn(),
    deleteIntegration: vi.fn(),
    refreshGoals: vi.fn(),
    refreshIntegrations: vi.fn(),
  }),
}));

// Mock fonts
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
  Space_Grotesk: () => ({ variable: '--font-space-grotesk' }),
}));

describe('RootLayout PWA Integration', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <RootLayout>
        <div data-testid="test-child">Test Child</div>
      </RootLayout>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should include TRPC Provider', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('trpc-provider')).toBeInTheDocument();
  });

  it('should include InstallPWA component', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('install-pwa')).toBeInTheDocument();
  });

  it('should include UpdateNotification component', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('update-notification')).toBeInTheDocument();
  });

  it('should render PWA components after children', () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="test-child">Test Child</div>
      </RootLayout>
    );

    const trpcProvider = screen.getByTestId('trpc-provider');
    const child = screen.getByTestId('test-child');
    const installPWA = screen.getByTestId('install-pwa');
    const updateNotification = screen.getByTestId('update-notification');

    // Check that all elements are in the document
    expect(trpcProvider).toBeInTheDocument();
    expect(child).toBeInTheDocument();
    expect(installPWA).toBeInTheDocument();
    expect(updateNotification).toBeInTheDocument();

    // Check order: child should come before PWA components
    const allElements = Array.from(container.querySelectorAll('[data-testid]'));
    const childIndex = allElements.findIndex(el => el.getAttribute('data-testid') === 'test-child');
    const installIndex = allElements.findIndex(el => el.getAttribute('data-testid') === 'install-pwa');
    const updateIndex = allElements.findIndex(el => el.getAttribute('data-testid') === 'update-notification');

    expect(childIndex).toBeLessThan(installIndex);
    expect(childIndex).toBeLessThan(updateIndex);
  });

  it('should apply font variables to body', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const body = document.querySelector('body');
    expect(body).toHaveClass('antialiased');
  });

  it('should set lang attribute on html', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const html = document.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
  });
});

describe('RootLayout Metadata (exported)', () => {
  it('should export metadata with PWA configurations', async () => {
    // Import metadata directly
    const layoutModule = await import('@/app/layout');
    const { metadata } = layoutModule;

    expect(metadata.title).toBe('Grindproof - AI Goal & Routine Assistant');
    expect(metadata.description).toContain('accountability app');
    expect(metadata.manifest).toBe('/manifest.json');
    expect(metadata.themeColor).toBe('#09090b');
  });

  it('should export metadata with apple web app config', async () => {
    const layoutModule = await import('@/app/layout');
    const { metadata } = layoutModule;

    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: 'default',
      title: 'Grindproof',
    });
  });

  it('should export metadata with icons', async () => {
    const layoutModule = await import('@/app/layout');
    const { metadata } = layoutModule;

    expect(metadata.icons).toHaveProperty('icon');
    expect(metadata.icons).toHaveProperty('apple');
    expect(metadata.icons?.icon).toHaveLength(2);
    expect(metadata.icons?.apple).toHaveLength(1);
  });

  it('should export viewport configuration', async () => {
    const layoutModule = await import('@/app/layout');
    const { viewport } = layoutModule;

    expect(viewport.themeColor).toBe('#09090b');
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
    expect(viewport.maximumScale).toBe(5);
    expect(viewport.userScalable).toBe(true);
  });
});

