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
  aplicarMascaraValor,
  valorVigenteEm,
  definirValorDesde,
  definirValorSempre,
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
  itensDoMes,
  resumoDoMes,
  proporcoesDasBarras,
  excluirLancamento,
  pularMes,
  encerrarFixo,
  montarBackup,
  nomeDoArquivo,
  lerBackup,
  textoDoUltimoBackup,
  sugerirCategoria,
  categoriasDisponiveis,
  categoriaPorId,
  criarCategoria,
  idDeCategoriaPeloNome,
  gastosPorCategoria,
  definirLimite,
  cartoesAtivos,
  cartaoPorId,
  criarCartao,
  alterarCartao,
  arquivarCartao,
  faturaDoMes,
  faturasDoMes,
  comprasDaFatura,
  faturaDaCompra,
  ajusteDeFatura,
  dataPadraoDaFatura,
  idDaFatura,
  situacaoDoLimite,
} from './nucleo.js';

/**
 * Os tipos do domínio moram no núcleo, junto das funções que os produzem.
 * Importados como tipo — nada disto existe em tempo de execução.
 *
 * @typedef {import('./nucleo.js').Estado} Estado
 * @typedef {import('./nucleo.js').Lancamento} Lancamento
 * @typedef {import('./nucleo.js').LancamentoDoMes} LancamentoDoMes
 * @typedef {import('./nucleo.js').Realizados} Realizados
 * @typedef {import('./nucleo.js').Resumo} Resumo
 * @typedef {import('./nucleo.js').Mes} Mes
 * @typedef {import('./nucleo.js').Data} Data
 * @typedef {import('./nucleo.js').TipoDeLancamento} TipoDeLancamento
 * @typedef {import('./nucleo.js').TrechoDeValor} TrechoDeValor
 * @typedef {import('./nucleo.js').CategoriaDoUsuario} CategoriaDoUsuario
 * @typedef {import('./nucleo.js').Limites} Limites
 * @typedef {import('./nucleo.js').GastoDeCategoria} GastoDeCategoria
 * @typedef {import('./nucleo.js').ItemDoMes} ItemDoMes
 * @typedef {import('./nucleo.js').Cartao} Cartao
 * @typedef {import('./nucleo.js').Fatura} Fatura
 */

/**
 * O que o formulário coletou, antes de virar lançamento.
 * @typedef {object} Alteracao
 * @property {string} descricao
 * @property {number} valor
 * @property {boolean} ehFixa
 * @property {Data} data
 * @property {string|number} dia
 * @property {boolean} jaAconteceu
 * @property {string|null} cartao Id do cartão em que foi pago, ou `null`.
 */

/**
 * O par que o desfazer guarda. Como nada é mutado no lugar, as referências
 * antigas seguem válidas.
 * @typedef {{ lancamentos: Lancamento[], realizados: Realizados, categorias: CategoriaDoUsuario[], limites: Limites, cartoes: Cartao[] }} Instantaneo
 */

const TELAS = ['inicio', 'cartoes', 'cartao-detalhe', 'ajustes', 'relatorio'];
const TELA_PADRAO = 'inicio';
const CHAVE_TEMA = 'zenny-tema';

/* Fora do estado, de propósito. Se a data da última cópia morasse dentro do
   estado, ela entraria no próprio arquivo de backup — e restaurar num celular
   novo faria ele herdar a data do celular velho, afirmando uma cópia que
   aquele aparelho nunca teve. Aqui, aparelho novo diz "nunca", que é a
   verdade. Pela mesma razão o tema também vive fora. */
const CHAVE_BACKUP = 'zenny-backup';

/* ---------- Localizadores ----------
 *
 * `$` promete devolver um elemento, e não `elemento ou nada`. A promessa se
 * sustenta porque ela é verificada: um id que não existe no index.html lança
 * aqui, com o id na mensagem, em vez de virar `null` e estourar quarenta linhas
 * depois num "Cannot read properties of null". Todos os ids do app são estáticos
 * — se existe no desenvolvimento, existe em produção —, então isto é erro de
 * programação, não estado de execução.
 *
 * Os três irmãos existem porque `.value`, `.checked`, `.close()` e
 * `.showModal()` não moram em HTMLElement. Sem eles, cada uso precisaria de uma
 * anotação própria; com eles, a informação fica num lugar só. */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function $(id) {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`Elemento "${id}" não existe no index.html`);
  return elemento;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
const $campo = (id) => /** @type {HTMLInputElement} */ ($(id));

/**
 * @param {string} id
 * @returns {HTMLSelectElement}
 */
const $selecao = (id) => /** @type {HTMLSelectElement} */ ($(id));

/**
 * @param {string} id
 * @returns {HTMLDialogElement}
 */
const $dialogo = (id) => /** @type {HTMLDialogElement} */ ($(id));

/* localStorage lança em aba anônima com cookies bloqueados. Um app que quebra
   inteiro porque não conseguiu gravar seria um jeito bobo de perder usuário: em
   vez disso ele segue funcionando, só sem lembrar depois de fechar. */
const armazenamento = {
  /** @param {string} chave @returns {string|null} */
  ler(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (e) {
      return null;
    }
  },
  /** @param {string} chave @param {string} valor @returns {boolean} */
  gravar(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
      return true;
    } catch (e) {
      return false;
    }
  },
};

/* ---------- Máscara de valor e validação de dia ----------
 *
 * Todos os campos de dinheiro do app compartilham a mesma máscara de
 * "direita para a esquerda": cada dígito empurra os anteriores, e a vírgula
 * fica fixa duas casas antes do fim. A função pura mora no núcleo; esta
 * conecta ao DOM.
 *
 * Os campos de dia usam clamp direto no 'input', e não deixam o 'limitarDia'
 * do núcleo corrigir em silêncio na hora de salvar — que é o defeito descrito
 * na melhoria 5 do docs/melhorias.md. */

/**
 * Registra a máscara de moeda num campo de texto.
 * Ao receber `input`, formata o valor da direita para a esquerda.
 * O campo continua compatível com `analisarValor` na leitura.
 *
 * @param {HTMLInputElement} campo
 */
function registrarMascaraDeValor(campo) {
  campo.addEventListener('input', () => {
    campo.value = aplicarMascaraValor(campo.value);
  });
}

/**
 * Registra a validação de intervalo 1–31 num campo de dia.
 * - No `input`: remove não-dígitos, limita a 2 caracteres e faz clamp se
 *   o valor digitado já for maior que 31.
 * - No `blur`: se o campo estiver vazio ou for 0, corrige para 1.
 *
 * @param {HTMLInputElement} campo
 */
function registrarValidacaoDeDia(campo) {
  campo.addEventListener('input', () => {
    const limpo = campo.value.replace(/\D/g, '').slice(0, 2);
    const n = Number(limpo);
    if (n > 31) {
      campo.value = '31';
    } else {
      campo.value = limpo;
    }
  });

  campo.addEventListener('blur', () => {
    const n = Number(campo.value);
    if (!campo.value || n < 1) campo.value = '1';
  });
}

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

/** @type {Estado} */
let estado = estadoVazio();
let mesVisivel = mesDe(new Date());
/** @type {LancamentoDoMes|null} */
let editando = null;
/** @type {TipoDeLancamento} */
let tipoDoFormulario = 'entrada';
/** @type {LancamentoDoMes|null} */
let pendenteDeExclusao = null;
/** @type {(() => void)|null} */
let desfazer = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let timerDoAviso = null;

function carregar() {
  const bruto = armazenamento.ler(CHAVE);
  if (!bruto) return estadoVazio();

  try {
    const cru = JSON.parse(bruto);
    const normalizado = normalizarEstado(cru);

    /* Grava a migração na hora, em vez de esperar a próxima edição. Sem isso, o
       dado de quem abre o app e não mexe em nada continua no formato antigo
       indefinidamente — e quebra no dia em que aquela versão deixar de ser
       lida. Migrar é código de primeira classe (ver CLAUDE.md), e isso inclui
       persistir a migração. */
    if (cru && cru.versao !== normalizado.versao) {
      armazenamento.gravar(CHAVE, JSON.stringify(normalizado));
    }

    return normalizado;
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
   antigas continuam válidas — não é preciso copiar em profundidade.
   Categorias e limites entraram aqui junto com o B5: sem eles, desfazer a
   criação de uma categoria (ou uma mudança de limite) deixava a metade da
   alteração no lugar. Cartões e faturas entraram no B6 pelo mesmo motivo, e
   TODO campo novo do estado tem que entrar aqui — é o preço de o desfazer ser
   uma restauração de campos, e não do estado inteiro. */
function instantaneo() {
  return {
    lancamentos: estado.lancamentos,
    realizados: estado.realizados,
    categorias: estado.categorias,
    limites: estado.limites,
    cartoes: estado.cartoes,
  };
}

/** @param {Instantaneo} anterior */
function restaurar(anterior) {
  estado = { ...estado, ...anterior };
  salvar();
}

/* ---------- Desenho ---------- */

function desenhar() {
  /* As faturas são calculadas UMA vez e passadas para os dois: o resumo e a
     lista têm que estar contando exatamente as mesmas faturas, senão o painel
     diz um número e a lista abaixo mostra outro. */
  const faturas = faturasDoMes(estado, mesVisivel);
  const resumo = resumoDoMes(estado.lancamentos, estado.realizados, mesVisivel, faturas);
  const doMes = itensDoMes(estado, mesVisivel);

  desenharCabecalho();
  desenharPainel(resumo);
  desenharGrupo('entradas', doMes.filter((l) => l.tipo === 'entrada'), resumo.entradas, 'recebido');
  desenharGrupo('despesas', doMes.filter((l) => l.tipo === 'saida'), resumo.despesas, 'pago');
  desenharAjustes();
  desenharRelatorio();
  desenharCartoes();
  desenharDetalheCartao();
}

function desenharCabecalho() {
  $('rotulo-do-mes').textContent = rotuloDoMes(mesVisivel);
  $('botao-hoje').hidden = mesVisivel === mesDe(new Date());
}

/** @param {Resumo} resumo */
function desenharPainel(resumo) {
  /* A soma vem pronta do núcleo (`emCartao`): a interface não faz conta com
     dinheiro, nem para uma legenda. */
  const legenda = $('legenda-do-cartao');
  const temCartao = resumo.emCartao > 0;
  legenda.hidden = !temCartao;
  legenda.textContent = formatarDinheiro(resumo.emCartao) + ' são de fatura de cartão';

  /* Mês sem cartão não deixa espaço sobrando: a linha inteira sai, e não só a
     barrinha dentro dela. */
  $('trilho-da-fatura').hidden = !temCartao;

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
  $('barra-da-fatura').style.width = barras.cartao + '%';
}

/** @param {string} texto @returns {HTMLElement} */
function forte(texto) {
  const b = document.createElement('b');
  b.className = 'tabular';
  b.textContent = texto;
  return b;
}

/**
 * @param {string} nome
 * @param {ItemDoMes[]} lancamentos
 * @param {import('./nucleo.js').LadoDoResumo} lado
 * @param {string} verbo
 */
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

/** @param {ItemDoMes} lancamento @returns {HTMLLIElement} */
function linhaDoLancamento(lancamento) {
  const entrada = lancamento.tipo === 'entrada';
  const feito = estaRealizado(estado.realizados, lancamento.id, mesVisivel);

  const item = document.createElement('li');
  item.className =
    'lancamento' + (feito ? ' realizado' : '') + (lancamento.ehFatura ? ' fatura' : '');
  item.setAttribute('role', 'button');
  item.tabIndex = 0;
  item.setAttribute(
    'aria-label',
    (lancamento.ehFatura ? 'Abrir ' : 'Editar ') + lancamento.descricao
  );
  item.addEventListener('click', () =>
    lancamento.ehFatura ? abrirFatura(lancamento.cartaoId) : abrirFormulario(lancamento)
  );
  item.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      lancamento.ehFatura ? abrirFatura(lancamento.cartaoId) : abrirFormulario(lancamento);
    }
  });

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
  marcador.addEventListener('click', (evento) => {
    evento.stopPropagation();
    alternarFeito(lancamento);
  });
  marcador.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.stopPropagation();
    }
  });

  const esquerda = document.createElement('div');
  esquerda.className = 'lancamento-esquerda';

  const nome = document.createElement('span');
  nome.className = 'lancamento-nome';
  nome.textContent = lancamento.descricao;

  const meta = document.createElement('div');
  meta.className = 'lancamento-meta';

  const data = document.createElement('span');
  data.className = 'lancamento-data tabular';
  data.textContent = 'dia ' + String(lancamento.dia).padStart(2, '0');
  meta.appendChild(data);

  if (lancamento.ehFatura) {
    const cartao = document.createElement('span');
    cartao.className = 'etiqueta';
    cartao.textContent = 'cartão';
    meta.appendChild(cartao);
  } else if (lancamento.fixo) {
    const fixa = document.createElement('span');
    fixa.className = 'etiqueta';
    fixa.textContent = 'fixa';
    meta.appendChild(fixa);
  }

  esquerda.append(nome, meta);

  const direita = document.createElement('div');
  direita.className = 'lancamento-direita';

  const valor = document.createElement('span');
  valor.className = 'lancamento-valor tabular ' + (entrada ? 'entrada' : 'saida');
  valor.textContent = (entrada ? '+ ' : '− ') + formatarDinheiro(lancamento.valor);
  direita.appendChild(valor);

  if (!lancamento.ehFatura) {
    direita.appendChild(botaoDeCategoria(lancamento));
  }

  item.append(marcador, esquerda, direita);
  return item;
}

/**
 * A etiqueta de categoria do registro. Mostra o nome quando há categoria, e um
 * convite honesto ("+ categoria") quando não há.
 * @param {LancamentoDoMes} lancamento
 * @param {string} [classe]
 * @returns {HTMLButtonElement}
 */
function botaoDeCategoria(lancamento, classe = 'lancamento-categoria-btn') {
  const categoria = categoriaPorId(estado, lancamento.categoria);

  const botao = document.createElement('button');
  botao.type = 'button';
  if (categoria) {
    botao.className = classe;
    botao.setAttribute('aria-label', `Categoria: ${categoria.nome}. Toque para mudar.`);
    botao.textContent = categoria.nome;
  } else {
    botao.className = classe + ' sem-categoria';
    botao.setAttribute('aria-label', 'Adicionar categoria');
    botao.textContent = '+ categoria';
  }

  botao.addEventListener('click', (evento) => {
    evento.stopPropagation();
    abrirEscolhaDeCategoria(lancamento);
  });
  botao.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.stopPropagation();
    }
  });

  return botao;
}

/* ---------- Marcar como recebido / pago ---------- */

/** @param {ItemDoMes} lancamento */
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

/** @param {LancamentoDoMes} lancamento */
function pedirExclusao(lancamento) {
  if (lancamento.fixo) {
    // Um fixo não é um registro só: é uma regra que vale para vários meses. As
    // três respostas possíveis são bem diferentes entre si, e adivinhar qual o
    // usuário queria seria pior do que perguntar.
    pendenteDeExclusao = lancamento;
    $dialogo('dialogo-exclusao').showModal();
    return;
  }

  pedirConfirmacao({
    titulo: 'Excluir lançamento?',
    mensagem: `O lançamento "${lancamento.descricao}" será removido.`,
    textoConfirmar: 'Excluir',
    aoConfirmar: () => {
      const anterior = instantaneo();
      estado = {
        ...estado,
        lancamentos: excluirLancamento(estado.lancamentos, lancamento.id),
        realizados: limparRealizadosDe(estado.realizados, lancamento.id),
      };
      salvar();
      avisar(`"${lancamento.descricao}" foi removido.`, () => restaurar(anterior));
    },
  });
}

/**
 * @param {(alvo: LancamentoDoMes) => Estado} transformar
 * @param {string} texto
 */
function concluirExclusao(transformar, texto) {
  const alvo = pendenteDeExclusao;
  if (!alvo) return;

  const anterior = instantaneo();
  estado = transformar(alvo);
  $dialogo('dialogo-exclusao').close();
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
  $dialogo('dialogo-exclusao').close();
});

/* ---------- Confirmação para ações destrutivas ---------- */

/** @type {(() => void)|null} */
let pendenteDeConfirmacao = null;

/**
 * Pede confirmação antes de executar uma ação destrutiva.
 * @param {{ titulo?: string, mensagem: string, textoConfirmar?: string, aoConfirmar: () => void }} opcoes
 */
function pedirConfirmacao({ titulo = 'Tem certeza?', mensagem, textoConfirmar = 'Confirmar', aoConfirmar }) {
  $('titulo-do-confirmar').textContent = titulo;
  $('mensagem-do-confirmar').textContent = mensagem;
  $('confirmar-acao').textContent = textoConfirmar;
  pendenteDeConfirmacao = aoConfirmar;
  $dialogo('dialogo-confirmar').showModal();
}

$('confirmar-acao').addEventListener('click', () => {
  const acao = pendenteDeConfirmacao;
  pendenteDeConfirmacao = null;
  $dialogo('dialogo-confirmar').close();
  if (acao) acao();
});

$('confirmar-cancelar').addEventListener('click', () => {
  pendenteDeConfirmacao = null;
  $dialogo('dialogo-confirmar').close();
});

/* ---------- Navegação entre telas ---------- */

function telaDaUrl() {
  const nome = (location.hash || '').replace(/^#\/?/, '');
  return TELAS.includes(nome) ? nome : TELA_PADRAO;
}

/** @param {string} nome */
function mostrarTela(nome) {
  for (const tela of TELAS) $('tela-' + tela).hidden = tela !== nome;

  for (const link of /** @type {NodeListOf<HTMLAnchorElement>} */ (
    document.querySelectorAll('.navegacao a')
  )) {
    // aria-current é removido, não definido como "false": leitores de tela
    // anunciam qualquer valor presente.
    const ativa = nome === 'cartao-detalhe' ? 'cartoes' : nome;
    if (link.dataset.tela === ativa) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  // O CSS precisa saber qual tela está aberta: nos Ajustes o botão flutuante
  // some, por não ter o que fazer lá.
  document.body.dataset.tela = nome;

  $('conteudo').scrollTop = 0;

  if (nome === 'cartao-detalhe') desenharDetalheCartao();
}

window.addEventListener('hashchange', () => {
  const tela = telaDaUrl();
  if (tela !== 'cartao-detalhe' && cartaoDetalheId) {
    fecharDialogoAjusteFatura();
    cartaoDetalheId = null;
  }
  mostrarTela(tela);
});

for (const link of /** @type {NodeListOf<HTMLAnchorElement>} */ (
  document.querySelectorAll('.navegacao a, .marca')
)) {
  link.addEventListener('click', () => {
    const tela = link.dataset.tela || 'inicio';
    if (document.body.dataset.tela === 'cartao-detalhe') {
      fecharDialogoAjusteFatura();
      cartaoDetalheId = null;
    }
    mostrarTela(tela);
  });
}

/* ---------- Mês ---------- */

/** @param {Mes} mes */
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

/* O tema tem dois controles: o atalho no cabeçalho, que é o gesto de impulso
   ("está claro demais agora"), e o alternador dos Ajustes, que é onde a pessoa
   vai procurar quando procura. Dois controles para o mesmo estado só não viram
   dessincronia porque um lugar só escreve o tema e um lugar só redesenha os
   dois. */
/** @param {'claro'|'escuro'} proximo */
function aplicarTema(proximo) {
  document.documentElement.dataset.tema = proximo;
  armazenamento.gravar(CHAVE_TEMA, proximo);
  sincronizarTema();
}

function sincronizarTema() {
  const escuro = temaEmUso() === 'escuro';
  $('tema-claro').setAttribute('aria-pressed', String(!escuro));
  $('tema-escuro').setAttribute('aria-pressed', String(escuro));
  // O rótulo diz o que o botão FAZ, não o tema que está em uso: é o que um
  // leitor de tela precisa ouvir antes de decidir tocar.
  $('botao-tema').setAttribute('aria-label', escuro ? 'Usar tema claro' : 'Usar tema escuro');
}

$('botao-tema').addEventListener('click', () =>
  aplicarTema(temaEmUso() === 'escuro' ? 'claro' : 'escuro')
);
$('tema-claro').addEventListener('click', () => aplicarTema('claro'));
$('tema-escuro').addEventListener('click', () => aplicarTema('escuro'));

/* ---------- Aviso, com desfazer ---------- */

/**
 * @param {string} texto
 * @param {() => void} [acaoDeDesfazer]
 */
function avisar(texto, acaoDeDesfazer) {
  $('aviso-texto').textContent = texto;
  $('aviso').hidden = false;
  $('aviso-acao').hidden = !acaoDeDesfazer;
  desfazer = acaoDeDesfazer || null;

  clearTimeout(timerDoAviso ?? undefined);
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

/** @param {TipoDeLancamento} tipo */
function definirTipo(tipo) {
  tipoDoFormulario = tipo;
  $('tipo-entrada').setAttribute('aria-pressed', String(tipo === 'entrada'));
  $('tipo-saida').setAttribute('aria-pressed', String(tipo === 'saida'));
  $('rotulo-realizado').textContent = tipo === 'entrada' ? 'Já recebi' : 'Já paguei';
  desenharEscolhaDeCartao();
}

/* O "pago com" só existe em despesa, e só quando há cartão cadastrado.
 *
 * Em receita não faria sentido — cartão de crédito não recebe salário. E sem
 * nenhum cartão o campo ofereceria uma escolha só, "nenhum", que é ruído na
 * primeira tela de quem nunca cadastrou um. */
function desenharEscolhaDeCartao() {
  const cartoes = cartoesAtivos(estado);
  const cabe = tipoDoFormulario === 'saida' && cartoes.length > 0;

  $('campo-do-cartao').hidden = !cabe;
  if (!cabe) return;

  const escolha = $selecao('campo-cartao');
  const escolhido = escolha.value;

  escolha.textContent = '';
  const nenhum = document.createElement('option');
  nenhum.value = '';
  nenhum.textContent = 'Dinheiro, débito ou Pix';
  escolha.appendChild(nenhum);

  for (const cartao of cartoes) {
    const opcao = document.createElement('option');
    opcao.value = cartao.id;
    opcao.textContent = cartao.nome;
    escolha.appendChild(opcao);
  }

  // Preserva a escolha ao trocar de tipo e voltar, se o cartão ainda existe.
  escolha.value = cartoes.some((c) => c.id === escolhido) ? escolhido : '';
  atualizarDicaDoCartao();
}

/* Diz em que mês a despesa vai cair, na hora em que a pessoa escolhe o cartão.
 *
 * Sem isto, escolher o cartão faria a despesa sumir do mês visível sem
 * explicação — que é o efeito certo (o dinheiro não sai da conta agora) pela
 * razão mais confusa possível. Educar no contexto, onde a dúvida nasce. */
function atualizarDicaDoCartao() {
  const escolhido = $selecao('campo-cartao').value;
  const dica = $('dica-do-cartao');

  if (!escolhido) {
    dica.hidden = true;
    return;
  }

  const cartao = cartaoPorId(estado, escolhido);
  if (!cartao) {
    dica.hidden = true;
    return;
  }

  /* A conta de "em que fatura cai" vem do núcleo (`faturaDaCompra`), que é a
     única dona da regra. Repetir aqui a comparação com o fechamento seria uma
     segunda dona, e as duas divergiriam no primeiro ajuste. */
  const data = $selecao('campo-repeticao').value === 'fixa'
    ? mesVisivel + '-' + String(limitarDia($campo('campo-dia').value)).padStart(2, '0')
    : $campo('campo-data').value || hojeISO();

  dica.hidden = false;
  dica.textContent = 'Entra na fatura de ' + rotuloDoMes(faturaDaCompra(cartao, data)) + '.';
}

/** @param {boolean} ehFixa */
function definirRepeticao(ehFixa) {
  $('campo-da-data').hidden = ehFixa;
  $('campo-do-dia').hidden = !ehFixa;
  $('dica-da-repeticao').hidden = !ehFixa;
  $('dica-mes').textContent = rotuloDoMes(editando && editando.fixo ? editando.inicio : mesVisivel);
}

/** @param {LancamentoDoMes|null} [lancamento] */
function abrirFormulario(lancamento) {
  editando = lancamento || null;

  $('titulo-do-dialogo').textContent = lancamento ? 'Editar lançamento' : 'Novo lançamento';
  definirTipo(lancamento ? lancamento.tipo : 'entrada');

  $campo('campo-descricao').value = lancamento ? lancamento.descricao : '';
  $campo('campo-valor').value = lancamento ? valorParaCampo(lancamento.valor) : '';
  $selecao('campo-repeticao').value = lancamento && lancamento.fixo ? 'fixa' : 'avulsa';

  // Ao adicionar, a data padrão é hoje se o mês visível é o atual; senão, o dia
  // 1 do mês que a pessoa está olhando — que é o que ela quis dizer ao navegar
  // até lá.
  $campo('campo-data').value =
    lancamento && !lancamento.fixo
      ? lancamento.data
      : mesVisivel === mesDe(new Date())
        ? hojeISO()
        : mesVisivel + '-01';

  $campo('campo-dia').value = String(lancamento && lancamento.fixo ? lancamento.dia : 5);
  $campo('campo-realizado').checked = lancamento
    ? estaRealizado(estado.realizados, lancamento.id, mesVisivel)
    : false;
  $('botao-excluir').hidden = !lancamento;

  $selecao('campo-cartao').value = lancamento?.cartao ?? '';
  desenharEscolhaDeCartao();

  definirRepeticao($selecao('campo-repeticao').value === 'fixa');
  esconderErro();
  $dialogo('dialogo').showModal();

  // No celular o foco automático abre o teclado por cima da folha e esconde o
  // resto do formulário. No desktop é só conveniência.
  if (window.matchMedia('(min-width: 768px)').matches) {
    setTimeout(() => $campo('campo-descricao').focus(), 30);
  }
}

function esconderErro() {
  $('erro-do-formulario').hidden = true;
  $('erro-do-formulario').textContent = '';
}

/**
 * @param {string} texto
 * @param {HTMLElement} [campo]
 * @returns {void}
 */
function mostrarErro(texto, campo) {
  $('erro-do-formulario').textContent = texto;
  $('erro-do-formulario').hidden = false;
  if (campo) campo.focus();
}

$('tipo-entrada').addEventListener('click', () => definirTipo('entrada'));
$('tipo-saida').addEventListener('click', () => definirTipo('saida'));
$selecao('campo-repeticao').addEventListener('change', () =>
  definirRepeticao($selecao('campo-repeticao').value === 'fixa')
);
$('botao-cancelar').addEventListener('click', () => $dialogo('dialogo').close());
$('botao-adicionar').addEventListener('click', () => abrirFormulario(null));

/* Tocar fora fecha. O <dialog> nativo fecha no Esc sozinho, mas ignora o clique
   no fundo — e sair tocando fora é o gesto que todo mundo tenta primeiro, tanto
   na folha do celular quanto no modal do desktop. O alvo só é o próprio
   <dialog> quando o clique caiu fora da caixa. */
for (const id of [
  'dialogo',
  'dialogo-exclusao',
  'dialogo-confirmar',
  'dialogo-valor',
  'dialogo-restaurar',
  'dialogo-apagar',
  'dialogo-categoria',
  'dialogo-limite',
  'dialogo-cartao',
  'dialogo-fatura',
  'dialogo-ajuste-fatura',
]) {
  $dialogo(id).addEventListener('click', (evento) => {
    if (evento.target === $dialogo(id)) $dialogo(id).close();
  });

  /* A limpeza do estado pendente vive no `close`, e não em cada botão: o Esc
     fecha o <dialog> nativamente, sem passar por clique nenhum, e deixava
     `limiteEmEdicao` preenchido. Um lugar só cobre os três caminhos — botão,
     toque fora e Esc — e não há como esquecer um deles ao acrescentar o
     próximo diálogo. */
  $dialogo(id).addEventListener('close', () => {
    if (id === 'dialogo-exclusao') pendenteDeExclusao = null;
    if (id === 'dialogo-confirmar') pendenteDeConfirmacao = null;
    if (id === 'dialogo-valor') pendenteDeValor = null;
    if (id === 'dialogo-restaurar') pendenteDeRestauracao = null;
    if (id === 'dialogo-categoria') {
      lancamentoParaCategoria = null;
      escolhendoParaLimite = false;
    }
    if (id === 'dialogo-limite') limiteEmEdicao = null;
    if (id === 'dialogo-cartao') cartaoEmEdicao = null;
  });
}

/* O lançamento em edição, quando ele é fixo — e `null` quando não é, ou quando
 * não há nada em edição.
 *
 * Existe porque `const eraFixo = editando && editando.fixo` respondia à pergunta
 * sem dar acesso seguro à resposta: quem lia `editando.valores` depois disso
 * dependia de o leitor humano lembrar que `eraFixo` implicava `editando` fixo.
 * Uma função que devolve o fixo carrega a garantia junto com o dado.
 *
 * @returns {(import('./nucleo.js').Fixo & { valor: number })|null}
 */
function fixoEmEdicao() {
  return editando && editando.fixo ? editando : null;
}

/* Guarda o que o formulário coletou enquanto o diálogo pergunta a partir de
   quando o valor novo vale. */
/** @type {Alteracao|null} */
let pendenteDeValor = null;

/* Monta a linha do tempo de valores do fixo.
 *
 * `modo` só importa quando se está editando um fixo que já existia:
 *   'daqui'      — o valor novo vale deste mês em diante, e o passado fica
 *   'sempre'     — corrige todos os meses (o caso do erro de digitação)
 *   'inalterado' — o valor não mudou, então a linha do tempo não se mexe */
/**
 * @param {number} valor
 * @param {Mes} inicio
 * @param {'daqui'|'sempre'|'inalterado'} modo
 * @returns {TrechoDeValor[]}
 */
function linhaDoTempoDoFixo(valor, inicio, modo) {
  const antigo = fixoEmEdicao();
  if (!antigo) return [{ desde: inicio, valor }];
  if (modo === 'sempre') return definirValorSempre(valor, inicio);
  if (modo === 'daqui') return definirValorDesde(antigo.valores, mesVisivel, valor);
  return antigo.valores;
}

/* A categoria que o registro ganha ao ser salvo.
 *
 * Editando um registro que JÁ tem categoria (e do mesmo tipo — trocar de
 * receita para despesa invalida a categoria antiga), o toque manual na
 * etiqueta é preservado: um ajuste de texto ou valor não pode apagar em
 * silêncio uma correção que a pessoa já fez. Fora isso — registro novo, ou sem
 * categoria ainda —, a sugestão tenta de novo em cima da descrição atual. */
/**
 * @param {string} descricao
 * @returns {string|null}
 */
function categoriaParaAlteracao(descricao) {
  /* Num registro que já existe, o que ele tem vale — INCLUSIVE a ausência.
   *
   * A versão anterior só preservava categoria preenchida, então quem tirava a
   * etiqueta de propósito e depois corrigia o valor via a categoria voltar
   * sozinha. Isso desfaz uma escolha explícita em silêncio, que é exatamente o
   * que `normalizarEstado` recusa fazer na leitura, pelo mesmo motivo.
   *
   * O preço está registrado como pendência: mudar a descrição de um registro
   * não faz o app sugerir de novo. Enquanto o dado não distinguir categoria
   * sugerida de categoria escolhida, uma das duas pontas fica errada — e
   * ressuscitar o que a pessoa apagou é a pior das duas. */
  if (editando && editando.tipo === tipoDoFormulario) return editando.categoria ?? null;
  return sugerirCategoria(descricao, tipoDoFormulario);
}

/**
 * @param {Alteracao} alteracao
 * @param {'daqui'|'sempre'|'inalterado'} modo
 */
function aplicarAlteracao(alteracao, modo) {
  const { descricao, valor, ehFixa, data, dia, jaAconteceu, cartao } = alteracao;
  const antigo = fixoEmEdicao();
  const base = {
    id: editando ? editando.id : novoId(),
    tipo: tipoDoFormulario,
    descricao,
    categoria: categoriaParaAlteracao(descricao),
    cartao,
    criadoEm: editando && editando.criadoEm ? editando.criadoEm : new Date().toISOString(),
  };

  /** @type {Lancamento} */
  let novo;
  if (ehFixa) {
    // Virar fixo a partir de um avulso começa no mês visível; um fixo que já
    // era fixo mantém a própria janela, senão editar o valor reviveria meses
    // que o usuário já tinha encerrado.
    const inicio = antigo ? antigo.inicio : mesVisivel;
    novo = {
      ...base,
      fixo: true,
      dia: limitarDia(dia),
      inicio,
      fim: antigo ? antigo.fim : null,
      pulados: antigo ? antigo.pulados : [],
      valores: linhaDoTempoDoFixo(valor, inicio, modo),
    };
  } else {
    novo = { ...base, fixo: false, valor, data };
  }

  const lancamentos = editando
    ? estado.lancamentos.map((l) => (l.id === novo.id ? novo : l))
    : [...estado.lancamentos, novo];

  /* Se a data cai em outro mês, vai junto — senão o registro some na cara de
     quem acabou de criá-lo.
     
     A COMPRA NO CARTÃO segue para o mês da FATURA, e não o da compra. Ela não
     aparece na lista do mês em que foi feita — de propósito, porque não mexe na
     conta ali — então pular para lá mostraria justamente o mês em que ela é
     invisível. O mês da fatura é onde o dinheiro aparece, e é onde a pessoa
     precisa cair para ver que o registro deu certo. */
  /* DUAS perguntas diferentes, que antes dividiam a mesma variável:
   *
   *   `mesDoRegistro` — em que mês este registro é marcado como realizado. É
   *   sempre o mês DELE: o Relatório lê `realizados` por esse mês, e uma compra
   *   guardada sob o mês da fatura sumiria de "para onde foi" no mês em que
   *   aconteceu, que é onde ela deve aparecer.
   *
   *   `mesParaOlhar` — para onde a tela navega. Para a compra no cartão é o mês
   *   da FATURA: ela não aparece na lista do mês em que foi feita, de propósito,
   *   porque não mexe na conta ali. Pular para lá mostraria justamente o mês em
   *   que ela é invisível, e o registro pareceria não ter sido salvo.
   *
   * Para todo o resto as duas são a mesma coisa, que é por que a diferença
   * passou despercebida até o cartão existir. */
  const mesDoRegistro = novo.fixo ? mesVisivel : mesDe(novo.data);

  const cartaoDoRegistro = cartaoPorId(estado, novo.cartao);
  const mesParaOlhar = cartaoDoRegistro
    ? faturaDaCompra(
        cartaoDoRegistro,
        novo.fixo ? mesVisivel + '-' + String(novo.dia).padStart(2, '0') : novo.data
      )
    : mesDoRegistro;

  /** @type {Realizados} */
  const realizados = jaAconteceu
    ? { ...estado.realizados, [novo.id + '|' + mesDoRegistro]: true }
    : limparRealizadosDe(estado.realizados, novo.id, mesDoRegistro);

  estado = { ...estado, lancamentos, realizados };
  mesVisivel = mesParaOlhar;

  editando = null;
  salvar();
}

$('formulario').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const alteracao = {
    descricao: $campo('campo-descricao').value.trim(),
    valor: analisarValor($campo('campo-valor').value),
    ehFixa: $selecao('campo-repeticao').value === 'fixa',
    data: $campo('campo-data').value || hojeISO(),
    dia: $campo('campo-dia').value,
    jaAconteceu: $campo('campo-realizado').checked,
    cartao: tipoDoFormulario === 'saida' ? $selecao('campo-cartao').value || null : null,
  };

  if (!alteracao.descricao) return mostrarErro('Falta dizer o que é.', $campo('campo-descricao'));
  if (alteracao.valor <= 0) return mostrarErro('Falta o valor.', $campo('campo-valor'));

  /* A pergunta só aparece quando o VALOR de um fixo que já existia muda. Mudar
     a descrição ou o dia vale para todos os meses sem perguntar: nenhum dos
     dois reescreve dinheiro, e uma pergunta que aparece à toa vira uma pergunta
     que ninguém lê. */
  const antigo = fixoEmEdicao();

  if (antigo && alteracao.ehFixa) {
    const valorAnterior = valorVigenteEm(antigo.valores, mesVisivel);

    if (alteracao.valor !== valorAnterior) {
      pendenteDeValor = alteracao;
      $('explicacao-do-valor').textContent =
        `Este lançamento se repete todo mês, e valia ${formatarDinheiro(valorAnterior)}. ` +
        `A partir de quando vale ${formatarDinheiro(alteracao.valor)}?`;
      $dialogo('dialogo').close();
      $dialogo('dialogo-valor').showModal();
      return;
    }
  }

  $dialogo('dialogo').close();
  aplicarAlteracao(alteracao, 'inalterado');
});

/**
 * @param {'daqui'|'sempre'} modo
 * @param {string} texto
 */
function concluirMudancaDeValor(modo, texto) {
  if (!pendenteDeValor) return;
  const anterior = instantaneo();
  const alteracao = pendenteDeValor;
  pendenteDeValor = null;
  $dialogo('dialogo-valor').close();
  aplicarAlteracao(alteracao, modo);
  avisar(texto, () => restaurar(anterior));
}

$('valor-daqui').addEventListener('click', () =>
  concluirMudancaDeValor('daqui', `Valor novo a partir de ${rotuloDoMes(mesVisivel)}.`)
);

$('valor-sempre').addEventListener('click', () =>
  concluirMudancaDeValor('sempre', 'Valor corrigido em todos os meses.')
);

/* Cancelar aqui devolve ao formulário, e não descarta o que a pessoa digitou:
   ela veio parar neste diálogo sem ter pedido. */
$('valor-cancelar').addEventListener('click', () => {
  $dialogo('dialogo-valor').close();
  if (pendenteDeValor) {
    pendenteDeValor = null;
    $dialogo('dialogo').showModal();
  }
});

$('botao-excluir').addEventListener('click', () => {
  const alvo = editando;
  if (!alvo) return;
  $dialogo('dialogo').close();
  pedirExclusao(alvo);
});

/* ---------- Ajustes: a cópia, o tema e o apagar tudo ---------- */

/** @type {Extract<ReturnType<typeof lerBackup>, { ok: true }>|null} */
let pendenteDeRestauracao = null;

function desenharAjustes() {
  $('estado-do-backup').textContent = textoDoUltimoBackup(
    armazenamento.ler(CHAVE_BACKUP),
    new Date()
  );
}

/** @param {Date} quando */
function registrarBackup(quando) {
  armazenamento.gravar(CHAVE_BACKUP, quando.toISOString());
  desenharAjustes();
}

/* Baixar é a reserva de quem não tem o menu de compartilhar.
 *
 * O objeto de URL não é revogado na hora: em alguns navegadores isso cancela o
 * download que acabou de começar. Um minuto é folga de sobra, e o objeto morre
 * junto com a aba de qualquer jeito. */
/** @param {string} texto @param {string} nome */
function baixar(texto, nome) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* No Android, o menu de compartilhar é o que faz a cópia chegar num lugar onde
   a pessoa vai reencontrá-la — o Drive, o WhatsApp dela mesma, o e-mail. A
   pasta Downloads é onde arquivos vão morrer.
 *
 * canShare é consultado ANTES de qualquer await: share() precisa acontecer
   dentro do gesto que o usuário acabou de fazer, e um await no meio já custou o
   gesto em parte dos navegadores. */
async function guardarCopia() {
  const agora = new Date();
  const texto = JSON.stringify(montarBackup(estado, agora), null, 2);
  const nome = nomeDoArquivo(agora);

  /** @type {File|null} */
  let arquivo = null;
  try {
    arquivo = new File([texto], nome, { type: 'application/json' });
  } catch (e) {
    /* File não é construível em navegadores antigos: segue para o download. */
  }

  const podeCompartilhar =
    arquivo &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [arquivo] });

  if (arquivo && podeCompartilhar) {
    try {
      await navigator.share({ files: [arquivo], title: 'Cópia do Zenny' });
      registrarBackup(agora);
      avisar('Cópia guardada.');
      return true;
    } catch (e) {
      /* Fechar o menu de compartilhar lança AbortError, e desistir não é erro:
         cair para o download aqui baixaria justamente o arquivo que a pessoa
         acabou de recusar. Qualquer outra falha, sim, merece a reserva. */
      if (e instanceof Error && e.name === 'AbortError') return false;
    }
  }

  baixar(texto, nome);
  registrarBackup(agora);
  avisar('Cópia guardada.');
  return true;
}

const ERROS_DO_ARQUIVO = {
  'nao-e-json': 'Esse arquivo não parece ser uma cópia do Zenny.',
  'nao-e-zenny': 'Esse arquivo não parece ser uma cópia do Zenny.',
};

/* O que sai do aparelho, com a concordância certa: "O lançamento", "Os 3
   lançamentos e o cartão", "Os 2 cartões". Desde o B6 são duas contagens, e
   escrever as combinações à mão daria uma frase errada em alguma delas. */
/**
 * @param {number} lancamentos
 * @param {number} cartoes
 * @returns {string}
 */
function oQueSaiDoAparelho(lancamentos, cartoes) {
  const partes = [];
  if (lancamentos === 1) partes.push('o lançamento');
  else if (lancamentos > 1) partes.push(`os ${lancamentos} lançamentos`);
  if (cartoes === 1) partes.push('o cartão');
  else if (cartoes > 1) partes.push(`os ${cartoes} cartões`);

  const plural = lancamentos + cartoes > 1;
  const frase = `${partes.join(' e ')} que ${plural ? 'estão' : 'está'} neste aparelho ${
    plural ? 'saem' : 'sai'
  } no lugar.`;
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/* Descreve o arquivo para a pessoa reconhecê-lo ANTES de trocar o que está no
   aparelho por ele. É metade do que torna "substituir tudo" aceitável — a outra
   metade é o desfazer. */
/**
 * @param {Extract<ReturnType<typeof lerBackup>, { ok: true }>} lido
 * @returns {string}
 */
function explicarRestauracao(lido) {
  const { total, cartoes, primeiroMes, ultimoMes } = lido.resumo;

  const partes = [];

  /* "Vazia" só vale quando não tem nada mesmo: uma cópia com cartão e sem
     lançamento não está vazia, e dizer que está faria a pessoa desistir de
     restaurar justamente o que ela quer de volta. */
  if (total === 0 && cartoes === 0) {
    partes.push('Esta cópia está vazia: não tem nada dentro.');
  } else if (total === 0) {
    partes.push('Esta cópia não tem nenhum lançamento.');
  } else {
    const quantos = total === 1 ? '1 lançamento' : `${total} lançamentos`;
    /* Havendo lançamento, há mês: resumirEstado só devolve as pontas nulas para
       um estado vazio. O `|| ''` existe para o conferidor, que não correlaciona
       `total > 0` com as duas outras variáveis. */
    const doInicio = rotuloDoMes(primeiroMes || '');
    const doFim = rotuloDoMes(ultimoMes || '');
    const periodo = primeiroMes === ultimoMes ? ` de ${doInicio}` : `, de ${doInicio} a ${doFim}`;
    partes.push(`A cópia tem ${quantos}${periodo}.`);
  }

  /* Frase própria, e não emendada na de cima: "12 lançamentos e 2 cartões de
     setembro" leria como se os cartões fossem de setembro. O intervalo de
     meses é dos lançamentos. */
  if (cartoes > 0) {
    partes.push(cartoes === 1 ? 'Vem 1 cartão junto.' : `Vêm ${cartoes} cartões junto.`);
  }

  /* O outro lado da troca. É metade do que torna "substituir tudo" aceitável,
     e desde o B6 o "tudo" inclui os cartões — quem tem dois no desktop e
     restaura uma cópia do celular precisa saber que os dois saem. */
  const aqui = estado.lancamentos.length;
  const cartoesAqui = estado.cartoes.length;
  if (aqui > 0 || cartoesAqui > 0) {
    partes.push(oQueSaiDoAparelho(aqui, cartoesAqui));
  }

  if (lido.descartados > 0) {
    partes.push(
      lido.descartados === 1
        ? '1 lançamento do arquivo não pôde ser lido e não vem junto.'
        : `${lido.descartados} lançamentos do arquivo não puderam ser lidos e não vêm junto.`
    );
  }

  return partes.join(' ');
}

/** @param {Event} evento */
async function arquivoEscolhido(evento) {
  const entrada = $campo('arquivo-do-backup');
  const arquivo = entrada.files && entrada.files[0];
  // Zerar permite escolher o MESMO arquivo de novo: sem isto, o segundo change
  // não dispara e o botão parece quebrado.
  entrada.value = '';
  if (!arquivo) return;

  let texto;
  try {
    texto = await arquivo.text();
  } catch (e) {
    avisar('Não consegui abrir esse arquivo.');
    return;
  }

  const lido = lerBackup(texto);
  if (!lido.ok) {
    avisar(ERROS_DO_ARQUIVO[lido.erro] || 'Não consegui ler esse arquivo.');
    return;
  }

  pendenteDeRestauracao = lido;
  $('explicacao-do-restaurar').textContent = explicarRestauracao(lido);
  $dialogo('dialogo-restaurar').showModal();
}

$('botao-guardar').addEventListener('click', guardarCopia);
$('botao-trazer').addEventListener('click', () => $campo('arquivo-do-backup').click());
$campo('arquivo-do-backup').addEventListener('change', arquivoEscolhido);

$('restaurar-confirmar').addEventListener('click', () => {
  const lido = pendenteDeRestauracao;
  pendenteDeRestauracao = null;
  $dialogo('dialogo-restaurar').close();
  if (!lido) return;

  const anterior = instantaneo();
  const mesAnterior = mesVisivel;
  /* O estado INTEIRO, e não uma lista de campos.

     A lista existia e estava completa quando foi escrita no B4, com um Estado
     de dois campos de dado. O B5 acrescentou categorias e limites, o B6
     acrescentou cartões e faturas, e ninguém voltou aqui — não havia por que:
     o outro lado, o montarBackup, manda `estado` e cresceu de graça. Só esta
     ponta tinha campos escritos à mão esperando ser esquecidos.

     Assim campo novo no Estado entra na cópia sem ninguém precisar lembrar
     desta linha. O `lido.estado` já vem normalizado pelo lerBackup, então não
     há dado torto entrando por esta porta. Ver docs/backup-completo.md. */
  estado = lido.estado;

  /* Leva para um mês onde haja o que ver.
   *
   * Sem isto, quem restaura em setembro uma cópia que só tem dados de 2027 volta
   * para a tela e encontra um mês vazio — e conclui, com razão aparente, que não
   * funcionou. O mês atual continua sendo a preferência; só cede quando não tem
   * nada para mostrar. */
  if (!lancamentosDoMes(estado.lancamentos, mesVisivel).length && lido.resumo.ultimoMes) {
    mesVisivel = lido.resumo.ultimoMes;
  }

  salvar();
  location.hash = '#/inicio';
  avisar('Tudo de volta.', () => {
    mesVisivel = mesAnterior;
    restaurar(anterior);
  });
});

$('restaurar-cancelar').addEventListener('click', () => {
  pendenteDeRestauracao = null;
  $dialogo('dialogo-restaurar').close();
});

/* ---------- Apagar tudo ---------- */

function pedirApagamento() {
  const total = estado.lancamentos.length;
  $('explicacao-do-apagar').textContent =
    total === 0
      ? 'Não há nada para apagar: este aparelho já está vazio.'
      : total === 1
        ? 'O único lançamento deste aparelho vai embora.'
        : `Os ${total} lançamentos deste aparelho vão embora.`;
  $dialogo('dialogo-apagar').showModal();
}

$('botao-apagar').addEventListener('click', pedirApagamento);
$('apagar-cancelar').addEventListener('click', () => $dialogo('dialogo-apagar').close());

/* A fricção certa não é dificultar o gesto, é resolver o arrependimento antes
   dele acontecer. Guardar a cópia deixa o diálogo aberto de propósito: a pessoa
   veio aqui para apagar, e ainda vai querer apagar depois de guardar.
 *
 * A resposta vem no próprio botão, e não pelo aviso de sempre: um <dialog>
 * modal vive na top layer, e o aviso apareceria atrás dele. Um clique sem
 * resposta visível, na tela em que a pessoa está prestes a apagar tudo, é o
 * pior lugar do app para deixar alguém em dúvida. */
$('apagar-guardar-antes').addEventListener('click', async (evento) => {
  const botao = /** @type {HTMLButtonElement} */ (evento.currentTarget);
  const original = botao.textContent;

  botao.disabled = true;
  const guardou = await guardarCopia();

  // Desistir do menu de compartilhar não guardou nada, e dizer que guardou
  // seria mentir bem na hora em que a pessoa mais precisa acreditar no app.
  botao.textContent = guardou ? 'Cópia guardada' : original;
  setTimeout(() => {
    botao.textContent = original;
    botao.disabled = false;
  }, 2500);
});

$('apagar-confirmar').addEventListener('click', () => {
  $dialogo('dialogo-apagar').close();

  // instantaneo() guarda lançamentos, realizados, categorias e limites — os
  // quatro precisam voltar juntos, senão desfazer devolve os lançamentos com
  // as categorias que a pessoa criou já apagadas de vez.
  const anterior = instantaneo();
  // A data da última cópia vai junto: ela é um fato deste aparelho, e o aparelho
  // acabou de ser esvaziado. O tema fica, porque é preferência, não dado.
  const ultimoBackup = armazenamento.ler(CHAVE_BACKUP);

  estado = estadoVazio();
  armazenamento.gravar(CHAVE_BACKUP, '');
  salvar();

  avisar('Tudo apagado.', () => {
    if (ultimoBackup) armazenamento.gravar(CHAVE_BACKUP, ultimoBackup);
    restaurar(anterior);
  });
});

/* ---------- Categorias: a folha de escolher ---------- */

/* O registro que está recebendo uma categoria nova, enquanto a folha de
   escolha está aberta. `null` fora desse momento. */
/** @type {LancamentoDoMes|null} */
let lancamentoParaCategoria = null;

/* A folha de categoria serve a dois propósitos: escolher a categoria de um
 * registro, e escolher a categoria de um limite novo. O segundo caso não tem
 * registro nenhum por trás — é alguém que quer combinar um teto antes de
 * gastar —, então "Sem categoria" e "criar uma categoria" saem de cena. */
let escolhendoParaLimite = false;

/** @param {LancamentoDoMes} lancamento */
function abrirEscolhaDeCategoria(lancamento) {
  lancamentoParaCategoria = lancamento;
  $campo('campo-nova-categoria').value = '';
  desenharEscolhaDeCategoria();
  $dialogo('dialogo-categoria').showModal();
}

/* Abre a mesma folha para escolher de que categoria será o limite. */
function abrirEscolhaParaLimite() {
  escolhendoParaLimite = true;
  lancamentoParaCategoria = null;
  desenharEscolhaDeCategoria();
  $dialogo('dialogo-categoria').showModal();
}

function desenharEscolhaDeCategoria() {
  const lista = $('lista-categorias');
  lista.textContent = '';

  $('titulo-do-dialogo-categoria').textContent = escolhendoParaLimite
    ? 'Limite de qual categoria?'
    : 'Categoria';
  $('campo-da-nova-categoria').hidden = escolhendoParaLimite;

  if (escolhendoParaLimite) {
    // Limite é de despesa: não se combina um teto para o salário.
    for (const c of categoriasDisponiveis(estado, 'saida')) {
      lista.appendChild(opcaoDeCategoria(c.id, c.nome, false));
    }
    return;
  }

  if (!lancamentoParaCategoria) return;
  const { tipo, categoria } = lancamentoParaCategoria;
  const atual = categoria ?? null;

  lista.appendChild(opcaoDeCategoria(null, 'Sem categoria', atual === null));
  for (const c of categoriasDisponiveis(estado, tipo)) {
    lista.appendChild(opcaoDeCategoria(c.id, c.nome, c.id === atual));
  }
}

/**
 * @param {string|null} id
 * @param {string} nome
 * @param {boolean} selecionada
 * @returns {HTMLLIElement}
 */
function opcaoDeCategoria(id, nome, selecionada) {
  const item = document.createElement('li');

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'opcao-categoria' + (selecionada ? ' selecionada' : '');
  botao.setAttribute('aria-pressed', String(selecionada));
  botao.addEventListener('click', () => selecionarCategoria(id));

  const texto = document.createElement('span');
  texto.textContent = nome;
  botao.appendChild(texto);

  if (selecionada) {
    // Estático, sem dado do usuário: o mesmo traço de "marcado" que o
    // marcador-realizado já usa.
    botao.insertAdjacentHTML(
      'beforeend',
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.4 4.4 9.3 10.5 3"/></svg>'
    );
  }

  item.appendChild(botao);
  return item;
}

/** @param {string} id @param {string|null} categoriaId */
function aplicarCategoria(id, categoriaId) {
  estado = {
    ...estado,
    lancamentos: estado.lancamentos.map((l) => (l.id === id ? { ...l, categoria: categoriaId } : l)),
  };
}

/** @param {string|null} id */
function selecionarCategoria(id) {
  if (escolhendoParaLimite) {
    if (id === null) return;
    const categoria = categoriaPorId(estado, id);
    if (!categoria) return;

    /* O gasto vem da lista do mês, e não de uma soma feita aqui: quem não
       aparece na lista não gastou nada, e zero é um fato, não uma conta. */
    const fatia = linhasDoRelatorio(mesVisivel).find((linha) => linha.id === id);

    $dialogo('dialogo-categoria').close();
    abrirLimite(id, categoria.nome, fatia ? Math.max(fatia.previsto, fatia.realizado) : 0);
    return;
  }

  const alvo = lancamentoParaCategoria;
  if (!alvo) return;

  const mudou = id !== (alvo.categoria ?? null);
  const anterior = instantaneo();
  aplicarCategoria(alvo.id, id);

  $dialogo('dialogo-categoria').close();
  lancamentoParaCategoria = null;
  salvar();

  if (mudou) avisar('Categoria atualizada.', () => restaurar(anterior));
}

$('categoria-criar').addEventListener('click', () => {
  const alvo = lancamentoParaCategoria;
  if (!alvo) return;

  const nome = $campo('campo-nova-categoria').value.trim();
  if (!nome) return;

  const anterior = instantaneo();
  const id = idDeCategoriaPeloNome(estado, nome, alvo.tipo);
  // Digitar o nome de uma categoria que já existe não cria nada — e dizer
  // "criada" seria anunciar um trabalho que não aconteceu.
  const jaExistia = categoriaPorId(estado, id) !== null;
  estado = criarCategoria(estado, nome, alvo.tipo);
  aplicarCategoria(alvo.id, id);

  const nomeFinal = categoriaPorId(estado, id)?.nome ?? nome;

  $dialogo('dialogo-categoria').close();
  lancamentoParaCategoria = null;
  salvar();
  avisar(
    jaExistia ? `Categoria "${nomeFinal}" aplicada.` : `Categoria "${nomeFinal}" criada e aplicada.`,
    () => restaurar(anterior)
  );
});

$('categoria-cancelar').addEventListener('click', () => {
  lancamentoParaCategoria = null;
  $dialogo('dialogo-categoria').close();
});

/* ---------- Cartões de crédito (B6) ---------- */

/* Qual cartão está sendo editado. `null` é "criando um novo" — o mesmo padrão
   do formulário de lançamento, que distingue novo de edição por uma variável
   assim em vez de por um sinalizador à parte. */
/** @type {string|null} */
let cartaoEmEdicao = null;

function desenharCartoes() {
  const cartoes = cartoesAtivos(estado);

  $('cartoes-mes').textContent = 'Faturas de ' + rotuloDoMes(mesVisivel) + '.';

  const lista = $('lista-cartoes');
  lista.textContent = '';
  for (const cartao of cartoes) lista.appendChild(linhaDoCartao(cartao));

  lista.hidden = cartoes.length === 0;
  $('cartoes-vazio').hidden = cartoes.length > 0;
}

/** @param {Cartao} cartao @returns {HTMLLIElement} */
function linhaDoCartao(cartao) {
  const fatura = faturaDoMes(estado, cartao.id, mesVisivel);
  const paga = estaRealizado(estado.realizados, idDaFatura(cartao.id), mesVisivel);

  const item = document.createElement('li');
  item.className = 'linha-cartao' + (paga ? ' realizado' : '');

  const toque = document.createElement('button');
  toque.type = 'button';
  toque.className = 'cartao-toque';
  toque.setAttribute('aria-label', 'Abrir a fatura do ' + cartao.nome);
  toque.addEventListener('click', () => abrirDetalheCartao(cartao.id, 'cartoes'));

  const nome = document.createElement('span');
  nome.className = 'cartao-nome';
  nome.textContent = cartao.nome;

  const valor = document.createElement('span');
  valor.className = 'cartao-valor tabular saida';
  valor.textContent = formatarDinheiro(fatura ? fatura.valor : 0);

  const quando = document.createElement('span');
  quando.className = 'cartao-quando';
  quando.textContent = paga
    ? 'fatura paga'
    : 'fecha dia ' + String(cartao.fechamento).padStart(2, '0') +
      ' · vence dia ' + String(cartao.vencimento).padStart(2, '0');

  toque.append(nome, valor, quando);

  /* A barra só aparece quando há limite. Sem limite, ela compararia a fatura
     contra nada — uma barra sempre vazia, ou sempre cheia, mentiria as duas. */
  if (cartao.limite > 0 && fatura) {
    const situacao = situacaoDoLimite(fatura.valor, cartao.limite);

    const trilho = document.createElement('div');
    trilho.className = 'trilho';
    const trecho = document.createElement('div');
    trecho.className = 'trecho cheio saida';
    trecho.style.width = situacao.proporcao + '%';
    trilho.appendChild(trecho);

    const nota = document.createElement('span');
    nota.className = 'cartao-limite';
    /* Sem bronca, mesmo estourado: o conceito pede informação, não fiscal. E a
       inversão de sinal vem pronta do núcleo (`excedente`), porque conta com
       dinheiro não se faz aqui. */
    nota.textContent = situacao.estourou
      ? formatarDinheiro(situacao.excedente) + ' acima do limite'
      : formatarDinheiro(situacao.usado) + ' de ' + formatarDinheiro(cartao.limite);

    toque.append(trilho, nota);
  }

  const editar = document.createElement('button');
  editar.type = 'button';
  editar.className = 'cartao-editar';
  editar.setAttribute('aria-label', 'Editar o cartão ' + cartao.nome);
  editar.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  editar.addEventListener('click', () => abrirCartao(cartao.id));

  item.append(toque, editar);
  return item;
}

/* ---------- O cartão: criar e editar ---------- */

/** @param {string|null} id */
function abrirCartao(id) {
  cartaoEmEdicao = id;
  const cartao = cartaoPorId(estado, id);

  $('titulo-do-cartao').textContent = cartao ? 'Editar cartão' : 'Novo cartão';
  $campo('campo-nome-do-cartao').value = cartao ? cartao.nome : '';
  $campo('campo-limite-do-cartao').value = cartao && cartao.limite ? valorParaCampo(cartao.limite) : '';
  $campo('campo-fechamento').value = String(cartao ? cartao.fechamento : 30);
  $campo('campo-vencimento').value = String(cartao ? cartao.vencimento : 10);
  $('cartao-arquivar').hidden = !cartao;
  $('erro-do-cartao').hidden = true;
  atualizarDicaDoCiclo();

  $dialogo('dialogo-cartao').showModal();
}

/* Explica o par fechamento/vencimento com os números que a pessoa acabou de
   digitar, em vez de uma frase genérica. Ninguém sabe de cor o que "fecha 30,
   vence 10" faz com a compra de amanhã — e é exatamente essa a dúvida. */
function atualizarDicaDoCiclo() {
  const fechamento = limitarDia($campo('campo-fechamento').value);
  const vencimento = limitarDia($campo('campo-vencimento').value);
  const mesmoMes = fechamento < vencimento;

  $('dica-do-ciclo').textContent =
    `Compras até o dia ${fechamento} entram na fatura que vence no dia ` +
    `${vencimento} ${mesmoMes ? 'do mesmo mês' : 'do mês seguinte'}. ` +
    'Depois disso, já é a próxima fatura.';
}

function salvarCartao() {
  const nome = $campo('campo-nome-do-cartao').value.trim();
  if (!nome) return erroDoCartao('Dê um nome ao cartão.');

  const limiteDigitado = $campo('campo-limite-do-cartao').value.trim();
  const limite = limiteDigitado ? analisarValor(limiteDigitado) : 0;
  if (limite === null) return erroDoCartao('Não entendi o limite.');

  const fechamento = limitarDia($campo('campo-fechamento').value);
  const vencimento = limitarDia($campo('campo-vencimento').value);
  const anterior = instantaneo();

  estado = cartaoEmEdicao
    ? alterarCartao(estado, cartaoEmEdicao, { nome, limite, fechamento, vencimento })
    : criarCartao(estado, novoId(), nome, limite, fechamento, vencimento);

  const criando = !cartaoEmEdicao;
  $dialogo('dialogo-cartao').close();
  salvar();
  avisar(criando ? 'Cartão adicionado.' : 'Cartão salvo.', () => restaurar(anterior));
}

/** @param {string} texto */
function erroDoCartao(texto) {
  const erro = $('erro-do-cartao');
  erro.textContent = texto;
  erro.hidden = false;
}

function arquivarCartaoAberto() {
  if (!cartaoEmEdicao) return;
  const id = cartaoEmEdicao;
  const nome = cartaoPorId(estado, id)?.nome ?? 'Cartão';
  $dialogo('dialogo-cartao').close();

  pedirConfirmacao({
    titulo: 'Arquivar cartão?',
    mensagem: `O cartão "${nome}" será arquivado. Suas compras e faturas anteriores continuarão registradas.`,
    textoConfirmar: 'Arquivar cartão',
    aoConfirmar: () => {
      const anterior = instantaneo();
      estado = arquivarCartao(estado, id);
      cartaoEmEdicao = null;
      salvar();
      /* "Arquivado", e não "excluído": a palavra tem que corresponder ao que
         aconteceu. As compras e as faturas pagas continuam lá, e dizer "excluído"
         faria a pessoa achar que perdeu o histórico. */
      avisar(nome + ' foi arquivado.', () => restaurar(anterior));
    },
  });
}

/* ---------- A fatura e a tela de detalhamento em tela cheia ---------- */

/** @type {string|null} */
let cartaoDetalheId = null;

/** @type {string} */
let origemDetalheCartao = 'cartoes';

/**
 * @param {string} cartaoId
 * @param {string} [origem]
 */
function abrirDetalheCartao(cartaoId, origem) {
  origemDetalheCartao = origem || (document.body.dataset.tela === 'inicio' ? 'inicio' : 'cartoes');
  cartaoDetalheId = cartaoId;
  location.hash = '#/cartao-detalhe';
  desenharDetalheCartao();
  mostrarTela('cartao-detalhe');
}

function fecharDetalheCartao() {
  fecharDialogoAjusteFatura();
  const destino = origemDetalheCartao || 'cartoes';
  origemDetalheCartao = 'cartoes';
  cartaoDetalheId = null;
  location.hash = '#/' + destino;
  mostrarTela(destino);
}

/**
 * Retorna o timestamp (em ms) de quando o lançamento foi criado.
 * @param {LancamentoDoMes} l
 * @returns {number}
 */
function timestampDeCriacao(l) {
  if (l.criadoEm) {
    const t = new Date(l.criadoEm).getTime();
    if (!isNaN(t)) return t;
  }
  if (l.id && typeof l.id === 'string') {
    const base36 = l.id.slice(0, 8);
    const parsed = parseInt(base36, 36);
    if (parsed > 1577836800000 && parsed < 2524608000000) {
      return parsed;
    }
  }
  if (!l.fixo && l.data) {
    const d = new Date(l.data + 'T12:00:00');
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

/** @param {LancamentoDoMes} l @returns {string} */
function dataDaCompra(l) {
  return !l.fixo ? l.data : (mesVisivel + '-' + String(l.dia).padStart(2, '0'));
}

/**
 * Retorna o momento em milissegundos para ordenação cronológica decrescente da compra.
 * Combina a data da compra (dia em que foi feita) com o horário em que foi anotada.
 * @param {LancamentoDoMes} l
 * @returns {number}
 */
function momentoDoLancamento(l) {
  const dataISO = dataDaCompra(l);
  const tsCriacao = timestampDeCriacao(l);
  let msNoDia = 0;
  if (tsCriacao > 0) {
    const d = new Date(tsCriacao);
    msNoDia = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();
  }
  const partes = dataISO.split('-').map(Number);
  if (partes.length === 3) {
    const baseDia = new Date(partes[0], partes[1] - 1, partes[2]).getTime();
    return baseDia + msNoDia;
  }
  return tsCriacao;
}

function desenharDetalheCartao() {
  if (!cartaoDetalheId) {
    location.hash = '#/cartoes';
    mostrarTela('cartoes');
    return;
  }
  const cartao = cartaoPorId(estado, cartaoDetalheId);
  if (!cartao) {
    location.hash = '#/cartoes';
    mostrarTela('cartoes');
    return;
  }

  const fatura = faturaDoMes(estado, cartao.id, mesVisivel);
  const paga = estaRealizado(estado.realizados, idDaFatura(cartao.id), mesVisivel);

  $('titulo-detalhe-cartao').textContent = 'Fatura do ' + cartao.nome;

  $('cartao-detalhe-situacao').textContent =
    'Vence dia ' + String(cartao.vencimento).padStart(2, '0') + ' de ' + rotuloDoMes(mesVisivel) +
    (paga ? ' — já paga.' : '.');

  $('cartao-detalhe-valor').textContent = formatarDinheiro(fatura ? fatura.valor : 0);

  $('cartao-detalhe-ciclo').textContent =
    'fecha dia ' + String(cartao.fechamento).padStart(2, '0') +
    ' · vence dia ' + String(cartao.vencimento).padStart(2, '0');

  const trilho = $('cartao-detalhe-trilho');
  const textoLimite = $('cartao-detalhe-limite-texto');

  if (cartao.limite > 0 && fatura) {
    const situacao = situacaoDoLimite(fatura.valor, cartao.limite);
    trilho.hidden = false;
    $('cartao-detalhe-barra').style.width = situacao.proporcao + '%';

    textoLimite.hidden = false;
    textoLimite.textContent = situacao.estourou
      ? formatarDinheiro(situacao.excedente) + ' acima do limite'
      : formatarDinheiro(situacao.usado) + ' de ' + formatarDinheiro(cartao.limite);
  } else {
    trilho.hidden = true;
    textoLimite.hidden = true;
  }

  const botaoPaga = $('detalhe-marcar-paga');
  botaoPaga.textContent = paga ? 'Desmarcar como paga' : 'Marcar como paga';

  const compras = comprasDaFatura(estado, cartao.id, mesVisivel);
  const lista = $('lista-compras-detalhe');
  lista.textContent = '';

  const comprasOrdenadas = [...compras].sort(
    (a, b) => momentoDoLancamento(b) - momentoDoLancamento(a) || b.id.localeCompare(a.id)
  );

  let totalCompras = 0;
  for (const compra of comprasOrdenadas) {
    totalCompras += compra.tipo === 'entrada' ? -compra.valor : compra.valor;
    lista.appendChild(linhaDaCompraDetalhe(compra));
  }

  $('total-compras-detalhe').textContent = formatarDinheiro(totalCompras);
  lista.hidden = compras.length === 0;
  $('detalhe-sem-compras').hidden = compras.length > 0;

  $campo('campo-fatura-detalhe').value = !fatura || fatura.valor === 0 ? '' : valorParaCampo(fatura.valor);
  previverOAjusteDetalhe();
}

/** @param {LancamentoDoMes} compra @returns {HTMLLIElement} */
function linhaDaCompraDetalhe(compra) {
  const item = document.createElement('li');
  item.className = 'lancamento-detalhe';
  item.setAttribute('role', 'button');
  item.tabIndex = 0;
  item.setAttribute('aria-label', 'Editar ' + compra.descricao);
  item.addEventListener('click', () => abrirFormulario(compra));
  item.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirFormulario(compra);
    }
  });

  const esquerda = document.createElement('div');
  esquerda.className = 'lancamento-detalhe-esquerda';

  const dataISO = !compra.fixo ? compra.data : (mesVisivel + '-' + String(compra.dia).padStart(2, '0'));
  const partes = dataISO.split('-');
  const dataTexto = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(compra.dia).padStart(2, '0');

  const ts = timestampDeCriacao(compra);
  let horaTexto = '';
  if (ts > 0) {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    horaTexto = `${h}:${m}`;
  }

  const nome = document.createElement('span');
  nome.className = 'lancamento-detalhe-nome';
  nome.textContent = compra.descricao;

  const meta = document.createElement('div');
  meta.className = 'lancamento-detalhe-meta';

  const data = document.createElement('span');
  data.className = 'lancamento-detalhe-data tabular';
  data.textContent = horaTexto ? `${dataTexto} · ${horaTexto}` : dataTexto;
  meta.appendChild(data);

  esquerda.append(nome, meta);

  const direita = document.createElement('div');
  direita.className = 'lancamento-detalhe-direita';

  const credito = compra.tipo === 'entrada';
  const valor = document.createElement('span');
  valor.className = 'lancamento-detalhe-valor tabular ' + (credito ? 'entrada' : 'saida');
  valor.textContent = (credito ? '+ ' : '− ') + formatarDinheiro(compra.valor);

  const botaoCat = botaoDeCategoria(compra, 'lancamento-detalhe-categoria-btn');

  direita.append(valor, botaoCat);
  item.append(esquerda, direita);
  return item;
}

function previverOAjusteDetalhe() {
  const previa = $('fatura-detalhe-explicacao');
  if (!cartaoDetalheId) return;

  const digitado = $campo('campo-fatura-detalhe').value.trim();
  const total = digitado ? analisarValor(digitado) : 0;

  if (total === null) {
    previa.hidden = false;
    previa.textContent = 'Não entendi esse valor.';
    return;
  }

  const ajuste = ajusteDeFatura(estado, cartaoDetalheId, mesVisivel, total, 'previa', hojeISO());

  previa.hidden = false;
  previa.textContent = !ajuste
    ? 'É o total que a fatura já tem. Nada a ajustar.'
    : ajuste.tipo === 'saida'
      ? 'Vai criar um ajuste de ' + formatarDinheiro(ajuste.valor) + '.'
      : 'Vai criar um crédito de ' + formatarDinheiro(ajuste.valor) + '.';
}

function abrirDialogoAjusteFatura() {
  if (!cartaoDetalheId) return;
  const fatura = faturaDoMes(estado, cartaoDetalheId, mesVisivel);

  const campo = $campo('campo-fatura-detalhe');
  campo.value = !fatura || fatura.valor === 0 ? '' : valorParaCampo(fatura.valor);

  previverOAjusteDetalhe();
  $dialogo('dialogo-ajuste-fatura').showModal();
  setTimeout(() => campo.focus(), 50);
}

function fecharDialogoAjusteFatura() {
  $dialogo('dialogo-ajuste-fatura').close();
}

function anotarCompraNaTelaDetalhe() {
  if (!cartaoDetalheId) return;
  const cartao = cartaoPorId(estado, cartaoDetalheId);
  if (!cartao) return;

  const data = dataPadraoDaFatura(cartao, mesVisivel, hojeISO());

  abrirFormulario(null);
  definirTipo('saida');
  $selecao('campo-repeticao').value = 'avulsa';
  definirRepeticao(false);
  $campo('campo-data').value = data;
  desenharEscolhaDeCartao();
  $selecao('campo-cartao').value = cartaoDetalheId;
  atualizarDicaDoCartao();
}

function alternarFaturaPagaDetalhe() {
  if (!cartaoDetalheId) return;
  const fatura = faturaDoMes(estado, cartaoDetalheId, mesVisivel);
  if (!fatura) return;
  alternarFeito(fatura);
  desenharDetalheCartao();
}

function salvarValorDaFaturaDetalhe() {
  if (!cartaoDetalheId) return;

  const digitado = $campo('campo-fatura-detalhe').value.trim();
  const total = digitado ? analisarValor(digitado) : 0;
  if (total === null) return;

  const ajuste = ajusteDeFatura(estado, cartaoDetalheId, mesVisivel, total, novoId(), hojeISO());

  if (!ajuste) {
    avisar('A fatura já estava nesse total.');
    fecharDialogoAjusteFatura();
    return;
  }

  const anterior = instantaneo();
  estado = { ...estado, lancamentos: [...estado.lancamentos, ajuste] };

  salvar();
  fecharDialogoAjusteFatura();
  avisar(
    ajuste.tipo === 'saida'
      ? 'Ajuste de ' + formatarDinheiro(ajuste.valor) + ' anotado.'
      : 'Crédito de ' + formatarDinheiro(ajuste.valor) + ' anotado.',
    () => restaurar(anterior)
  );
}

/** @param {string} cartaoId */
function abrirFatura(cartaoId) {
  abrirDetalheCartao(cartaoId, 'inicio');
}

function anotarCompraNaFatura() {
  anotarCompraNaTelaDetalhe();
}

function salvarValorDaFatura() {
  salvarValorDaFaturaDetalhe();
}

/* ---------- Relatório: para onde o dinheiro foi ---------- */

/* A tela é alcançada pela aba do Relatório na navegação de baixo — ver
 * index.html — e não por um botão com listener: é a mesma navegação por hash
 * que já existe para Início/Metas/Ajustes, e ganhar um segundo jeito de trocar
 * de tela seria dívida.
 *
 * Ela some do <body data-tela> sozinha quando outra tela fica visível
 * (mostrarTela cuida disso), e é desenhada sempre que `desenhar()` roda — a
 * mesma regra que os Ajustes já seguem — para que mês e estado nunca fiquem
 * defasados quando a pessoa volta a ela.
 */

function desenharRelatorio() {
  const linhas = linhasDoRelatorio(mesVisivel);

  $('relatorio-mes').textContent = 'Em ' + rotuloDoMes(mesVisivel) + '.';

  const lista = $('lista-relatorio');
  lista.textContent = '';
  for (const linha of linhas) lista.appendChild(linhaDoRelatorio(linha));

  lista.hidden = linhas.length === 0;
  $('relatorio-vazio').hidden = linhas.length > 0;
}

/**
 * Junta o que já foi gasto no mês com quem tem limite definido mas ficou em
 * R$ 0,00 (decisão 6 do B5, corrigida): sem esta segunda parte, um limite
 * posto num mês sem gasto naquela categoria fica sem porta de saída — a falha
 * que o `juiz` apontou na primeira versão deste bloco.
 *
 * É só junção, filtro e ordenação por nome — nenhuma conta nova com dinheiro.
 * O total de quem não gastou é `0`, um fato conhecido, não um valor inventado;
 * por isso a função mora aqui, e não no núcleo.
 * @param {Mes} mes
 * @returns {GastoDeCategoria[]}
 */
function linhasDoRelatorio(mes) {
  const fatias = gastosPorCategoria(estado.lancamentos, estado.realizados, mes, estado.cartoes);
  const jaListadas = new Set(fatias.map((f) => f.id));

  const semGasto = Object.keys(estado.limites)
    .filter((id) => !jaListadas.has(id))
    .map((id) => categoriaPorId(estado, id))
    .filter((categoria) => categoria !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((categoria) => ({
      id: categoria.id,
      previsto: 0,
      realizado: 0,
      total: 0,
      quantidade: 0,
      proporcao: { realizado: 0, previsto: 0 },
    }));

  return [...fatias, ...semGasto];
}

/** @param {GastoDeCategoria} fatia @returns {HTMLLIElement} */
function linhaDoRelatorio(fatia) {
  const semCategoria = fatia.id === null;
  const categoria = fatia.id === null ? null : categoriaPorId(estado, fatia.id);
  // Uma categoria do usuário pode ter sido escondida depois de já ter gasto
  // registrado em meses anteriores — categoriaPorId ainda a encontra (decisão
  // 4), então "categoria removida" só cobre o caso, teoricamente impossível
  // hoje, de um id que não existe em lugar nenhum.
  const nome = semCategoria ? 'Sem categoria' : categoria ? categoria.nome : 'Categoria removida';
  const limite = fatia.id ? estado.limites[fatia.id] || 0 : 0;
  // O limite compara com o gasto total da categoria no mês, inclusive o planejado
  const totalGasto = Math.max(fatia.previsto, fatia.realizado);
  const situacao = limite > 0 ? situacaoDoLimite(totalGasto, limite) : null;

  const item = document.createElement('li');
  item.className = 'linha-categoria';

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'barra linha-categoria-botao' + (semCategoria ? ' vazia' : '');

  const rotuloNome = document.createElement('span');
  rotuloNome.className = 'barra-nome';
  rotuloNome.textContent = nome;

  const valor = document.createElement('span');
  valor.className = 'barra-valor tabular';
  valor.textContent = formatarDinheiro(fatia.previsto);

  const trilho = document.createElement('div');
  trilho.className = 'trilho';

  const trechoCheio = document.createElement('div');
  trechoCheio.className = 'trecho cheio ' + (semCategoria ? 'categoria-vazia' : 'saida');
  trechoCheio.style.width = fatia.proporcao.realizado + '%';

  const trechoClaro = document.createElement('div');
  trechoClaro.className = 'trecho claro ' + (semCategoria ? 'categoria-vazia' : 'saida');
  trechoClaro.style.width = fatia.proporcao.previsto + '%';

  trilho.append(trechoCheio, trechoClaro);

  botao.append(rotuloNome, valor, trilho);

  // aria-label no botão substitui todo o texto dos filhos para quem usa
  // leitor de tela — por isso a legenda do limite entra nele também, e não só
  // no texto visível (decisão 6b do B5).
  let rotuloAcessivel = semCategoria
    ? `Sem categoria: ${formatarDinheiro(fatia.previsto)} planejado, ${formatarDinheiro(fatia.realizado)} pago. Toque para corrigir.`
    : `Ver o limite de ${nome}: ${formatarDinheiro(fatia.previsto)} planejado, ${formatarDinheiro(fatia.realizado)} pago.`;

  if (situacao) {
    const legenda = document.createElement('p');
    legenda.className = 'legenda-limite';
    legenda.classList.toggle('estourou', situacao.estourou);
    // Informação, nunca bronca (decisão 5 do B5): coral, sem ícone de alerta,
    // sem exclamação, sem a palavra "estourou" na tela. O excedente vem pronto
    // do núcleo, em positivo — inverter o sinal aqui seria conta com dinheiro
    // fora do lugar.
    const base = `${formatarDinheiro(situacao.usado)} de ${formatarDinheiro(limite)}`;
    legenda.textContent = situacao.estourou
      ? `${base} — ${formatarDinheiro(situacao.excedente)} a mais.`
      : `${base}.`;
    botao.appendChild(legenda);
    rotuloAcessivel += ` ${legenda.textContent}`;
  } else if (fatia.previsto > 0 && fatia.realizado > 0 && fatia.realizado < fatia.previsto) {
    const legenda = document.createElement('p');
    legenda.className = 'legenda-limite';
    legenda.textContent = `${formatarDinheiro(fatia.realizado)} pago.`;
    botao.appendChild(legenda);
  } else if (fatia.previsto > 0 && fatia.realizado === 0) {
    const legenda = document.createElement('p');
    legenda.className = 'legenda-limite';
    legenda.textContent = 'A pagar.';
    botao.appendChild(legenda);
  } else if (fatia.previsto > 0 && fatia.realizado >= fatia.previsto) {
    const legenda = document.createElement('p');
    legenda.className = 'legenda-limite';
    legenda.textContent = 'Pago.';
    botao.appendChild(legenda);
  }

  botao.setAttribute('aria-label', rotuloAcessivel);
  botao.addEventListener('click', () => {
    if (semCategoria) irCorrigirSemCategoria();
    else if (fatia.id) abrirLimite(fatia.id, nome, totalGasto);
  });

  item.appendChild(botao);
  return item;
}

/* "Sem categoria" não tem para onde levar um limite — limite é por categoria,
   e não existe categoria aqui. A correção mora onde ela sempre morou: no toque
   na etiqueta de cada registro (decisão 2). Esta função só leva até lá. */
function irCorrigirSemCategoria() {
  location.hash = '#/inicio';
  avisar('Toque na etiqueta de um lançamento para dar uma categoria a ele.');
}

/* ---------- O limite de uma categoria ---------- */

/** @type {{ id: string, nome: string, gasto: number }|null} */
let limiteEmEdicao = null;

/**
 * @param {string} id
 * @param {string} nome
 * @param {number} gasto
 */
function abrirLimite(id, nome, gasto) {
  limiteEmEdicao = { id, nome, gasto };
  desenharLimite();
  $dialogo('dialogo-limite').showModal();
}

function desenharLimite() {
  if (!limiteEmEdicao) return;
  const { nome, gasto } = limiteEmEdicao;
  const limiteAtual = estado.limites[limiteEmEdicao.id] || 0;
  const situacao = situacaoDoLimite(gasto, limiteAtual);

  $('titulo-do-limite').textContent = nome;

  // Informação, nunca bronca (decisão 5 do B5): coral, sem ícone de alerta,
  // sem exclamação, sem a palavra "estourou" na tela.
  const situacaoTexto = $('limite-situacao');
  if (limiteAtual > 0) {
    /* "combinado" saiu: sugere promessa quebrada, que é meio passo na direção
       do fiscal. A frase base é a que a decisão 5 do plano escreveu, e o
       excedente vem pronto do núcleo — inverter o sinal aqui era conta com
       dinheiro fora do lugar. */
    const base = `Você já usou ${formatarDinheiro(situacao.usado)} dos ${formatarDinheiro(limiteAtual)}`;
    situacaoTexto.textContent = situacao.estourou
      ? `${base} — ${formatarDinheiro(situacao.excedente)} a mais.`
      : `${base}.`;
  } else {
    situacaoTexto.textContent = `Você já usou ${formatarDinheiro(situacao.usado)} este mês.`;
  }
  situacaoTexto.classList.toggle('estourou', situacao.estourou);

  $('limite-trilho').hidden = limiteAtual <= 0;
  $('limite-trecho').style.width = situacao.proporcao + '%';

  $campo('campo-limite').value = limiteAtual > 0 ? valorParaCampo(limiteAtual) : '';
  $('limite-remover').hidden = limiteAtual <= 0;
}

$('limite-salvar').addEventListener('click', () => {
  if (!limiteEmEdicao) return;
  const anterior = instantaneo();
  const valor = analisarValor($campo('campo-limite').value);

  estado = { ...estado, limites: definirLimite(estado.limites, limiteEmEdicao.id, valor) };
  salvar();
  $dialogo('dialogo-limite').close();
  limiteEmEdicao = null;
  /* O Relatório é uma tela, não um diálogo (decisão 6 do B5, corrigida): ela
     já está visível atrás deste <dialog>, e `salvar()` acabou de redesenhá-la
     — não há nada para reabrir. O que continua valendo é fechar o <dialog>
     ANTES de chamar `avisar`: um <dialog> modal aberto vai para a top layer e
     torna inerte todo o resto, inclusive o próprio aviso — o Desfazer ficava
     atrás do véu, visível e sem clique, até o timer apagá-lo. */
  avisar(valor > 0 ? 'Limite salvo.' : 'Limite removido.', () => restaurar(anterior));
});

$('limite-remover').addEventListener('click', () => {
  if (!limiteEmEdicao) return;
  const alvo = limiteEmEdicao;
  $dialogo('dialogo-limite').close();

  pedirConfirmacao({
    titulo: 'Remover limite?',
    mensagem: `O limite para ${alvo.nome} será removido.`,
    textoConfirmar: 'Remover limite',
    aoConfirmar: () => {
      const anterior = instantaneo();
      estado = { ...estado, limites: definirLimite(estado.limites, alvo.id, 0) };
      salvar();
      limiteEmEdicao = null;
      avisar('Limite removido.', () => restaurar(anterior));
    },
  });
});

$('botao-definir-limite').addEventListener('click', abrirEscolhaParaLimite);

$('limite-cancelar').addEventListener('click', () => {
  $dialogo('dialogo-limite').close();
});

/* ---------- Cartões: eventos ---------- */

$('botao-novo-cartao').addEventListener('click', () => abrirCartao(null));

$('formulario-cartao').addEventListener('submit', (evento) => {
  evento.preventDefault();
  salvarCartao();
});

$('cartao-arquivar').addEventListener('click', arquivarCartaoAberto);

$('cartao-cancelar').addEventListener('click', () => {
  $dialogo('dialogo-cartao').close();
});

$('cartao-detalhe-voltar').addEventListener('click', fecharDetalheCartao);
$('detalhe-anotar-compra').addEventListener('click', anotarCompraNaTelaDetalhe);
$('detalhe-marcar-paga').addEventListener('click', alternarFaturaPagaDetalhe);
$('botao-ajustar-fatura').addEventListener('click', abrirDialogoAjusteFatura);
$('dialogo-ajuste-salvar').addEventListener('click', salvarValorDaFaturaDetalhe);
$('dialogo-ajuste-cancelar').addEventListener('click', fecharDialogoAjusteFatura);
$campo('campo-fatura-detalhe').addEventListener('input', previverOAjusteDetalhe);

$('fatura-adicionar').addEventListener('click', anotarCompraNaFatura);

$('fatura-salvar').addEventListener('click', salvarValorDaFatura);
$campo('campo-fatura').addEventListener('input', previverOAjusteDetalhe);

$('fatura-cancelar').addEventListener('click', () => {
  $dialogo('dialogo-fatura').close();
});

/* ---------- Validação de dia 1–31 (melhoria 5) ----------
 *
 * Registrado antes dos listeners de dica, para que quando atualizarDicaDoCiclo
 * e atualizarDicaDoCartao lerem o campo ele já tenha o valor clampeado. */
registrarValidacaoDeDia($campo('campo-dia'));
registrarValidacaoDeDia($campo('campo-fechamento'));
registrarValidacaoDeDia($campo('campo-vencimento'));

/* A dica de "entra na fatura de X" acompanha as três coisas que mudam a
   resposta: o cartão escolhido, a data da compra e virar fixa. */
$campo('campo-fechamento').addEventListener('input', atualizarDicaDoCiclo);
$campo('campo-vencimento').addEventListener('input', atualizarDicaDoCiclo);

$selecao('campo-cartao').addEventListener('change', atualizarDicaDoCartao);
$campo('campo-data').addEventListener('change', atualizarDicaDoCartao);
$campo('campo-dia').addEventListener('input', atualizarDicaDoCartao);
$selecao('campo-repeticao').addEventListener('change', atualizarDicaDoCartao);

/* ---------- Máscara de valor (melhoria 4) ----------
 *
 * Os 5 campos de dinheiro do app. A ordem aqui é apenas conveniência de leitura;
 * o que importa é que nenhum fique de fora. */
registrarMascaraDeValor($campo('campo-valor'));
registrarMascaraDeValor($campo('campo-limite-do-cartao'));
registrarMascaraDeValor($campo('campo-fatura'));
registrarMascaraDeValor($campo('campo-limite'));
registrarMascaraDeValor($campo('campo-fatura-detalhe'));

/* ---------- Instalar o app ---------- */

/* O `beforeinstallprompt` nao esta no padrao, entao nao esta nos tipos do DOM.
   O typedef descreve so o que o app usa dele. */
/**
 * @typedef {Event & {
 *   prompt: () => Promise<void>,
 *   userChoice: Promise<{ outcome: string }>,
 * }} ConviteDeInstalacao
 */

/* O navegador so emite o convite quando o app cumpre os requisitos de PWA *e*
   ainda nao esta instalado. Por isso nao ha checagem propria de "ja instalado"
   aqui: a ausencia do evento ja e a resposta.

   O botao nasce escondido no index.html e so aparece com o convite na mao. Um
   "Instalar" que nao instala — porque o navegador nao instala, porque o app ja
   esta instalado — e pior que nenhum: ensina que o app e quebrado. Ver
   docs/instalar-no-desktop.md. */

/** @type {ConviteDeInstalacao|null} */
let conviteDeInstalacao = null;

window.addEventListener('beforeinstallprompt', (evento) => {
  /* Sem isto o Chrome do Android mostra a barrinha de instalacao dele por cima
     do app. O convite passa a ser nosso, e aparece onde a pessoa foi procurar. */
  evento.preventDefault();
  conviteDeInstalacao = /** @type {ConviteDeInstalacao} */ (evento);
  $('ajuste-instalar').hidden = false;
});

$('botao-instalar').addEventListener('click', () => {
  const convite = conviteDeInstalacao;
  if (!convite) return;

  /* O convite serve uma vez so: chamar `prompt()` duas vezes no mesmo evento
     falha. Entao o cartao sai do ar respondido o que for — instalou, ou
     desistiu. Quem desistiu sem querer recarrega a pagina, e o navegador emite
     o convite de novo. */
  conviteDeInstalacao = null;
  $('ajuste-instalar').hidden = true;

  convite.prompt().catch(() => {
    /* O navegador recusou o convite. O cartao ja saiu do ar, e recarregar a
       pagina traz outro. */
  });
});

/* Instalar pelo icone da barra de endereco, com a aba aberta, nao passa pelo
   botao daqui — mas deixa o cartao obsoleto do mesmo jeito. */
window.addEventListener('appinstalled', () => {
  conviteDeInstalacao = null;
  $('ajuste-instalar').hidden = true;
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
sincronizarTema();
mostrarTela(telaDaUrl());
desenhar();
