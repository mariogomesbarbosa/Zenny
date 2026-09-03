/* Service worker do Zenny.
 *
 * Existe por duas razoes, nesta ordem:
 *
 * 1. E ele que faz o Chrome no Android instalar um APP DE VERDADE (WebAPK) em
 *    vez de um atalho de favorito. Sem manifest e sem service worker, o
 *    "Adicionar a tela inicial" cria um atalho legado.
 * 2. Faz o app abrir sem rede. O publico-alvo esta em dado movel limitado, e os
 *    dados ja sao locais — o que faltava era o app carregar.
 *
 * Estrategia, e o porque de cada uma:
 *
 * - DOCUMENTO (index.html): rede primeiro, cache como rede de seguranca. Cache
 *   primeiro no documento significaria continuar vendo a versao velha depois de
 *   um deploy — o problema classico. Rede primeiro custa alguns milissegundos e
 *   paga com "abrir online e sempre a versao nova".
 * - RESTO (css, js, icones): serve do cache e revalida em segundo plano. E onde
 *   esta o peso, e a defasagem de uma visita e aceitavel.
 */

const VERSAO = 'zenny-v3';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './nucleo.js',
  './manifest.webmanifest',
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      // addAll e tudo-ou-nada: um recurso fora do ar reprovaria a instalacao
      // inteira. Cada um por si, e o que falhar entra na primeira visita.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== VERSAO).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  // Documento: rede primeiro.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
          return resposta;
        })
        .catch(() => caches.match(requisicao).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Resto: cache primeiro, revalidando em segundo plano.
  evento.respondWith(
    caches.match(requisicao).then((doCache) => {
      const daRede = fetch(requisicao)
        .then((resposta) => {
          if (resposta && resposta.ok) {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        })
        .catch(() => doCache);

      return doCache || daRede;
    })
  );
});
