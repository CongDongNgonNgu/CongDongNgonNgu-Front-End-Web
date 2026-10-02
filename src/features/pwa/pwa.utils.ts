export type PwaRequestKind = 'network-only' | 'public-navigation' | 'public-image' | 'static-asset' | 'pass-through';

export type InstallSurface = 'browser-prompt' | 'ios-guide' | 'installed' | 'none';

const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/ai',
  '/auth',
  '/exchange',
  '/library/contribute',
  '/library/review',
  '/login',
  '/membership',
  '/notifications',
  '/onboarding',
  '/payments',
  '/profile',
  '/register',
  '/reset-password',
  '/rooms',
  '/verify-email',
];

const API_PATH_PREFIX = '/api/';

function startsWithPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPrivatePwaPath(pathname: string): boolean {
  return pathname.startsWith(API_PATH_PREFIX) || PRIVATE_PATH_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

export function classifyPwaRequest(
  input: { url: string; method?: string; destination?: string },
  origin = 'https://app.test',
): PwaRequestKind {
  let url: URL;
  try {
    url = new URL(input.url, origin);
  } catch {
    return 'pass-through';
  }

  if (url.origin !== origin) return 'pass-through';
  if (input.method && input.method.toUpperCase() !== 'GET') return 'network-only';
  if (isPrivatePwaPath(url.pathname)) return 'network-only';
  if (input.destination === 'document') return url.search ? 'pass-through' : 'public-navigation';
  if (input.destination === 'image' && (url.pathname.startsWith('/brand/') || url.pathname.startsWith('/assets/'))) return 'public-image';
  if (input.destination === 'script' || input.destination === 'style' || input.destination === 'font' || url.pathname === '/manifest.webmanifest' || url.pathname === '/offline.html') return 'static-asset';
  return 'pass-through';
}

export function isStandaloneDisplayMode(input: { displayModeMatches: boolean; navigatorStandalone: boolean }): boolean {
  return input.displayModeMatches || input.navigatorStandalone;
}

export function getInstallSurface(input: { userAgent: string; hasInstallPrompt: boolean; standalone: boolean }): InstallSurface {
  if (input.standalone) return 'installed';
  if (input.hasInstallPrompt) return 'browser-prompt';
  if (/iphone|ipad|ipod/i.test(input.userAgent)) return 'ios-guide';
  return 'none';
}

export function isInstallDismissed(storage: Storage | undefined): boolean {
  try {
    return storage?.getItem('congdongngonngu:pwa-install-dismissed') === '1';
  } catch {
    return false;
  }
}

export function markInstallDismissed(storage: Storage | undefined): void {
  try {
    storage?.setItem('congdongngonngu:pwa-install-dismissed', '1');
  } catch {
    // A blocked storage area should never prevent the app from rendering.
  }
}
