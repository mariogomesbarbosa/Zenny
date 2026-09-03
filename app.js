/* Zenny — o mês, os lançamentos fixos e o planejado contra o realizado.
 *
 * Este arquivo cuida do DOM e de mais nada. Toda conta vive em nucleo.js, que
 * não sabe que existe navegador e por isso é testável direto pelo node
 * (tests/nucleo.mjs).
 *
 * O estado nunca é mutado no lugar: toda alteração produz um objeto novo. Isso
 * custa algumas linhas e paga o desfazer — que só precisa guardar a referência
 * anterior — sem risco de a "cópia" apontar para o mesmo objeto.
 */

import {
  CHAVE,
  analisarValor,
  formatarDinheiro,
  valorParaCampo,
  mesDe,
  deslocarMes,
  rotuloDoMes,
  limitarDia,
  estadoVazio,
  normalizarEstado,
  estaRealizado,
  alternarRealizado,
  limparRealizadosDe,
  lancamentosDoMes,
  resumoDoMes,
  proporcoesDasBarras,
  excluirLancamento,
  pularMes,
  encerrarFixo,
} from './nucleo.js';

const TELAS = ['inicio', 'metas'];
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
let pendenteDeExclusao = null;
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

/* Guarda o que dá para desfazer. Como nada é mutado no lugar, as referências
   antigas continuam válidas — não é preciso copiar em profundidade. */
function instantaneo() {
  return { lancamentos: estado.lancamentos, realizados: estado.realizados };
}

function restaurar(anterior) {
  estado = { ...estado, ...anterior };
  salvar();
}

/* ---------- Desenho ---------- */

function desenhar() {
  const resumo = resumoDoMes(estado.lancamentos, estado.realizados, mesVisivel);
  const doMes = lancamentosDoMes(estado.lancamentos, mesVisivel);

  desenharCabecalho();
  desenharPainel(resumo);
  desenharGrupo('entradas', doMes.filter((l) => l.tipo === 'entrada'), resumo.entradas, 'recebido');
  desenharGrupo('despesas', doMes.filter((l) => l.tipo === 'saida'), resumo.despesas, 'pago');
}

function desenharCabecalho() {
  $('rotulo-do-mes').textContent = rotuloDoMes(mesVisivel);
  $('botao-hoje').hidden = mesVisivel === mesDe(new Date());
}

function desenharPainel(resumo) {
  const negativa = resumo.sobra < 0;

  $('rotulo-da-sobra').textContent = negativa
    ? 'Falta prevista no mês'
    : 'Sobra prevista no mês';
  $('valor-da-sobra').textContent = formatarDinheiro(Math.abs(resumo.sobra));
  $('valor-da-sobra').classList.toggle('negativo', negativa);

  const detalhe = $('detalhe-da-sobra');
  if (resumo.vazio) {
    detalhe.textContent = 'Nada registrado neste mês ainda.';
  } else {
    // Montado por nó, não por innerHTML: os valores vêm de dado do usuário, e
    // concatenar HTML com dado do usuário é como se abre buraco por descuido.
    detalhe.textContent = '';
    detalhe.append(
      'Na conta agora: ',
      forte(formatarDinheiro(resumo.naContaAgora)),
      ' · falta entrar ',
      forte(formatarDinheiro(resumo.faltaEntrar)),
      ' e sair ',
      forte(formatarDinheiro(resumo.faltaSair))
    );
  }

  $('valor-entradas').textContent = formatarDinheiro(resumo.entradas.previsto);
  $('valor-despesas').textContent = formatarDinheiro(resumo.despesas.previsto);

  const barras = proporcoesDasBarras(resumo);
  $('barra-entradas-realizado').style.width = barras.entradas.realizado + '%';
  $('barra-entradas-previsto').style.width = barras.entradas.previsto + '%';
  $('barra-despesas-realizado').style.width = barras.despesas.realizado + '%';
  $('barra-despesas-previsto').style.width = barras.despesas.previsto + '%';
}

function forte(texto) {
  const b = document.createElement('b');
  b.className = 'tabular';
  b.textContent = texto;
  return b;
}

function desenharGrupo(nome, lancamentos, lado, verbo) {
  const lista = $('lista-' + nome);
  lista.textContent = '';
  for (const lancamento of lancamentos) lista.appendChild(linhaDoLancamento(lancamento));

  $('vazio-' + nome).hidden = lancamentos.length > 0;
  $('total-' + nome).textContent = formatarDinheiro(lado.previsto);
  $('pe-' + nome + '-quantidade').textContent = lancamentos.length
    ? lancamentos.length + (lancamentos.length === 1 ? ' registro' : ' registros')
    : '';
  $('pe-' + nome + '-realizado').textContent = lancamentos.length
    ? verbo + ' ' + formatarDinheiro(lado.realizado)
    : '';
}

function linhaDoLancamento(lancamento) {
  const entrada = lancamento.tipo === 'entrada';
  const feito = estaRealizado(estado.realizados, lancamento.id, mesVisivel);

  const item = document.createElement('li');
  item.className = 'lancamento' + (feito ? ' realizado' : '');

  const marcador = document.createElement('button');
  marcador.type = 'button';
  marcador.className = 'marcador-realizado ' + (entrada ? 'entrada' : 'saida');
  marcador.setAttribute('aria-pressed', String(feito));
  marcador.setAttribute(
    'aria-label',
    (feito ? 'Desmarcar: ' : entrada ? 'Marcar como recebido: ' : 'Marcar como pago: ') +
      lancamento.descricao
  );
  marcador.innerHTML =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.4 4.4 9.3 10.5 3"/></svg>';
  marcador.addEventListener('click', () => alternarFeito(lancamento));

  const toque = document.createElement('button');
  toque.type = 'button';
  toque.className = 'lancamento-toque';
  toque.setAttribute('aria-label', 'Editar ' + lancamento.descricao);
  toque.addEventListener('click', () => abrirFormulario(lancamento));

  const dia = document.createElement('span');
  dia.className = 'lancamento-dia tabular';
  dia.textContent = String(lancamento.dia).padStart(2, '0');

  const descricao = document.createElement('span');
  descricao.className = 'lancamento-descricao';
  descricao.textContent = lancamento.descricao;

  if (lancamento.fixo) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = 'fixa';
    descricao.append(' ', etiqueta);
  }

  const valor = document.createElement('span');
  valor.className = 'lancamento-valor tabular ' + (entrada ? 'entrada' : 'saida');
  valor.textContent = formatarDinheiro(lancamento.valor);

  toque.append(dia, descricao, valor);

  const excluir = document.createElement('button');
  excluir.type = 'button';
  excluir.className = 'lancamento-excluir';
  excluir.setAttribute('aria-label', 'Excluir ' + lancamento.descricao);
  excluir.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  excluir.addEventListener('click', () => pedirExclusao(lancamento));

  item.append(marcador, toque, excluir);
  return item;
}

/* ---------- Marcar como recebido / pago ---------- */

function alternarFeito(lancamento) {
  estado = {
    ...estado,
    realizados: alternarRealizado(estado.realizados, lancamento.id, mesVisivel),
  };
  // Confirmação tátil: custo zero, e no celular vale mais que qualquer animação.
  if (navigator.vibrate) navigator.vibrate(8);
  salvar();
}

/* ---------- Excluir ---------- */

function pedirExclusao(lancamento) {
  if (lancamento.fixo) {
    // Um fixo não é um registro só: é uma regra que vale para vários meses. As
    // três respostas possíveis são bem diferentes entre si, e adivinhar qual o
    // usuário queria seria pior do que perguntar.
    pendenteDeExclusao = lancamento;
    $('dialogo-exclusao').showModal();
    return;
  }

  const anterior = instantaneo();
  estado = {
    ...estado,
    lancamentos: excluirLancamento(estado.lancamentos, lancamento.id),
    realizados: limparRealizadosDe(estado.realizados, lancamento.id),
  };
  salvar();
  avisar(`"${lancamento.descricao}" foi removido.`, () => restaurar(anterior));
}

function concluirExclusao(transformar, texto) {
  const alvo = pendenteDeExclusao;
  if (!alvo) return;

  const anterior = instantaneo();
  estado = transformar(alvo);
  $('dialogo-exclusao').close();
  pendenteDeExclusao = null;
  salvar();
  avisar(texto, () => restaurar(anterior));
}

$('excluir-so-neste').addEventListener('click', () =>
  concluirExclusao(
    (alvo) => ({
      ...estado,
      lancamentos: pularMes(estado.lancamentos, alvo.id, mesVisivel),
      realizados: limparRealizadosDe(estado.realizados, alvo.id, mesVisivel),
    }),
    'Removido só neste mês.'
  )
);

$('excluir-daqui').addEventListener('click', () =>
  concluirExclusao(
    (alvo) => ({
      ...estado,
      lancamentos: encerrarFixo(estado.lancamentos, alvo.id, mesVisivel),
      realizados: limparRealizadosDe(estado.realizados, alvo.id, mesVisivel),
    }),
    'Encerrado deste mês em diante.'
  )
);

$('excluir-todos').addEventListener('click', () =>
  concluirExclusao(
    (alvo) => ({
      ...estado,
      lancamentos: excluirLancamento(estado.lancamentos, alvo.id),
      realizados: limparRealizadosDe(estado.realizados, alvo.id),
    }),
    'Removido de todos os meses.'
  )
);

$('excluir-cancelar').addEventListener('click', () => {
  pendenteDeExclusao = null;
  $('dialogo-exclusao').close();
});

/* ---------- Navegação entre telas ---------- */

function telaDaUrl() {
  const nome = (location.hash || '').replace(/^#\/?/, '');
  return TELAS.includes(nome) ? nome : TELA_PADRAO;
}

function mostrarTela(nome) {
  for (const tela of TELAS) $('tela-' + tela).hidden = tela !== nome;

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
  $('rotulo-realizado').textContent = tipo === 'entrada' ? 'Já recebi' : 'Já paguei';
}

function definirRepeticao(ehFixa) {
  $('campo-da-data').hidden = ehFixa;
  $('campo-do-dia').hidden = !ehFixa;
  $('dica-da-repeticao').hidden = !ehFixa;
  $('dica-mes').textContent = rotuloDoMes(editando && editando.fixo ? editando.inicio : mesVisivel);
}

function abrirFormulario(lancamento) {
  editando = lancamento || null;

  $('titulo-do-dialogo').textContent = lancamento ? 'Editar lançamento' : 'Novo lançamento';
  definirTipo(lancamento ? lancamento.tipo : 'entrada');

  $('campo-descricao').value = lancamento ? lancamento.descricao : '';
  $('campo-valor').value = lancamento ? valorParaCampo(lancamento.valor) : '';
  $('campo-repeticao').value = lancamento && lancamento.fixo ? 'fixa' : 'avulsa';

  // Ao adicionar, a data padrão é hoje se o mês visível é o atual; senão, o dia
  // 1 do mês que a pessoa está olhando — que é o que ela quis dizer ao navegar
  // até lá.
  $('campo-data').value =
    lancamento && !lancamento.fixo
      ? lancamento.data
      : mesVisivel === mesDe(new Date())
        ? hojeISO()
        : mesVisivel + '-01';

  $('campo-dia').value = lancamento && lancamento.fixo ? lancamento.dia : 5;
  $('campo-realizado').checked = lancamento
    ? estaRealizado(estado.realizados, lancamento.id, mesVisivel)
    : false;
  $('botao-excluir').hidden = !lancamento;

  definirRepeticao($('campo-repeticao').value === 'fixa');
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
$('campo-repeticao').addEventListener('change', (e) => definirRepeticao(e.target.value === 'fixa'));
$('botao-cancelar').addEventListener('click', () => $('dialogo').close());
$('botao-adicionar').addEventListener('click', () => abrirFormulario(null));

/* Tocar fora fecha. O <dialog> nativo fecha no Esc sozinho, mas ignora o clique
   no fundo — e sair tocando fora é o gesto que todo mundo tenta primeiro, tanto
   na folha do celular quanto no modal do desktop. O alvo só é o próprio
   <dialog> quando o clique caiu fora da caixa. */
for (const id of ['dialogo', 'dialogo-exclusao']) {
  $(id).addEventListener('click', (evento) => {
    if (evento.target === $(id)) {
      if (id === 'dialogo-exclusao') pendenteDeExclusao = null;
      $(id).close();
    }
  });
}

$('formulario').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const descricao = $('campo-descricao').value.trim();
  const valor = analisarValor($('campo-valor').value);
  const ehFixa = $('campo-repeticao').value === 'fixa';

  if (!descricao) return mostrarErro('Falta dizer o que é.', $('campo-descricao'));
  if (valor <= 0) return mostrarErro('Falta o valor.', $('campo-valor'));

  const base = {
    id: editando ? editando.id : novoId(),
    tipo: tipoDoFormulario,
    descricao,
    valor,
  };

  let novo;
  if (ehFixa) {
    novo = {
      ...base,
      fixo: true,
      dia: limitarDia($('campo-dia').value),
      // Virar fixo a partir de um avulso começa no mês visível; um fixo que já
      // era fixo mantém a própria janela, senão editar o valor reviveria meses
      // que o usuário já tinha encerrado.
      inicio: editando && editando.fixo ? editando.inicio : mesVisivel,
      fim: editando && editando.fixo ? editando.fim : null,
      pulados: editando && editando.fixo ? editando.pulados : [],
    };
  } else {
    novo = { ...base, fixo: false, data: $('campo-data').value || hojeISO() };
  }

  const lancamentos = editando
    ? estado.lancamentos.map((l) => (l.id === novo.id ? novo : l))
    : [...estado.lancamentos, novo];

  // Se a data cai em outro mês, vai junto — senão o registro some na cara de
  // quem acabou de criá-lo.
  const mesDoRegistro = novo.fixo ? mesVisivel : mesDe(novo.data);

  const realizados = $('campo-realizado').checked
    ? { ...estado.realizados, [novo.id + '|' + mesDoRegistro]: true }
    : limparRealizadosDe(estado.realizados, novo.id, mesDoRegistro);

  estado = { ...estado, lancamentos, realizados };
  mesVisivel = mesDoRegistro;

  $('dialogo').close();
  salvar();
});

$('botao-excluir').addEventListener('click', () => {
  const alvo = editando;
  if (!alvo) return;
  $('dialogo').close();
  pedirExclusao(alvo);
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
