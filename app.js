/* Zenny — o mês, as entradas e as saídas (bloco B1).
 *
 * Este arquivo cuida do DOM e de mais nada. Toda conta vive em nucleo.js, que
 * não sabe que existe navegador e por isso é testável direto pelo node
 * (tests/nucleo.mjs).
 */

import {
  CHAVE,
  analisarValor,
  formatarDinheiro,
  valorParaCampo,
  mesDe,
  deslocarMes,
  rotuloDoMes,
  diaDe,
  estadoVazio,
  normalizarEstado,
  lancamentosDoMes,
  resumoDoMes,
  proporcoesDoResumo,
} from './nucleo.js';

const TELAS = ['inicio', 'lista', 'metas'];
const TELA_PADRAO = 'inicio';
const CHAVE_TEMA = 'zenny-tema';

const $ = (id) => document.getElementById(id);

/* localStorage lança em aba anônima com cookies bloqueados. Um app que quebra
   inteiro porque não conseguiu gravar seria um jeito bobo de perder usuário: em
   vez disso ele segue funcionando, só sem lembrar depois de fechar. */
const armazenamento = {
  ler(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (e) {
      return null;
    }
  },
  gravar(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
      return true;
    } catch (e) {
      return false;
    }
  },
};

/* ---------- Estado ---------- */

function hojeISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let estado = estadoVazio();
let mesVisivel = mesDe(new Date());
let editando = null;
let tipoDoFormulario = 'entrada';
let desfazer = null;
let timerDoAviso = null;

function carregar() {
  const bruto = armazenamento.ler(CHAVE);
  if (!bruto) return estadoVazio();
  try {
    return normalizarEstado(JSON.parse(bruto));
  } catch (e) {
    // Dado corrompido não pode impedir o app de abrir. Começar vazio é ruim;
    // uma tela morta é pior.
    return estadoVazio();
  }
}

function salvar() {
  armazenamento.gravar(CHAVE, JSON.stringify(estado));
  desenhar();
}

/* ---------- Desenho ---------- */

function desenhar() {
  const doMes = lancamentosDoMes(estado.lancamentos, mesVisivel);
  const resumo = resumoDoMes(estado.lancamentos, mesVisivel);

  desenharCabecalho();
  desenharInicio(doMes, resumo);
  desenharLista(doMes);
}

function desenharCabecalho() {
  $('rotulo-do-mes').textContent = rotuloDoMes(mesVisivel);
  $('botao-hoje').hidden = mesVisivel === mesDe(new Date());
}

function desenharInicio(doMes, resumo) {
  const negativa = resumo.sobra < 0;

  $('rotulo-da-sobra').textContent = negativa ? 'O que falta este mês' : 'O que sobra este mês';
  $('valor-da-sobra').textContent = formatarDinheiro(Math.abs(resumo.sobra));
  $('valor-da-sobra').classList.toggle('negativo', negativa);

  $('explicacao-da-sobra').textContent = doMes.length
    ? doMes.length === 1
      ? 'De 1 registro neste mês.'
      : `De ${doMes.length} registros neste mês.`
    : 'Nada registrado neste mês ainda.';

  $('valor-entrou').textContent = formatarDinheiro(resumo.entrou);
  $('valor-saiu').textContent = formatarDinheiro(resumo.saiu);

  const proporcao = proporcoesDoResumo(resumo);
  $('barra-entrou').style.width = proporcao.entrou + '%';
  $('barra-saiu').style.width = proporcao.saiu + '%';

  // O convite some assim que existe qualquer registro — em qualquer mês, não só
  // no visível: quem já usou o app não precisa mais ser convidado.
  $('convite-do-inicio').hidden = estado.lancamentos.length > 0;
}

function desenharLista(doMes) {
  const lista = $('lista-de-lancamentos');
  lista.textContent = '';

  $('vazio-da-lista').hidden = doMes.length > 0;
  $('subtitulo-da-lista').hidden = doMes.length === 0;

  for (const lancamento of doMes) {
    lista.appendChild(linhaDoLancamento(lancamento));
  }
}

function linhaDoLancamento(lancamento) {
  const entrada = lancamento.tipo === 'entrada';

  const item = document.createElement('li');
  item.className = 'lancamento';

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'lancamento-toque';
  botao.setAttribute(
    'aria-label',
    `Editar ${lancamento.descricao}, ${entrada ? 'entrada' : 'saída'} de ` +
      `${formatarDinheiro(lancamento.valor)} no dia ${diaDe(lancamento.data)}`
  );
  botao.addEventListener('click', () => abrirFormulario(lancamento));

  const dia = document.createElement('span');
  dia.className = 'lancamento-dia tabular';
  dia.textContent = String(diaDe(lancamento.data)).padStart(2, '0');

  const descricao = document.createElement('span');
  descricao.className = 'lancamento-descricao';
  descricao.textContent = lancamento.descricao;

  const valor = document.createElement('span');
  valor.className = 'lancamento-valor tabular ' + (entrada ? 'entrada' : 'saida');
  valor.textContent = (entrada ? '+' : '−') + ' ' + formatarDinheiro(lancamento.valor);

  botao.append(dia, descricao, valor);
  item.appendChild(botao);
  return item;
}

/* ---------- Navegação entre telas ---------- */

function telaDaUrl() {
  const nome = (location.hash || '').replace(/^#\/?/, '');
  return TELAS.includes(nome) ? nome : TELA_PADRAO;
}

function mostrarTela(nome) {
  for (const tela of TELAS) {
    $('tela-' + tela).hidden = tela !== nome;
  }

  for (const link of document.querySelectorAll('.navegacao a')) {
    // aria-current é removido, não definido como "false": leitores de tela
    // anunciam qualquer valor presente.
    if (link.dataset.tela === nome) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  $('conteudo').scrollTop = 0;
}

window.addEventListener('hashchange', () => mostrarTela(telaDaUrl()));

/* ---------- Mês ---------- */

function irParaMes(mes) {
  mesVisivel = mes;
  desenhar();
}

$('mes-anterior').addEventListener('click', () => irParaMes(deslocarMes(mesVisivel, -1)));
$('mes-seguinte').addEventListener('click', () => irParaMes(deslocarMes(mesVisivel, 1)));
$('botao-hoje').addEventListener('click', () => irParaMes(mesDe(new Date())));

/* ---------- Tema ---------- */

function temaEmUso() {
  const salvo = document.documentElement.dataset.tema;
  if (salvo) return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

$('botao-tema').addEventListener('click', () => {
  const proximo = temaEmUso() === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = proximo;
  armazenamento.gravar(CHAVE_TEMA, proximo);
});

/* ---------- Aviso, com desfazer ---------- */

function avisar(texto, acaoDeDesfazer) {
  $('aviso-texto').textContent = texto;
  $('aviso').hidden = false;
  $('aviso-acao').hidden = !acaoDeDesfazer;
  desfazer = acaoDeDesfazer || null;

  clearTimeout(timerDoAviso);
  timerDoAviso = setTimeout(esconderAviso, acaoDeDesfazer ? 6000 : 3200);
}

function esconderAviso() {
  $('aviso').hidden = true;
  desfazer = null;
}

$('aviso-acao').addEventListener('click', () => {
  const acao = desfazer;
  esconderAviso();
  if (acao) acao();
});

/* ---------- Formulário ---------- */

function definirTipo(tipo) {
  tipoDoFormulario = tipo;
  $('tipo-entrada').setAttribute('aria-pressed', String(tipo === 'entrada'));
  $('tipo-saida').setAttribute('aria-pressed', String(tipo === 'saida'));
}

function abrirFormulario(lancamento) {
  editando = lancamento || null;

  $('titulo-do-dialogo').textContent = lancamento ? 'Editar' : 'Adicionar';
  definirTipo(lancamento ? lancamento.tipo : 'entrada');
  $('campo-descricao').value = lancamento ? lancamento.descricao : '';
  $('campo-valor').value = lancamento ? valorParaCampo(lancamento.valor) : '';
  // Ao adicionar, a data padrão é hoje se o mês visível é o atual; senão, o dia
  // 1 do mês que a pessoa está olhando — que é o que ela quis dizer ao navegar
  // até lá.
  $('campo-data').value = lancamento
    ? lancamento.data
    : mesVisivel === mesDe(new Date())
      ? hojeISO()
      : mesVisivel + '-01';
  $('botao-excluir').hidden = !lancamento;
  $('mais-opcoes').open = false;
  esconderErro();

  $('dialogo').showModal();

  // No celular o foco automático abre o teclado por cima da folha e esconde o
  // resto do formulário. No desktop é só conveniência.
  if (window.matchMedia('(min-width: 768px)').matches) {
    setTimeout(() => $('campo-descricao').focus(), 30);
  }
}

function esconderErro() {
  $('erro-do-formulario').hidden = true;
  $('erro-do-formulario').textContent = '';
}

function mostrarErro(texto, campo) {
  $('erro-do-formulario').textContent = texto;
  $('erro-do-formulario').hidden = false;
  if (campo) campo.focus();
}

$('tipo-entrada').addEventListener('click', () => definirTipo('entrada'));
$('tipo-saida').addEventListener('click', () => definirTipo('saida'));
$('botao-cancelar').addEventListener('click', () => $('dialogo').close());

/* Tocar fora fecha. O <dialog> nativo fecha no Esc sozinho, mas ignora o clique
   no fundo — e sair tocando fora é o gesto que todo mundo tenta primeiro, tanto
   na folha do celular quanto no modal do desktop. O alvo só é o próprio
   <dialog> quando o clique caiu fora da caixa: o conteúdo todo vive dentro do
   <form>. */
$('dialogo').addEventListener('click', (evento) => {
  if (evento.target === $('dialogo')) $('dialogo').close();
});
$('botao-adicionar').addEventListener('click', () => abrirFormulario(null));

$('formulario').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const descricao = $('campo-descricao').value.trim();
  const valor = analisarValor($('campo-valor').value);
  const data = $('campo-data').value || hojeISO();

  if (!descricao) return mostrarErro('Falta dizer o que é.', $('campo-descricao'));
  if (valor <= 0) return mostrarErro('Falta o valor.', $('campo-valor'));

  if (editando) {
    const alvo = estado.lancamentos.find((l) => l.id === editando.id);
    Object.assign(alvo, { tipo: tipoDoFormulario, descricao, valor, data });
  } else {
    estado.lancamentos.push({
      id: novoId(),
      tipo: tipoDoFormulario,
      descricao,
      valor,
      data,
    });
  }

  // Se a data cai em outro mês, vai junto — senão o registro some na cara de
  // quem acabou de criá-lo.
  mesVisivel = mesDe(data);

  $('dialogo').close();
  salvar();
});

$('botao-excluir').addEventListener('click', () => {
  const alvo = editando;
  if (!alvo) return;

  const posicao = estado.lancamentos.findIndex((l) => l.id === alvo.id);
  if (posicao === -1) return;

  const [removido] = estado.lancamentos.splice(posicao, 1);
  $('dialogo').close();
  salvar();

  // Desfazer em vez de confirmar: o diálogo de confirmação faz a pessoa decidir
  // antes de ver o resultado, e ainda dependeria de confirm(), que o navegador
  // pode suprimir sem aviso.
  avisar(`"${removido.descricao}" foi removido.`, () => {
    estado.lancamentos.splice(posicao, 0, removido);
    mesVisivel = mesDe(removido.data);
    salvar();
  });
});

/* ---------- Service worker ---------- */

/* Registra depois do load: em Android de entrada, disputar banda com o primeiro
   carregamento atrasa a tela que o usuário está esperando. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Sem service worker o app continua funcionando online. */
    });
  });
}

/* ---------- Início ---------- */

estado = carregar();
mostrarTela(telaDaUrl());
desenhar();
