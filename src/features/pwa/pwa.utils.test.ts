import { describe, expect, it } from 'vitest';
import { classifyPwaRequest, getInstallSurface, isStandaloneDisplayMode } from './pwa.utils';

describe('classifyPwaRequest', () => {
  it('keeps API and mutation requests network-only', () => {
    expect(classifyPwaRequest({ url: 'https://app.test/api/v1/languages', method: 'GET' })).toBe('network-only');
    expect(classifyPwaRequest({ url: 'https://app.test/community/posts/1', method: 'POST' })).toBe('network-only');
  });

  it('keeps private and payment routes network-only', () => {
    expect(classifyPwaRequest({ url: 'https://app.test/admin', destination: 'document' })).toBe('network-only');
    expect(classifyPwaRequest({ url: 'https://app.test/membership/checkout/order-1', destination: 'document' })).toBe('network-only');
    expect(classifyPwaRequest({ url: 'https://app.test/payments/checkout', destination: 'document' })).toBe('network-only');
    expect(classifyPwaRequest({ url: 'https://app.test/notifications', destination: 'document' })).toBe('network-only');
  });

  it('allows only query-free public documents into the public navigation cache', () => {
    expect(classifyPwaRequest({ url: 'https://app.test/languages/english', destination: 'document' })).toBe('public-navigation');
    expect(classifyPwaRequest({ url: 'https://app.test/languages/english?level=B2', destination: 'document' })).toBe('pass-through');
  });

  it('allows branded same-origin images and hashed assets to use safe caches', () => {
    expect(classifyPwaRequest({ url: 'https://app.test/brand/congdongngonngu-mark.png', destination: 'image' })).toBe('public-image');
    expect(classifyPwaRequest({ url: 'https://app.test/assets/app-abc123.js', destination: 'script' })).toBe('static-asset');
    expect(classifyPwaRequest({ url: 'https://cdn.example.test/app.js', destination: 'script' })).toBe('pass-through');
  });
});

describe('install state helpers', () => {
  it('uses iOS guidance when the platform has no browser install prompt', () => {
    expect(getInstallSurface({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', hasInstallPrompt: false, standalone: false })).toBe('ios-guide');
  });

  it('uses the browser prompt only when the app is not already installed', () => {
    expect(getInstallSurface({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0', hasInstallPrompt: true, standalone: false })).toBe('browser-prompt');
    expect(getInstallSurface({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0', hasInstallPrompt: true, standalone: true })).toBe('installed');
  });

  it('recognizes standalone display mode without requiring navigator storage', () => {
    expect(isStandaloneDisplayMode({ displayModeMatches: true, navigatorStandalone: false })).toBe(true);
    expect(isStandaloneDisplayMode({ displayModeMatches: false, navigatorStandalone: true })).toBe(true);
    expect(isStandaloneDisplayMode({ displayModeMatches: false, navigatorStandalone: false })).toBe(false);
  });
});
