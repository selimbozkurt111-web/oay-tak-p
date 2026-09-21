// sw.js - Ömer Avniyel Akademi PWA Service Worker
const CACHE_NAME = 'oay-takip-cache-v1';

// Statik temel dosyalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/css/custom.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Önbellek yükleme uyarısı:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First stratejisi (Canlı veri öncelikli, bağlantı yoksa veya yavaşsa önbellekten hızlı açılış)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Firebase Realtime SSE, Firebase DB veya Harici Form servislerini önbelleğe alma
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('formsubmit.co') ||
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Başarılı cevabı arka planda önbelleğe güncelle
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Çevrimdışıysa veya internet kesildiyse önbellekten aç
        return caches.match(event.request).then((cached) => {
          return cached || (event.request.mode === 'navigate' ? caches.match('/index.html') : null);
        });
      })
  );
});
