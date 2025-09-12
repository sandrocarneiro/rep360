// Service Worker para Cifras de Violão
const CACHE_VERSION = 'v2.6.0';
const CACHE_NAME = `cifras-${CACHE_VERSION}`;

// Use caminhos relativos para funcionar em subpaths
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './cifras/songs.json',
  './cifras/tom-jobim-garota-de-ipanema.txt',
  './cifras/alceu-valenca-anunciacao.txt',
  './cifras/capital-inicial-nao-olhe-pra-tras.txt',
  './cifras/ze-ramalho-vila-do-sossego.txt',
  './cifras/raul-seixas-tente-outra-vez.txt',
  './cifras/chiclete-com-banana-selva-branca.txt'
];

self.addEventListener('install', (event) => {
  // Ativa imediatamente a nova SW
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((error) => {
        console.log('Erro ao precache:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Assume controle imediatamente
  event.waitUntil((async () => {
    // Limpar caches antigos
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    );
    await self.clients.claim();
    // Notificar clientes que há nova versão ativa
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of clientsList) {
      client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
    }
  })());
});

// Estratégias de cache
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Para navegações (HTML), usar network-first para obter novas versões
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Para arquivos JSON e TXT, SEMPRE usar network-first para garantir atualizações
  if (url.pathname.includes('songs.json') || url.pathname.endsWith('.txt')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Para CSS/JS/Fonts/Images, usar stale-while-revalidate
  if ([ 'style', 'script', 'font', 'image' ].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Fallback: tentar cache, senão rede
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
