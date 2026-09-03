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
 * ---------------------------------------------------------------------------
 * A ESTRATEGIA, E O PROBLEMA QUE ELA RESOLVE
 *
 * A primeira versao servia o documento pela rede e TODO o resto pelo cache,
 * revalidando em segundo plano. Parecia razoavel e escondia uma armadilha:
 *
 *   1. O usuario tem a versao antiga instalada e o service worker antigo ativo.
 *   2. Sai um deploy que muda index.html e app.js juntos.
 *   3. O usuario abre o app. O documento vem da rede, entao e o NOVO. Mas quem
 *      controla essa carga ainda e o service worker ANTIGO, que serve app.js do
 *      cache — o VELHO.
 *   4. Resultado: HTML novo rodando com JavaScript velho, por uma visita.
 *
 * E o pior tipo de defeito: so acontece com quem ja usou o app antes, so na
 * primeira visita depois do deploy, e some sozinho quando alguem vai investigar.
 *
 * A correcao poderia ser versionar o nome dos arquivos (app.a1b2.js), mas isso
 * exige build — proibido neste projeto — ou renomear a mao a cada deploy. Ou
 * pendurar ?v=N nas URLs, o que espalharia o mesmo numero por quatro arquivos
 * para quebrar em silencio no dia em que alguem esquecesse um.
 *
 * Entao a regra aqui e outra, e nao depende de ninguem lembrar de nada:
 *
 * - CODIGO DO APP (documento, css, js, manifest): SEMPRE da rede, com o cache
 *   como rede de seguranca. Assim HTML e JavaScript vem sempre do mesmo deploy.
 *   Como conexao ruim nao pode travar a abertura, ha um prazo: passado ele, o
 *   cache atende, e a resposta da rede ainda atualiza o cache para a proxima vez.
 * - O RESTO (icones, a marca): cache primeiro, revalidando em segundo plano.
 *   Sao imutaveis na pratica e e onde esta o peso.
 *
 * O custo e de tres arquivos pequenos por abertura com rede. O ganho e nunca
 * servir uma mistura de duas versoes.
 */

const VERSAO = 'zenny-v4';

/* Depois disto o cache atende, mesmo que a rede ainda venha a responder. Tres
   segundos e o limite do que se aceita olhando para uma tela em branco. */
const PRAZO_DA_REDE = 3000;

/* O escopo e derivado da localizacao do proprio service worker, e nao fixado:
   em producao o app vive em /Zenny/ (GitHub Pages) e em desenvolvimento na
   raiz. Fixar o caminho faria a regra valer so em um dos dois. */
const ESCOPO = new URL('./', self.location).pathname;

const CODIGO_DO_APP = new Set([
  ESCOPO,
  ESCOPO + 'index.html',
  ESCOPO + 'styles.css',
  ESCOPO + 'app.js',
  ESCOPO + 'nucleo.js',
  ESCOPO + 'manifest.webmanifest',
]);

const PARA_GUARDAR_NA_INSTALACAO = [
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
    caches
      .open(VERSAO)
      // addAll e tudo-ou-nada: um recurso fora do ar reprovaria a instalacao
      // inteira. Cada um por si, e o que falhar entra na primeira visita.
      .then((cache) => Promise.allSettled(PARA_GUARDAR_NA_INSTALACAO.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((chave) => chave !== VERSAO).map((chave) => caches.delete(chave)))
      )
      .then(() => self.clients.claim())
  );
});

function guardar(requisicao, resposta) {
  if (!resposta || !resposta.ok) return;
  const copia = resposta.clone();
  caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
}

/* Rede primeiro, com prazo. O relogio nao cancela a requisicao: se a rede
   responder depois, a resposta ainda serve para atualizar o cache — o usuario
   ja recebeu a versao guardada, e a proxima abertura pega a nova. */
function redePrimeiro(requisicao) {
  return new Promise((resolver) => {
    let entregue = false;
    const entregar = (resposta) => {
      if (entregue || !resposta) return;
      entregue = true;
      resolver(resposta);
    };

    const relogio = setTimeout(() => {
      caches.match(requisicao).then(entregar);
    }, PRAZO_DA_REDE);

    fetch(requisicao)
      .then((resposta) => {
        clearTimeout(relogio);
        guardar(requisicao, resposta);
        entregar(resposta);
      })
      .catch(() => {
        clearTimeout(relogio);
        caches.match(requisicao).then((doCache) => {
          // Numa navegacao sem rede e sem a pagina no cache, o index guardado
          // ainda serve: o app inteiro roda com dados locais.
          if (doCache) return entregar(doCache);
          if (requisicao.mode === 'navigate') {
            return caches.match(ESCOPO + 'index.html').then((indice) =>
              entregar(indice || Response.error())
            );
          }
          entregar(Response.error());
        });
      });
  });
}

/* Cache primeiro, revalidando em segundo plano. */
function cachePrimeiro(requisicao) {
  return caches.match(requisicao).then((doCache) => {
    const daRede = fetch(requisicao)
      .then((resposta) => {
        guardar(requisicao, resposta);
        return resposta;
      })
      // Sem rede e sem nada guardado — um icone que nunca foi baixado, por
      // exemplo — devolve falha explicita. Deixar a promessa resolver em
      // undefined daria no mesmo para o usuario, mas com um aviso confuso no
      // console dizendo que o service worker respondeu errado.
      .catch(() => doCache || Response.error());

    return doCache || daRede;
  });
}

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  const ehCodigo = requisicao.mode === 'navigate' || CODIGO_DO_APP.has(url.pathname);
  evento.respondWith(ehCodigo ? redePrimeiro(requisicao) : cachePrimeiro(requisicao));
});
