/* ============================================================
   RealScan Pro — Service Worker (Modo Offline-First Calibrado)
   Desarrollado por Paco Iglesias • Escala 1:1
   ============================================================ */

const CACHE_NAME = 'realscan-cache-v3.2.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/engine.js',
  './js/pdf.js',
  './js/export.js',
  './js/app.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[RealScan SW] Pre-caching parcial completado:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cachedResp) => {
      if (cachedResp) {
        // En background actualizar caché si hay red (stale-while-revalidate)
        fetch(req).then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResp));
          }
        }).catch(() => {});
        return cachedResp;
      }

      return fetch(req).then((networkResp) => {
        if (!networkResp || networkResp.status !== 200 || networkResp.type !== 'basic' && networkResp.type !== 'cors') {
          return networkResp;
        }
        const respToCache = networkResp.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, respToCache);
        });
        return networkResp;
      }).catch(() => {
        if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
