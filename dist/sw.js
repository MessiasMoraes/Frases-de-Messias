const CACHE_NAME = 'frases-messias-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './imagens/categorias/amizade.png',
  './imagens/categorias/amor.png',
  './imagens/categorias/boa-noite.png',
  './imagens/categorias/bom-dia.png',
  './imagens/categorias/esperanca.png',
  './imagens/categorias/familia.png',
  './imagens/categorias/fe.png',
  './imagens/categorias/gratidao.png',
  './imagens/categorias/motivacao.png',
  './imagens/categorias/reflexao.png',
  './imagens/categorias/sucesso.png',
  './imagens/categorias/vida.png'
];

// Instalação: Cacheia assets iniciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: Estratégia Cache First para imagens e Network First para o resto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Estratégia para Imagens (Cache First)
  if (event.request.destination === 'image' || url.hostname.includes('picsum.photos')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // Estratégia Network First para outros recursos
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
