/**
 * Buddy Vision - Service Worker
 * Provides offline capability and caching
 */

const CACHE_NAME = 'buddy-vision-v1';
const OFFLINE_CACHE = 'buddy-vision-offline-v1';

// Core files to cache for offline use
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/vision.js',
    '/ai.js',
    '/voice.js',
    '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API requests (OpenAI, Google Vision)
    if (request.url.includes('api.openai.com') ||
        request.url.includes('vision.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached response if found
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', request.url);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(request)
                    .then((networkResponse) => {
                        // Don't cache if not successful
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // Clone response (can only be read once)
                        const responseToCache = networkResponse.clone();

                        // Cache for offline use (only same-origin)
                        if (request.url.startsWith(self.location.origin)) {
                            caches.open(OFFLINE_CACHE)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });
                        }

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('Service Worker: Fetch failed', error);

                        // Return offline page for navigation requests
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }

                        // Return error for other requests
                        return new Response('Offline - Unable to fetch resource', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Message event - handle commands from main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_DESCRIPTION') {
        // Cache a description for offline replay
        caches.open(OFFLINE_CACHE)
            .then((cache) => {
                const description = event.data.description;
                const timestamp = new Date().toISOString();

                // Store as a synthetic response
                const response = new Response(JSON.stringify({
                    description,
                    timestamp
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });

                cache.put(`/offline-description-${timestamp}`, response);
            });
    }
});

// Background sync (for future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-descriptions') {
        console.log('Service Worker: Syncing cached descriptions');
        // Future: sync cached descriptions when back online
    }
});

// Push notification support (for future enhancement)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body || 'New update from Buddy Vision',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Buddy Vision', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

console.log('Service Worker: Script loaded');
