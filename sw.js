/* ============================================================
   RealScan Pro — Service Worker (Modo Offline-First Calibrado)
   Desarrollado por Paco Iglesias • Escala 1:1
   ============================================================ */

const CACHE_NAME = 'realscan-cache-v3.3.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/auth.js',
  './js/storage.js',
  './js/engine.js',
  './js/pdf.js',
  './js/export.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

  // Solo se cachean respuestas del mismo origen; los CDN externos
  // (respuestas opacas) se sirven siempre de red para evitar caché corrupta.
  let sameOrigin = true;
  try { sameOrigin = new URL(req.url, self.location.href).origin === self.location.origin; }
  catch (e) { sameOrigin = false; }

  // Si incluye nocache, saltar caché completamente para pruebas inmediatas
  if (req.url.includes('nocache')) {
    event.respondWith(fetch(req));
    return;
  }

  // Para navegación HTML principal: Red primero con fallback a caché
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((networkResp) => {
        if (sameOrigin && networkResp && networkResp.status === 200) {
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
        if (sameOrigin) {
          fetch(req).then((networkResp) => {
            if (networkResp && networkResp.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResp));
            }
          }).catch(() => {});
        }
        return cachedResp;
      }

      return fetch(req).then((networkResp) => {
        if (!networkResp || networkResp.status !== 200) {
          return networkResp;
        }
        if (sameOrigin) {
          const respToCache = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, respToCache);
          });
        }
        return networkResp;
      });
    })
  );
});
