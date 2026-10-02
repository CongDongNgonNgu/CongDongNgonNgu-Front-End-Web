const CACHE_PREFIX = 'congdongngonngu-';
const CACHE_VERSION = 'shell-v1';
const SHELL_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}images-v1`;
const OFFLINE_URL = '/offline.html';
const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/ai',
  '/api/',
  '/auth',
  '/exchange',
  '/library/contribute',
  '/library/review',
  '/login',
  '/membership',
  '/payments',
  '/notifications',
  '/onboarding',
  '/profile',
  '/register',
  '/reset-password',
  '/rooms',
  '/verify-email',
];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function classifyRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return 'pass-through';
  if (request.method !== 'GET') return 'network-only';
  if (url.pathname === '/sw.js' || isPrivatePath(url.pathname)) return 'network-only';
  if (request.mode === 'navigate') return url.search ? 'pass-through' : 'public-navigation';
  if (request.destination === 'image' && (url.pathname.startsWith('/brand/') || url.pathname.startsWith('/assets/'))) return 'public-image';
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font' || url.pathname === '/manifest.webmanifest' || url.pathname === OFFLINE_URL) return 'static-asset';
  return 'pass-through';
}

async function cacheResponse(cacheName, request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handlePublicNavigation(request) {
  try {
    return await cacheResponse(SHELL_CACHE, request, await fetch(request));
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return cacheResponse(SHELL_CACHE, request, await fetch(request));
}

async function handlePublicImage(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request).then((response) => cacheResponse(IMAGE_CACHE, request, response)).catch(() => cached);
  return cached || refresh;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, IMAGE_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const kind = classifyRequest(event.request);
  if (kind === 'public-navigation') {
    event.respondWith(handlePublicNavigation(event.request));
  } else if (kind === 'static-asset') {
    event.respondWith(handleStaticAsset(event.request));
  } else if (kind === 'public-image') {
    event.respondWith(handlePublicImage(event.request));
  } else if (kind === 'network-only' && event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
  }
});
