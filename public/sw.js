/* Service worker mínimo para Aurya — habilita "Adicionar à tela inicial"
 * com modo standalone e cache do shell.
 *
 * Estratégia conservadora:
 *  - Cache APENAS de assets estáticos (precache do shell + runtime cache de imagens).
 *  - NUNCA cacheia chamadas /api/* (sempre vai para a rede).
 *  - Versão controlada por CACHE_VERSION; ao publicar nova versão do app,
 *    bumpe o número e o SW limpa caches antigos no `activate`.
 *  - AUTO-INERTE em localhost/IP local: se o SW for instalado por engano em dev,
 *    se desinstala sozinho no install/activate e nunca intercepta requests.
 */

const CACHE_VERSION = 'aurya-shell-v2';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

function ehAmbienteDev() {
  const h = self.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  return false;
}

async function autoDesinstalar() {
  try {
    await self.registration.unregister();
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('aurya-')).map((n) => caches.delete(n)));
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.navigate(c.url));
  } catch {
    /* ignora */
  }
}

self.addEventListener('install', (event) => {
  if (ehAmbienteDev()) {
    event.waitUntil(autoDesinstalar());
    return;
  }
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (ehAmbienteDev()) {
    event.waitUntil(autoDesinstalar());
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((n) => n !== CACHE_VERSION && n.startsWith('aurya-'))
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Em dev: NÃO intercepta nada. Deixa o navegador resolver normalmente
  // (importante para HMR do Vite e qualquer outra rota interna do servidor de dev).
  if (ehAmbienteDev()) return;

  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nunca cacheia API, socket.io, uploads, websocket
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/uploads/')) return;

  // network-first para HTML (sempre prefere versão fresca; cai no cache se offline)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia)).catch(() => undefined);
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c ?? caches.match('/index.html'))),
    );
    return;
  }

  // cache-first para o resto (JS/CSS/imagens) — assets levam hash, então é seguro
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copia = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia)).catch(() => undefined);
          }
          return resp;
        })
        .catch(() => cached);
    }),
  );
});
