// Service worker : l'appli s'ouvre même sans réseau (installée sur le téléphone).
const CACHE = 'examens-v31';
const FILES = ['./', 'index.html', 'app.js', 'icon.svg', 'manifest.webmanifest', 'config.js',
  'vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('examens-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Réseau d'abord (toujours la dernière version), cache si hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  const frais = new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' });
  e.respondWith(fetch(frais).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
