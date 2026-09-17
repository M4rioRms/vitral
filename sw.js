/* Service worker de Vitral.
   Estrategia:
   - El armazón de la app (HTML, iconos, manifiesto) se cachea al instalar y se
     sirve desde caché, actualizándose en segundo plano.
   - Las portadas de Spotify se cachean al vuelo, así el historial sigue viéndose
     sin conexión.
   - Las búsquedas y demás llamadas a /api/ nunca se cachean: siempre a la red. */

const VERSION = 'vitral-v1';
const SHELL = VERSION + '-shell';
const MEDIA = VERSION + '-media';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())        // si algo falla, no bloquear la instalación
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nada de terceros

  // portadas: caché primero, y si no está, red (y se guarda)
  if (url.pathname === '/api/cover') {
    e.respondWith(
      caches.open(MEDIA).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // el resto de /api/ siempre a la red
  if (url.pathname.startsWith('/api/')) return;

  // armazón: caché primero y refresco en segundo plano
  e.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit || new Response('', { status: 504 }));
      return hit || net;
    })
  );
});
