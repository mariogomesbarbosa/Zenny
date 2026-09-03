/* Zenny — esqueleto do app (bloco B0).
 *
 * Aqui nao ha nenhuma regra de negocio ainda: so a navegacao entre telas, o
 * tema e o registro do service worker. Dinheiro entra no modelo no B1, e
 * quando entrar vem acompanhado de teste (ver CLAUDE.md).
 */

(function () {
  'use strict';

  const TELAS = ['inicio', 'gastos', 'metas'];
  const TELA_PADRAO = 'inicio';
  const CHAVE_TEMA = 'zenny-tema';

  /* localStorage pode lancar em aba anonima com cookies bloqueados. Um app que
     quebra inteiro porque nao conseguiu salvar a preferencia de tema seria um
     jeito bobo de perder usuario. */
  const armazenamento = {
    ler(chave) {
      try { return localStorage.getItem(chave); } catch (e) { return null; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, valor); } catch (e) { /* segue sem salvar */ }
    },
  };

  /* ---------- Navegacao ---------- */

  function telaDaUrl() {
    const nome = (location.hash || '').replace(/^#\/?/, '');
    return TELAS.includes(nome) ? nome : TELA_PADRAO;
  }

  function mostrarTela(nome) {
    for (const tela of TELAS) {
      document.getElementById('tela-' + tela).hidden = tela !== nome;
    }

    for (const link of document.querySelectorAll('.navegacao a')) {
      // aria-current e removido, nao definido como "false": leitores de tela
      // anunciam qualquer valor presente.
      if (link.dataset.tela === nome) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    // Trocar de tela sem voltar ao topo deixa a nova tela parecendo cortada.
    document.getElementById('conteudo').scrollTop = 0;
  }

  window.addEventListener('hashchange', () => mostrarTela(telaDaUrl()));

  /* ---------- Tema ---------- */

  function aplicarTema(tema) {
    if (tema) document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
  }

  function temaEmUso() {
    const salvo = document.documentElement.dataset.tema;
    if (salvo) return salvo;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }

  document.getElementById('botao-tema').addEventListener('click', () => {
    const proximo = temaEmUso() === 'escuro' ? 'claro' : 'escuro';
    aplicarTema(proximo);
    armazenamento.gravar(CHAVE_TEMA, proximo);
  });

  /* ---------- Aviso temporario ---------- */

  let timerDoAviso = null;

  function avisar(texto) {
    const aviso = document.getElementById('aviso');
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(timerDoAviso);
    timerDoAviso = setTimeout(() => { aviso.hidden = true; }, 3200);
  }

  document.getElementById('botao-registrar').addEventListener('click', () => {
    avisar('Registrar gastos chega no B1.');
  });

  /* ---------- Service worker ---------- */

  /* Registra depois do load: em Android de entrada, disputar banda com o
     primeiro carregamento atrasa a tela que o usuario esta esperando. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* Sem service worker o app continua funcionando online. Nao ha o que
           dizer ao usuario aqui. */
      });
    });
  }

  /* ---------- Inicio ---------- */

  mostrarTela(telaDaUrl());
})();
