// Service worker: saves the app (and every picture) on the device so it opens with no signal.
//
// IMPORTANT: whenever any file below changes, bump VERSION (tools/bump.sh).
// That is how phones, iPads and TVs learn there's an update to download.
const VERSION = 'v16';
const NAME = 'song-party';
const CACHE = `${NAME}-${VERSION}`;
const FONTS = 'song-party-fonts';

importScripts('pics.js');   // the picture list (PICS)

const ASSETS = [
  './',
  './index.html',
  './move.js',
  './suite.js',
  './share.js',
  './pics.js',
  './app.js',
  './sound.js',
  './hole.js',
  './madlib.js',
  './remote.js',
  './slides.js',
  './vendor/paho-mqtt.min.js',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
].concat([...new Set(Object.values(PICS))].map((code) => `./pics/${code}.svg`));

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Ask for each file with the version number on it, so GitHub's servers can't hand back a stale copy.
    caches.open(CACHE).then((cache) => Promise.all(ASSETS.map((url) =>
      fetch(`${url}?v=${VERSION}`, { cache: 'reload' }).then((res) => {
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        return cache.put(url, res);
      })
    )))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(`${NAME}-v`) && key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// The page sends this when you tap "Update".
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Google Fonts: keep a copy after the first visit so the fonts work offline too.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then((cache) =>
        cache.match(request).then((cached) => {
          const fresh = fetch(request).then((res) => { cache.put(request, res.clone()); return res; });
          return cached || fresh;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then((c) => c.match('./index.html')).then((cached) => cached || fetch(request)));
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((c) => c.match(request, { ignoreSearch: true })).then((cached) => cached || fetch(request))
  );
});
