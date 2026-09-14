/* =========================================================================
   Service Worker escopado por aplicativo.
   Copie este arquivo para DENTRO da pasta de cada projeto (Zenny/sw.js e
   Daysk/sw.js) e altere APENAS a constante APP_ID em cada cópia.
   Um sw.js na raiz do repositório username.github.io controlaria os dois
   apps ao mesmo tempo — é exatamente o que queremos evitar.
   ========================================================================= */

const APP_ID = 'zenny';          // <-- em Daysk/sw.js troque para 'daysk'
const VERSION = 'v4';
const CACHE_NAME = `${APP_ID}-${VERSION}`;

// Caminhos relativos ao sw.js, ou seja, relativos à pasta do app.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './drive.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(`${APP_ID}-`) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Ignora qualquer requisição fora do escopo deste app.
  if (!request.url.startsWith(self.registration.scope)) return;

  // Rede primeiro, cai para o cache offline: garante que atualizações cheguem imediatamente
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
