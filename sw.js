/* ============================================================
   RealScan Pro — Service Worker (Modo Offline-First Calibrado)
   Desarrollado por Paco Iglesias • Escala 1:1
   ============================================================ */

const CACHE_NAME = 'realscan-cache-v3.3.0';

// Activos esenciales locales imprescindibles para el funcionamiento de la app
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/audio.js',
  './js/qr-sync.js',
  './js/auth.js',
  './js/storage.js',
  './js/crop-warp.js',
  './js/engine.js',
  './js/layout-engine.js',
  './js/pdf.js',
  './js/export.js',
  './js/app.js',
  './phone-upload.html',
  './phone-download.html'
];

// Activos externos u opcionales (CDNs)
const OPTIONAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Lista consolidada de activos estáticos para compatibilidad con auditorías y suites
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/audio.js',
  './js/qr-sync.js',
  './js/auth.js',
  './js/storage.js',
  './js/crop-warp.js',
  './js/engine.js',
  './js/layout-engine.js',
  './js/pdf.js',
  './js/export.js',
  './js/app.js',
  './phone-upload.html',
  './phone-download.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Precargar activos esenciales locales uno por uno para garantizar que todos queden en caché
      for (const asset of CORE_ASSETS) {
        try {
          const resp = await fetch(asset, { cache: 'no-cache' });
          if (resp && resp.ok) {
            await cache.put(asset, resp.clone());
            // Si es index.html o './', asociarlo a ambas claves para asegurar acceso por ruta raíz
            if (asset === './index.html') {
              await cache.put('./', resp.clone());
            } else if (asset === './') {
              await cache.put('./index.html', resp.clone());
            }
          }
        } catch (err) {
          console.warn('[RealScan SW] Advertencia al precachear activo esencial:', asset, err);
        }
      }

      // 2. Intentar precargar activos externos opcionales en paralelo sin bloquear si alguno falla
      await Promise.allSettled(
        OPTIONAL_ASSETS.map(async (asset) => {
          try {
            const resp = await fetch(asset, { mode: 'cors' });
            if (resp && resp.ok) {
              await cache.put(asset, resp);
            }
          } catch (e) {
            // Falla de red permitida para CDNs externos
          }
        })
      );
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

  // Para navegación HTML principal: Red primero con fallback robusto a caché (await asíncrono real)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(async (networkResp) => {
        if (networkResp && networkResp.status === 200) {
          const respToCache = networkResp.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, respToCache);
          await cache.put('./index.html', networkResp.clone());
          await cache.put('./', networkResp.clone());
        }
        return networkResp;
      }).catch(async () => {
        // Fallback offline garantizado esperando promesas con await
        const cachedDirect = await caches.match(req);
        if (cachedDirect) return cachedDirect;
        const cachedIndex = await caches.match('./index.html');
        if (cachedIndex) return cachedIndex;
        const cachedRoot = await caches.match('./');
        if (cachedRoot) return cachedRoot;
        return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>RealScan — Sin Conexión</title></head><body><h1>RealScan Pro</h1><p>No se encontró una versión en caché para abrir la aplicación sin conexión.</p></body></html>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Para el resto de activos estáticos: Caché primero con actualización en segundo plano
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(async (cachedResp) => {
      if (cachedResp) {
        // Revalidación en segundo plano si la red está disponible
        fetch(req).then(async (networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, networkResp);
          }
        }).catch(() => {});
        return cachedResp;
      }

      try {
        const networkResp = await fetch(req);
        if (networkResp && networkResp.status === 200) {
          const respToCache = networkResp.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, respToCache);
        }
        return networkResp;
      } catch (err) {
        // En offline, si no está en caché y falla fetch
        return new Response('', { status: 408, statusText: 'Offline Resource Unavailable' });
      }
    })
  );
});
