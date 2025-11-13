import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PWA Manifest Validation', () => {
  let manifest: any;

  it('should have a valid manifest.json file', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    
    expect(() => {
      manifest = JSON.parse(manifestContent);
    }).not.toThrow();
  });

  it('should have required manifest fields', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('theme_color');
    expect(manifest).toHaveProperty('background_color');
    expect(manifest).toHaveProperty('icons');
  });

  it('should have correct app name', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.name).toContain('Grindproof');
    expect(manifest.short_name).toBe('Grindproof');
  });

  it('should have standalone display mode', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.display).toBe('standalone');
  });

  it('should have correct start_url', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.start_url).toBe('/dashboard');
  });

  it('should have theme colors configured', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.theme_color).toBe('#09090b');
    expect(manifest.background_color).toBe('#09090b');
  });

  it('should have minimum required icon sizes', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
    
    // PWA requires at least 192x192 and 512x512
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
  });

  it('should have maskable icons', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    const maskableIcons = manifest.icons.filter((icon: any) => 
      icon.purpose === 'maskable'
    );
    
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  it('should have valid icon paths', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    manifest.icons.forEach((icon: any) => {
      expect(icon.src).toMatch(/^\/icons\//);
      expect(icon).toHaveProperty('sizes');
      expect(icon).toHaveProperty('type');
    });
  });

  it('should have shortcuts configured', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    expect(manifest.shortcuts).toBeDefined();
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
  });

  it('should have valid shortcut URLs', () => {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    manifest.shortcuts.forEach((shortcut: any) => {
      expect(shortcut).toHaveProperty('name');
      expect(shortcut).toHaveProperty('url');
      expect(shortcut.url).toMatch(/^\//); // Should be relative URL
    });
  });
});

describe('Next.js PWA Configuration', () => {
  it('should have next-pwa package installed', () => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.dependencies).toHaveProperty('next-pwa');
  });

  it('should have service worker types installed', () => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.devDependencies).toHaveProperty('@types/serviceworker');
  });

  it('should have icon generation script', () => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts).toHaveProperty('generate:icons');
  });
});

describe('PWA Icons Existence', () => {
  const requiredIcons = [
    'icon-72x72.png',
    'icon-96x96.png',
    'icon-128x128.png',
    'icon-144x144.png',
    'icon-152x152.png',
    'icon-192x192.png',
    'icon-384x384.png',
    'icon-512x512.png',
    'icon-192x192-maskable.png',
    'icon-512x512-maskable.png',
  ];

  requiredIcons.forEach((iconName) => {
    it(`should have ${iconName}`, () => {
      const iconPath = join(process.cwd(), 'public', 'icons', iconName);
      
      expect(() => {
        readFileSync(iconPath);
      }).not.toThrow();
    });
  });

  it('should have apple-touch-icon in public root', () => {
    const iconPath = join(process.cwd(), 'public', 'apple-touch-icon.png');
    
    expect(() => {
      readFileSync(iconPath);
    }).not.toThrow();
  });

  it('should have icon templates for regeneration', () => {
    const templatePath = join(process.cwd(), 'public', 'icons', 'icon-template.svg');
    const maskableTemplatePath = join(process.cwd(), 'public', 'icons', 'icon-template-maskable.svg');
    
    expect(() => {
      readFileSync(templatePath);
      readFileSync(maskableTemplatePath);
    }).not.toThrow();
  });
});

describe('PWA Next.js Config', () => {
  it.skip('should export PWA configuration', async () => {
    // Skip: requires webpack which is not available in test environment
    // Config is tested by successful build
  });
});

describe('GitIgnore PWA Files', () => {
  it('should ignore generated service worker files', () => {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');

    expect(gitignoreContent).toContain('sw.js');
    expect(gitignoreContent).toContain('workbox');
  });
});

