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
  './js/auth.js',
  './js/storage.js',
  './js/engine.js',
  './js/layout-engine.js',
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

  // Si incluye nocache, saltar caché completamente para pruebas inmediatas
  if (req.url.includes('nocache')) {
    event.respondWith(fetch(req));
    return;
  }

  // Para navegación HTML principal: Red primero con fallback a caché
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((networkResp) => {
        if (networkResp && networkResp.status === 200) {
          const respToCache = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respToCache));
        }
        return networkResp;
      }).catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Para el resto de activos estáticos: Caché primero con actualización en fondo
  event.respondWith(
    caches.match(req).then((cachedResp) => {
      if (cachedResp) {
        fetch(req).then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResp));
          }
        }).catch(() => {});
        return cachedResp;
      }

      return fetch(req).then((networkResp) => {
        if (!networkResp || networkResp.status !== 200) {
          return networkResp;
        }
        const respToCache = networkResp.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, respToCache);
        });
        return networkResp;
      });
    })
  );
});
