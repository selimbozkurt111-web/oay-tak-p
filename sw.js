// sw.js - Ömer Avniyel Akademi PWA Service Worker (v10.47 - Kararlı Canlı Bağlantı ve Çökme Koruması)
const CACHE_NAME = 'oay-takip-cache-v10.47';

// Statik temel dosyalar
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/custom.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Önbellek yükleme:', err);
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'FORCE_PURGE') {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  }
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

// Canlı veri öncelikli, asla ERR_FAILED verdirtmeyen güvenli ağ motoru
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Firebase Realtime, Formsubmit, CDN servislerini SW karışmasın
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('formsubmit.co') ||
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  // Sayfa açılışları (HTML navigasyonları)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request)
          .then((cached) => cached || caches.match('./index.html') || caches.match('index.html'))
          .then((res) => {
            if (res) return res;
            return new Response(
              '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Ömer Avniyel Akademi</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;"><h2>Bağlantı Kuruluyor...</h2><p>Lütfen sayfayı yenileyiniz.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:10px;background:#f59e0b;color:#000;font-weight:bold;cursor:pointer;border:none;">Sayfayı Yenile</button></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
      })
    );
    return;
  }

  // JS, JSON ve CSV dosyaları: Önce doğrudan ağa sor, yoksa önbellekten al
  if (url.endsWith('.html') || url.includes('/js/') || url.endsWith('.json') || url.endsWith('.csv')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Diğer statik varlıklar (resimler, css vb.)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
