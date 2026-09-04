/* Testes das funções puras do núcleo.
 *
 * Uso:  node tests/nucleo.mjs
 *
 * Sem framework e sem dependência, por decisão do projeto. O alvo é o que faz
 * conta com dinheiro e o que fatia o tempo — interface se verifica no navegador.
 */

import {
  analisarValor,
  formatarDinheiro,
  valorParaCampo,
  mesDe,
  deslocarMes,
  diasNoMes,
  rotuloDoMes,
  diaDe,
  limitarDia,
  valorVigenteEm,
  definirValorDesde,
  definirValorSempre,
  estadoVazio,
  normalizarEstado,
  chaveDeRealizado,
  estaRealizado,
  alternarRealizado,
  limparRealizadosDe,
  fixoApareceEm,
  lancamentosDoMes,
  resumoDoMes,
  proporcoesDasBarras,
  excluirLancamento,
  pularMes,
  encerrarFixo,
  CATEGORIAS_DE_FABRICA,
  sugerirCategoria,
  categoriasDisponiveis,
  categoriaPorId,
  idDeCategoriaPeloNome,
  criarCategoria,
  ocultarCategoria,
  gastosPorCategoria,
  definirLimite,
  situacaoDoLimite,
  montarBackup,
  nomeDoArquivo,
  resumirEstado,
  lerBackup,
  diasEntre,
  textoDoUltimoBackup,
} from '../nucleo.js';

/* Fuso fixo, e de proposito um em que a data local difere da UTC por boa parte
   do dia.
 *
 * Sem isto, os testes de data passariam na maquina do Mario (Brasilia) e
 * falhariam num runner em UTC — ou pior, o contrario: um bug de fuso passaria
 * despercebido porque local e UTC coincidem. Com America/Sao_Paulo fixado, uma
 * troca de getDate() por toISOString().slice(0, 10) falha em qualquer lugar. */
process.env.TZ = 'America/Sao_Paulo';

/**
 * @typedef {import('../nucleo.js').Lancamento} Lancamento
 * @typedef {import('../nucleo.js').LancamentoDoMes} LancamentoDoMes
 * @typedef {import('../nucleo.js').Fixo} Fixo
 * @typedef {import('../nucleo.js').Avulso} Avulso
 * @typedef {import('../nucleo.js').Estado} Estado
 * @typedef {import('../nucleo.js').Realizados} Realizados
 */

let passaram = 0;

/** @type {string[]} */
const falhas = [];

/**
 * @param {string} descricao
 * @param {unknown} obtido
 * @param {unknown} esperado
 */
function conferir(descricao, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) passaram++;
  else falhas.push(`${descricao}\n    esperado: ${b}\n    obtido:   ${a}`);
}

/**
 * Passa de propósito um valor que o tipo proíbe.
 *
 * Boa parte do núcleo existe para sobreviver a dado torto — é literalmente o
 * contrato de normalizarEstado, e o de analisarValor. Testar isso significa
 * violar a assinatura de propósito, e este nome deixa a intenção explícita em
 * vez de esconder um cast no meio da linha.
 *
 * @param {unknown} v
 * @returns {any}
 */
const lixo = (v) => v;

/**
 * Acha um lançamento pelo id, ou falha alto.
 *
 * `.find()` devolve `undefined` quando não acha, e um `.dia` em cima disso
 * estoura com "cannot read properties of undefined" — que não diz qual
 * lançamento faltou. Aqui o teste falha dizendo o id.
 *
 * @param {LancamentoDoMes[]} lista
 * @param {string} id
 * @returns {LancamentoDoMes}
 */
function achar(lista, id) {
  const encontrado = lista.find((l) => l.id === id);
  if (!encontrado) throw new Error(`nenhum lançamento com id ${id} neste mês`);
  return encontrado;
}

/**
 * O mesmo, para quando o teste sabe que aquele lançamento é fixo.
 *
 * @param {Lancamento[]} lista
 * @param {string} id
 * @returns {Fixo}
 */
function acharFixo(lista, id) {
  const encontrado = lista.find((l) => l.id === id);
  if (!encontrado || !encontrado.fixo) throw new Error(`nenhum fixo com id ${id}`);
  return encontrado;
}

/**
 * A fatia de uma categoria na quebra do mês, ou falha dizendo qual faltou.
 *
 * @param {ReturnType<typeof gastosPorCategoria>} quebra
 * @param {string|null} id
 * @returns {ReturnType<typeof gastosPorCategoria>[number]}
 */
function acharGasto(quebra, id) {
  const encontrado = quebra.find((g) => g.id === id);
  if (!encontrado) throw new Error(`a quebra do mês não tem a categoria ${id}`);
  return encontrado;
}

/**
 * Lê um backup exigindo que tenha dado certo.
 *
 * `lerBackup` devolve uma união discriminada — ou `{ok: false, erro}`, ou
 * `{ok: true, estado, ...}` — e sem checar `ok` não existe `.estado`. Isso é o
 * tipo cobrando o que já era verdade: um teste que lê `.estado` de um arquivo
 * recusado estaria testando `undefined`.
 *
 * @param {string} texto
 * @returns {Extract<ReturnType<typeof lerBackup>, { ok: true }>}
 */
function lerOk(texto) {
  const lido = lerBackup(texto);
  if (!lido.ok) throw new Error(`esperava um backup válido, veio erro "${lido.erro}"`);
  return lido;
}

/**
 * O outro lado da mesma união: devolve o motivo da recusa, ou `null` quando o
 * arquivo foi aceito.
 *
 * @param {string} texto
 * @returns {string|null}
 */
function erroDe(texto) {
  const lido = lerBackup(texto);
  return lido.ok ? null : lido.erro;
}

/* ---------- analisarValor: o campo de valor aceita o que a pessoa digitar ---------- */

conferir('inteiro simples', analisarValor('12'), 1200);
conferir('com vírgula', analisarValor('12,50'), 1250);
conferir('uma casa decimal', analisarValor('12,5'), 1250);
conferir('milhar com ponto e vírgula', analisarValor('1.234,56'), 123456);
conferir('milhão', analisarValor('1.234.567,89'), 123456789);
conferir('ponto como decimal', analisarValor('1234.56'), 123456);
conferir('com símbolo e espaço', analisarValor('R$ 8,90'), 890);
conferir('vazio', analisarValor(''), 0);
conferir('só texto', analisarValor('abc'), 0);
conferir('nulo', analisarValor(null), 0);
conferir('indefinido', analisarValor(undefined), 0);
conferir('negativo perde o sinal (o tipo é que decide)', analisarValor('-50'), 5000);
conferir('terceira casa é descartada, não arredondada', analisarValor('12,999'), 1299);
conferir('centavos sozinhos', analisarValor('0,07'), 7);

/* O defeito do MVP que não atravessa: parseFloat("1.234") devolvia 1.234, ou
   seja R$ 1,23 para quem quis digitar mil duzentos e trinta e quatro reais. */
conferir('milhar sem vírgula é milhar, não decimal', analisarValor('1.234'), 123400);
conferir('duas casas depois do ponto continuam decimais', analisarValor('1.23'), 123);
conferir('uma casa depois do ponto continua decimal', analisarValor('1.2'), 120);

/* ---------- formatação ---------- */

/* O separador entre "R$" e o número é espaço não separável (U+00A0), e não
   espaço comum. É o que o Intl produz, e é o certo: impede que o "R$" fique
   sozinho no fim de uma linha. Escrito com escape porque na tela os dois
   caracteres são indistinguíveis, e um teste que falha sem que se veja a
   diferença é pior que teste nenhum. */
const NBSP = '\u00A0';

conferir('formata milhar', formatarDinheiro(123456), `R$${NBSP}1.234,56`);
conferir('formata zero', formatarDinheiro(0), `R$${NBSP}0,00`);
conferir('formata centavos', formatarDinheiro(7), `R$${NBSP}0,07`);
conferir('formata negativo', formatarDinheiro(-500), `-R$${NBSP}5,00`);
conferir('formata indefinido como zero', formatarDinheiro(lixo(undefined)), `R$${NBSP}0,00`);

conferir('valor para o campo', valorParaCampo(123456), '1234,56');
conferir('valor para o campo, centavos', valorParaCampo(7), '0,07');
conferir('ida e volta pelo campo', analisarValor(valorParaCampo(602891)), 602891);

/* Soma de muitos valores continua exata — a razão de tudo ser centavo inteiro. */
const muitos = Array.from({ length: 1000 }, () => analisarValor('0,07'));
conferir('mil vezes sete centavos', muitos.reduce((s, v) => s + v, 0), 7000);

/* ---------- meses ---------- */

conferir('mês de uma data', mesDe('2026-09-03'), '2026-09');
conferir('mês de um Date', mesDe(new Date(2026, 0, 15)), '2026-01');
conferir('mês seguinte', deslocarMes('2026-09', 1), '2026-10');
conferir('vira o ano para a frente', deslocarMes('2026-12', 1), '2027-01');
conferir('vira o ano para trás', deslocarMes('2026-01', -1), '2025-12');
conferir('salta doze meses', deslocarMes('2026-09', 12), '2027-09');
conferir('dias de setembro', diasNoMes('2026-09'), 30);
conferir('dias de janeiro', diasNoMes('2026-01'), 31);
conferir('fevereiro comum', diasNoMes('2026-02'), 28);
conferir('fevereiro bissexto', diasNoMes('2028-02'), 29);
conferir('rótulo do mês', rotuloDoMes('2026-09'), 'setembro de 2026');
conferir('rótulo de março', rotuloDoMes('2026-03'), 'março de 2026');
conferir('dia da data', diaDe('2026-09-03'), 3);
conferir('dia 0 vira 1', limitarDia(0), 1);
conferir('dia 99 vira 31', limitarDia(99), 31);
conferir('dia inválido vira 1', limitarDia('abc'), 1);

/* ---------- a linha do tempo de valores ---------- */

const LINHA = [
  { desde: '2026-09', valor: 267526 },
  { desde: '2027-01', valor: 300000 },
  { desde: '2027-07', valor: 320000 },
];

conferir('no mês de início', valorVigenteEm(LINHA, '2026-09'), 267526);
conferir('entre dois trechos', valorVigenteEm(LINHA, '2026-11'), 267526);
conferir('no mês exato da virada', valorVigenteEm(LINHA, '2027-01'), 300000);
conferir('depois da virada', valorVigenteEm(LINHA, '2027-05'), 300000);
conferir('no último trecho', valorVigenteEm(LINHA, '2028-02'), 320000);
conferir('antes de tudo cai no primeiro, em vez de zero', valorVigenteEm(LINHA, '2026-01'), 267526);
conferir('linha vazia', valorVigenteEm([], '2026-09'), 0);
conferir('linha ausente', valorVigenteEm(lixo(undefined), '2026-09'), 0);

conferir(
  'definir a partir de um mês novo insere o trecho',
  definirValorDesde([{ desde: '2026-09', valor: 500 }], '2027-01', 650),
  [{ desde: '2026-09', valor: 500 }, { desde: '2027-01', valor: 650 }]
);
conferir(
  'definir no mesmo mês substitui o trecho, não duplica',
  definirValorDesde([{ desde: '2026-09', valor: 500 }], '2026-09', 650),
  [{ desde: '2026-09', valor: 650 }]
);
/* Descarta o que vem DEPOIS e preserva tudo que já passou: os trechos de
   setembro/2026 e de janeiro/2027 ficam, porque são passado em março/2027; só o
   de julho/2027 cai, porque "deste mês em diante" o contradiz. Apagar janeiro
   junto reescreveria a história, que é o defeito que este bloco existe para
   corrigir. */
conferir(
  'definir no meio preserva o passado e descarta só o futuro',
  definirValorDesde(LINHA, '2027-03', 999),
  [
    { desde: '2026-09', valor: 267526 },
    { desde: '2027-01', valor: 300000 },
    { desde: '2027-03', valor: 999 },
  ]
);
conferir(
  'corrigir para sempre achata a linha do tempo',
  definirValorSempre(999, '2026-09'),
  [{ desde: '2026-09', valor: 999 }]
);

/* ---------- estado ---------- */

const VAZIO = { versao: 4, lancamentos: [], realizados: {}, categorias: [], limites: {} };

conferir('estado vazio', estadoVazio(), VAZIO);
conferir('nulo vira estado vazio', normalizarEstado(null), VAZIO);
conferir('lixo vira estado vazio', normalizarEstado('xpto'), VAZIO);

conferir(
  'descarta o lançamento inválido e mantém o resto',
  normalizarEstado({
    lancamentos: [
      { id: 'a', tipo: 'entrada', descricao: 'Salário', valor: 500000, data: '2026-09-05' },
      { id: 'b', tipo: 'saida', descricao: '', valor: 100, data: '2026-09-05' },
      { id: 'c', tipo: 'saida', descricao: 'Sem data', valor: 100, data: 'ontem' },
      { id: '', tipo: 'saida', descricao: 'Sem id', valor: 100, data: '2026-09-05' },
      { id: 'e', tipo: 'saida', descricao: 'Valor zero', valor: 0, data: '2026-09-05' },
      { id: 'f', tipo: 'saida', descricao: 'Fixo sem início', valor: 100, fixo: true, dia: 5 },
      { id: 'g', tipo: 'saida', descricao: 'Fixo sem valor nenhum', fixo: true, dia: 5, inicio: '2026-09' },
      null,
    ],
  }).lancamentos.map((l) => l.id),
  ['a']
);

/* Migração da v1: lá não existiam fixos nem realizados. */
conferir(
  'estado da versão 1 atravessa inteiro',
  normalizarEstado({
    versao: 1,
    lancamentos: [{ id: 'a', tipo: 'entrada', descricao: 'Salário', valor: 350000, data: '2026-09-05' }],
  }),
  {
    versao: 4,
    lancamentos: [
      {
        id: 'a', tipo: 'entrada', descricao: 'Salário', categoria: 'salario',
        fixo: false, valor: 350000, data: '2026-09-05',
      },
    ],
    realizados: {},
    categorias: [],
    limites: {},
  }
);

/* Migração da v2: o fixo tinha um `valor` solto, que vira o primeiro trecho.
   Este é o teste que garante que ninguém perde dinheiro na travessia. */
conferir(
  'fixo da versão 2 vira linha do tempo de um trecho só',
  normalizarEstado({
    versao: 2,
    lancamentos: [
      { id: 'a', tipo: 'saida', descricao: 'Aluguel', valor: 180000, fixo: true, dia: 10, inicio: '2026-09', fim: null, pulados: [] },
    ],
  }).lancamentos[0],
  {
    id: 'a', tipo: 'saida', descricao: 'Aluguel', categoria: 'casa',
    fixo: true, dia: 10, inicio: '2026-09', fim: null, pulados: [],
    valores: [{ desde: '2026-09', valor: 180000 }],
  }
);

conferir(
  'e o valor de cada mês não muda na travessia da v2',
  lancamentosDoMes(
    normalizarEstado({
      versao: 2,
      lancamentos: [
        { id: 'a', tipo: 'saida', descricao: 'Aluguel', valor: 180000, fixo: true, dia: 10, inicio: '2026-09', fim: null, pulados: [] },
      ],
    }).lancamentos,
    '2027-05'
  )[0].valor,
  180000
);

conferir(
  'a linha do tempo é ordenada, sem repetidos, e cobre desde o início',
  acharFixo(
    normalizarEstado({
    lancamentos: [
      {
        id: 'a', tipo: 'saida', descricao: 'Aluguel', fixo: true, dia: 10, inicio: '2026-09',
        valores: [
          { desde: '2027-01', valor: 650 },
          { desde: '2026-11', valor: 500 },
          { desde: '2027-01', valor: 700 },
          { desde: 'torto', valor: 1 },
          { desde: '2027-05', valor: 0 },
        ],
      },
    ],
    }).lancamentos,
    'a'
  ).valores,
  [{ desde: '2026-09', valor: 500 }, { desde: '2027-01', valor: 700 }]
);

conferir(
  'marcação órfã é descartada, e a válida sobrevive',
  normalizarEstado({
    lancamentos: [{ id: 'a', tipo: 'saida', descricao: 'x', valor: 100, data: '2026-09-01' }],
    realizados: { 'a|2026-09': true, 'fantasma|2026-09': true, 'a|mes-torto': true, 'a|2026-10': false },
  }).realizados,
  { 'a|2026-09': true }
);

/* ---------- realizado ---------- */

conferir('chave de realizado', chaveDeRealizado('abc', '2026-09'), 'abc|2026-09');
conferir('não realizado por padrão', estaRealizado({}, 'a', '2026-09'), false);
conferir('alternar marca', alternarRealizado({}, 'a', '2026-09'), { 'a|2026-09': true });
conferir('alternar de novo desmarca', alternarRealizado({ 'a|2026-09': true }, 'a', '2026-09'), {});

/* O mesmo fixo pago em setembro e não em outubro: a razão de a chave ter mês. */
const marcado = alternarRealizado({}, 'aluguel', '2026-09');
conferir('marcado em setembro', estaRealizado(marcado, 'aluguel', '2026-09'), true);
conferir('e não em outubro', estaRealizado(marcado, 'aluguel', '2026-10'), false);

conferir(
  'limpar um mês só',
  limparRealizadosDe({ 'a|2026-09': true, 'a|2026-10': true }, 'a', '2026-09'),
  { 'a|2026-10': true }
);
conferir(
  'limpar todos os meses do lançamento',
  limparRealizadosDe({ 'a|2026-09': true, 'a|2026-10': true, 'b|2026-09': true }, 'a'),
  { 'b|2026-09': true }
);

/* ---------- janela do fixo ---------- */

/** @type {Fixo} */
const FIXO = {
  id: 'f', tipo: 'saida', descricao: 'Aluguel', fixo: true, dia: 10,
  inicio: '2026-09', fim: null, pulados: [], valores: [{ desde: '2026-09', valor: 50000 }],
};

conferir('aparece no mês de início', fixoApareceEm(FIXO, '2026-09'), true);
conferir('aparece adiante', fixoApareceEm(FIXO, '2027-03'), true);
conferir('não aparece antes do início', fixoApareceEm(FIXO, '2026-08'), false);
conferir('não aparece no mês pulado', fixoApareceEm({ ...FIXO, pulados: ['2026-10'] }, '2026-10'), false);
conferir('fim é inclusive', fixoApareceEm({ ...FIXO, fim: '2026-11' }, '2026-11'), true);
conferir('não aparece depois do fim', fixoApareceEm({ ...FIXO, fim: '2026-11' }, '2026-12'), false);

/* ---------- seleção ---------- */

/** @type {Fixo} */
const SALARIO = {
  id: '1', tipo: 'entrada', descricao: 'Salário', fixo: true, dia: 5,
  inicio: '2026-09', fim: null, pulados: [],
  valores: [{ desde: '2026-09', valor: 267526 }, { desde: '2027-01', valor: 300000 }],
};
/** @type {Fixo} */
const ALUGUEL = {
  id: '2', tipo: 'saida', descricao: 'Aluguel', fixo: true, dia: 31,
  inicio: '2026-09', fim: null, pulados: [],
  valores: [{ desde: '2026-09', valor: 180000 }],
};
/** @type {Avulso} */
const MERCADO = { id: '3', tipo: 'saida', descricao: 'Mercado', fixo: false, valor: 32450, data: '2026-09-03' };

/** @type {Lancamento[]} */
const LANCAMENTOS = [SALARIO, ALUGUEL, MERCADO];

conferir(
  'fixos e avulsos convivem, ordenados por dia',
  lancamentosDoMes(LANCAMENTOS, '2026-09').map((l) => [l.descricao, l.dia]),
  [['Mercado', 3], ['Salário', 5], ['Aluguel', 30]]
);

/* Setembro tem 30 dias: o fixo do dia 31 não pode sumir. */
conferir(
  'dia 31 encolhe para o tamanho do mês',
  achar(lancamentosDoMes(LANCAMENTOS, '2026-09'), '2').dia,
  30
);
conferir(
  'e em fevereiro encolhe mais ainda',
  achar(lancamentosDoMes(LANCAMENTOS, '2027-02'), '2').dia,
  28
);
conferir(
  'o avulso não se repete no mês seguinte',
  lancamentosDoMes(LANCAMENTOS, '2026-10').map((l) => l.descricao),
  ['Salário', 'Aluguel']
);
conferir('antes do início, mês vazio', lancamentosDoMes(LANCAMENTOS, '2026-08'), []);

/* O ponto do bloco: cada mês recebe o valor que valia NELE. */
conferir(
  'setembro usa o valor antigo do salário',
  achar(lancamentosDoMes(LANCAMENTOS, '2026-09'), '1').valor,
  267526
);
conferir(
  'dezembro ainda usa o valor antigo',
  achar(lancamentosDoMes(LANCAMENTOS, '2026-12'), '1').valor,
  267526
);
conferir(
  'janeiro já usa o valor novo',
  achar(lancamentosDoMes(LANCAMENTOS, '2027-01'), '1').valor,
  300000
);

conferir(
  'empate de dia desempata pela descrição',
  lancamentosDoMes(
    [
      { id: 'x', tipo: 'saida', descricao: 'Zebra', valor: 100, fixo: false, data: '2026-09-07' },
      { id: 'y', tipo: 'saida', descricao: 'Abacaxi', valor: 100, fixo: false, data: '2026-09-07' },
    ],
    '2026-09'
  ).map((l) => l.descricao),
  ['Abacaxi', 'Zebra']
);

/* ---------- resumo: previsto contra realizado ---------- */

/** @type {Realizados} */
const REALIZADOS = { '1|2026-09': true, '3|2026-09': true };
const resumo = resumoDoMes(LANCAMENTOS, REALIZADOS, '2026-09');

conferir('entradas previstas e realizadas', resumo.entradas, {
  previsto: 267526, realizado: 267526, quantidade: 1,
});
conferir('despesas previstas e realizadas', resumo.despesas, {
  previsto: 212450, realizado: 32450, quantidade: 2,
});
conferir('sobra prevista do mês', resumo.sobra, 55076);
conferir('na conta agora', resumo.naContaAgora, 235076);
conferir('falta entrar', resumo.faltaEntrar, 0);
conferir('falta sair', resumo.faltaSair, 180000);
conferir('mês com lançamentos não é vazio', resumo.vazio, false);

/* O resumo de janeiro reflete o aumento; o de setembro, não. */
conferir('resumo de janeiro usa o valor novo', resumoDoMes(LANCAMENTOS, {}, '2027-01').entradas.previsto, 300000);
conferir('resumo de setembro segue com o antigo', resumoDoMes(LANCAMENTOS, {}, '2026-09').entradas.previsto, 267526);

const semNada = resumoDoMes(LANCAMENTOS, {}, '2026-08');
conferir('mês vazio', [semNada.sobra, semNada.naContaAgora, semNada.vazio], [0, 0, true]);

/* A REGRESSÃO QUE ESTE BLOCO EXISTE PARA IMPEDIR: registrar um aumento não pode
   mexer em nenhum mês anterior — nem no valor, nem no que já foi marcado. */
const antesDoAumento = resumoDoMes(LANCAMENTOS, REALIZADOS, '2026-09');
/** @type {Lancamento[]} */
const comAumento = LANCAMENTOS.map((l) =>
  l.id === '1' && l.fixo ? { ...l, valores: definirValorDesde(l.valores, '2027-03', 400000) } : l
);
conferir(
  'o passado fica intacto depois de um aumento futuro',
  resumoDoMes(comAumento, REALIZADOS, '2026-09'),
  antesDoAumento
);
conferir(
  'e o mês do aumento reflete o valor novo',
  resumoDoMes(comAumento, {}, '2027-03').entradas.previsto,
  400000
);

/* Corrigir "para sempre" — o caso do erro de digitação — muda o passado de
   propósito, que é o contrário do aumento. */
/** @type {Lancamento[]} */
const corrigido = LANCAMENTOS.map((l) =>
  l.id === '2' && l.fixo ? { ...l, valores: definirValorSempre(50000, l.inicio) } : l
);
conferir(
  'corrigir para sempre alcança os meses antigos',
  achar(lancamentosDoMes(corrigido, '2026-09'), '2').valor,
  50000
);

/* ---------- barras ---------- */

conferir(
  'os dois trechos somam o previsto do lado, na escala do maior',
  proporcoesDasBarras({
    entradas: { previsto: 1000, realizado: 250 },
    despesas: { previsto: 500, realizado: 500 },
  }),
  {
    entradas: { realizado: 25, previsto: 75 },
    despesas: { realizado: 50, previsto: 0 },
  }
);
conferir(
  'a despesa maior é que enche a barra',
  proporcoesDasBarras({
    entradas: { previsto: 500, realizado: 0 },
    despesas: { previsto: 1000, realizado: 0 },
  }),
  {
    entradas: { realizado: 0, previsto: 50 },
    despesas: { realizado: 0, previsto: 100 },
  }
);
conferir(
  'mês vazio não divide por zero',
  proporcoesDasBarras({ entradas: { previsto: 0, realizado: 0 }, despesas: { previsto: 0, realizado: 0 } }),
  { entradas: { realizado: 0, previsto: 0 }, despesas: { realizado: 0, previsto: 0 } }
);

/* ---------- as categorias de fábrica ---------- */

conferir(
  'nove saídas de fábrica, na ordem do plano, com Outros por último',
  categoriasDisponiveis(estadoVazio(), 'saida').map((c) => c.nome),
  ['Mercado', 'Casa', 'Transporte', 'Comida fora', 'Assinatura', 'Saúde', 'Estudo', 'Lazer', 'Outros']
);
conferir(
  'duas entradas de fábrica',
  categoriasDisponiveis(estadoVazio(), 'entrada').map((c) => c.nome),
  ['Salário', 'Extra']
);
conferir(
  'nenhum id de fábrica repetido',
  new Set(CATEGORIAS_DE_FABRICA.map((c) => c.id)).size,
  CATEGORIAS_DE_FABRICA.length
);

/* ---------- sugerirCategoria: a categoria nasce da descrição ---------- */

conferir('mercado da semana', sugerirCategoria('mercado da semana', 'saida'), 'mercado');
conferir('uber pro trampo', sugerirCategoria('Uber pro trampo', 'saida'), 'transporte');
conferir('netflix', sugerirCategoria('Netflix', 'saida'), 'assinatura');
conferir('conta de luz', sugerirCategoria('Conta de luz', 'saida'), 'casa');
conferir('ifood', sugerirCategoria('iFood de novo', 'saida'), 'comida-fora');
conferir('curso', sugerirCategoria('Curso de inglês', 'saida'), 'estudo');
conferir('cinema', sugerirCategoria('Cinema com a Ana', 'saida'), 'lazer');
conferir('freela', sugerirCategoria('Freela do site', 'entrada'), 'extra');
conferir('chave de duas palavras', sugerirCategoria('Comida fora com a galera', 'saida'), 'comida-fora');

/* A descrição chega com acento e em caixa alta, e a tabela está sem acento e em
   minúsculas: estes casos são o que garante que a normalização acontece nos dois
   lados. Se alguém escrever 'açougue' na tabela, este teste cai. */
conferir('açougue', sugerirCategoria('Açougue do bairro', 'saida'), 'mercado');
conferir('açaí', sugerirCategoria('Açaí na volta', 'saida'), 'comida-fora');
conferir('FARMÁCIA em caixa alta', sugerirCategoria('FARMÁCIA', 'saida'), 'saude');
conferir('salário', sugerirCategoria('Salário', 'entrada'), 'salario');
conferir('comissão', sugerirCategoria('Comissão da venda', 'entrada'), 'extra');

/* O `tipo` filtra o lado: uma saída não pode nascer em Salário, e uma entrada
   não pode nascer em Mercado. */
conferir('salário como saída não casa', sugerirCategoria('Salário', 'saida'), null);
conferir('mercado como entrada não casa', sugerirCategoria('mercado da semana', 'entrada'), null);

/* Sem acerto o registro fica SEM categoria, e nunca em Outros: "sem categoria"
   é honesto sobre o que o app não sabe, e a etiqueta convida ao toque. */
conferir('descrição que não diz nada', sugerirCategoria('asdfgh', 'saida'), null);
conferir('vazio', sugerirCategoria('', 'saida'), null);
conferir('nulo', sugerirCategoria(null, 'saida'), null);
conferir('nem a palavra "outros" cai em Outros', sugerirCategoria('outros', 'saida'), null);

/* Palavra-chave é casada como PALAVRA, e não como pedaço de palavra: sem isso
   'casa' pegaria "casaco" e 'gas' pegaria "gasolina" — e casa é conferida antes
   de transporte, então a gasolina cairia na conta de luz. */
conferir('casaco não é Casa', sugerirCategoria('Casaco novo', 'saida'), null);
conferir('gasolina é Transporte, não Casa', sugerirCategoria('Gasolina', 'saida'), 'transporte');

/* ---------- as categorias do usuário ---------- */

const SO_PET = criarCategoria(estadoVazio(), 'pet', 'saida');
const COM_MINHAS = criarCategoria(SO_PET, 'Cabelo e unha', 'saida');

conferir('criar guarda a categoria com nome normalizado e id derivado', COM_MINHAS.categorias, [
  { id: 'pet', nome: 'Pet', tipo: 'saida', oculta: false },
  { id: 'cabelo-e-unha', nome: 'Cabelo e unha', tipo: 'saida', oculta: false },
]);

{
  const base = estadoVazio();
  criarCategoria(base, 'Pet', 'saida');
  conferir('criar não mexe no estado que recebeu', base.categorias.length, 0);
  conferir('criar devolve outro objeto', criarCategoria(base, 'Pet', 'saida') === base, false);
  conferir('nome vazio não cria nada', criarCategoria(base, '   ', 'saida') === base, true);
}

conferir('acento no nome não vai para o id', criarCategoria(estadoVazio(), 'Saúde da pet', 'saida').categorias[0].id, 'saude-da-pet');
conferir(
  'nome que sobra sem letra nenhuma ainda ganha um id',
  criarCategoria(estadoVazio(), '???', 'saida').categorias[0].id,
  'categoria'
);
conferir(
  'nome comprido é cortado, porque vira etiqueta em 360px',
  criarCategoria(estadoVazio(), 'Assinatura do streaming premium', 'saida').categorias[0].nome,
  'Assinatura do streaming'
);

/* Criar o que já é de fábrica não guarda uma cópia no aparelho: a cópia não
   migraria no dia em que a lista de fábrica mudar. */
conferir('criar "mercado" de novo não guarda nada', criarCategoria(estadoVazio(), 'mercado', 'saida').categorias, []);
conferir('nem cria duas vezes a mesma do usuário', criarCategoria(SO_PET, 'pet', 'saida').categorias.length, 1);

/* Mesmo nome no outro lado precisa de id próprio, senão categoriaPorId
   devolveria a categoria do lado errado. */
conferir(
  '"Mercado" como entrada ganha id próprio',
  criarCategoria(estadoVazio(), 'Mercado', 'entrada').categorias,
  [{ id: 'mercado-2', nome: 'Mercado', tipo: 'entrada', oculta: false }]
);

/* O contrato do id derivado: quem cria consegue apontar o registro para a
   categoria nova no mesmo gesto, sem comparar a lista antes e depois. */
{
  const base = estadoVazio();
  const criado = criarCategoria(base, 'Rolê', 'saida');
  conferir('o id derivado acha a categoria recém-criada', categoriaPorId(criado, idDeCategoriaPeloNome(base, 'Rolê', 'saida')), {
    id: 'role', nome: 'Rolê', tipo: 'saida',
  });
}

conferir('categoria de fábrica pelo id', categoriaPorId(estadoVazio(), 'mercado'), {
  id: 'mercado', nome: 'Mercado', tipo: 'saida',
});
conferir('categoria do usuário pelo id', categoriaPorId(COM_MINHAS, 'pet'), {
  id: 'pet', nome: 'Pet', tipo: 'saida',
});
conferir('id que não existe', categoriaPorId(COM_MINHAS, 'fantasma'), null);
conferir('sem id nenhum', categoriaPorId(COM_MINHAS, null), null);

conferir(
  'a do usuário entra na lista, depois das de fábrica e em ordem alfabética',
  categoriasDisponiveis(COM_MINHAS, 'saida').slice(9).map((c) => c.nome),
  ['Cabelo e unha', 'Pet']
);
conferir(
  'e não aparece no outro lado',
  categoriasDisponiveis(COM_MINHAS, 'entrada').map((c) => c.nome),
  ['Salário', 'Extra']
);

/* Decisão 4: esconder tira da lista de escolha e mantém o passado intacto. */
const COM_PET_OCULTA = ocultarCategoria(COM_MINHAS, 'pet');

conferir('ocultar marca a categoria', COM_PET_OCULTA.categorias[0].oculta, true);
conferir('ocultar não mexe no estado que recebeu', COM_MINHAS.categorias[0].oculta, false);
conferir(
  'a oculta sai da lista de escolha',
  categoriasDisponiveis(COM_PET_OCULTA, 'saida').slice(9).map((c) => c.nome),
  ['Cabelo e unha']
);
conferir('mas continua tendo nome, para a etiqueta do registro antigo', categoriaPorId(COM_PET_OCULTA, 'pet'), {
  id: 'pet', nome: 'Pet', tipo: 'saida',
});
conferir('ocultar uma de fábrica não faz nada', ocultarCategoria(COM_MINHAS, 'mercado').categorias, COM_MINHAS.categorias);
conferir(
  'e o limite dela fica de pé, porque os meses antigos continuam contando',
  ocultarCategoria({ ...COM_MINHAS, limites: { pet: 5000 } }, 'pet').limites,
  { pet: 5000 }
);

/* Recriar um nome escondido é pedir ele de volta, em vez de nascer um segundo
   "Pet" ao lado do primeiro dividindo o passado entre os dois. */
conferir('recriar o nome escondido o traz de volta', criarCategoria(COM_PET_OCULTA, 'Pet', 'saida').categorias[0], {
  id: 'pet', nome: 'Pet', tipo: 'saida', oculta: false,
});

/* ---------- gastosPorCategoria: para onde o dinheiro foi ---------- */

/** @type {Fixo} */
const ALUGUEL_B5 = {
  id: 'g7', tipo: 'saida', descricao: 'Aluguel', categoria: 'casa', fixo: true, dia: 10,
  inicio: '2026-09', fim: null, pulados: [],
  valores: [{ desde: '2026-09', valor: 100000 }, { desde: '2027-01', valor: 120000 }],
};

/** @type {Lancamento[]} */
const GASTOS = [
  { id: 'g1', tipo: 'saida', descricao: 'Mercado', categoria: 'mercado', fixo: false, valor: 20000, data: '2026-09-02' },
  { id: 'g2', tipo: 'saida', descricao: 'Feira', categoria: 'mercado', fixo: false, valor: 5000, data: '2026-09-09' },
  { id: 'g3', tipo: 'saida', descricao: 'Uber', categoria: 'transporte', fixo: false, valor: 3000, data: '2026-09-10' },
  { id: 'g4', tipo: 'saida', descricao: 'Zé Mercadinho', categoria: null, fixo: false, valor: 40000, data: '2026-09-11' },
  { id: 'g5', tipo: 'entrada', descricao: 'Salário', categoria: 'salario', fixo: false, valor: 300000, data: '2026-09-05' },
  { id: 'g6', tipo: 'saida', descricao: 'Cinema', categoria: 'lazer', fixo: false, valor: 6000, data: '2026-09-12' },
  ALUGUEL_B5,
];

/** @type {Realizados} */
const GASTOS_FEITOS = {
  'g1|2026-09': true, 'g2|2026-09': true, 'g3|2026-09': true, 'g4|2026-09': true,
  'g5|2026-09': true, 'g7|2026-09': true, 'g7|2027-01': true,
};

const quebra = gastosPorCategoria(GASTOS, GASTOS_FEITOS, '2026-09');

conferir(
  'a quebra vem do maior para o menor',
  quebra.map((g) => [g.id, g.total]),
  [['casa', 100000], [null, 40000], ['mercado', 25000], ['transporte', 3000]]
);
conferir('e conta quantos registros deram naquele total', acharGasto(quebra, 'mercado').quantidade, 2);
conferir('a barra do maior é cheia, e as outras são fração dele', quebra.map((g) => g.proporcao), [100, 40, 25, 3]);

/* A entrada realizada não entra: a pergunta é para onde o dinheiro FOI. */
conferir('entrada não aparece na quebra', quebra.some((g) => g.id === 'salario'), false);

/* Decisão 9: só o realizado conta. O cinema está previsto e não foi pago, então
   não existe nesta lista — e um limite que contasse o previsto mentiria sobre o
   presente. */
conferir('o previsto que não saiu fica fora', quebra.some((g) => g.id === 'lazer'), false);
conferir('sem nada marcado, a quebra é vazia', gastosPorCategoria(GASTOS, {}, '2026-09'), []);
conferir('mês sem registro nenhum', gastosPorCategoria(GASTOS, GASTOS_FEITOS, '2026-08'), []);

/* O fixo entra com o valor DAQUELE mês, e não com o último da linha do tempo:
   é a regra do B3 atravessando a quebra. */
conferir(
  'janeiro usa o aluguel de janeiro',
  gastosPorCategoria(GASTOS, GASTOS_FEITOS, '2027-01'),
  [{ id: 'casa', total: 120000, quantidade: 1, proporcao: 100 }]
);

/* Registro sem categoria aparece como fatia própria, com id nulo, e não somado
   em Outros: é o que deixa a tela convidar ao toque em cima do que o app não
   soube classificar. O campo ausente vale o mesmo que `null`. */
conferir(
  'registro sem o campo categoria cai em "sem categoria"',
  gastosPorCategoria(LANCAMENTOS, REALIZADOS, '2026-09'),
  [{ id: null, total: 32450, quantidade: 1, proporcao: 100 }]
);

/* Empate desempata pelo id, e "sem categoria" fica por último — a ordem precisa
   ser estável para a lista não trocar de posição entre dois desenhos iguais. */
conferir(
  'no empate, sem categoria vai por último',
  gastosPorCategoria(
    [
      { id: 'e1', tipo: 'saida', descricao: 'x', categoria: null, fixo: false, valor: 1000, data: '2026-09-01' },
      { id: 'e2', tipo: 'saida', descricao: 'y', categoria: 'mercado', fixo: false, valor: 1000, data: '2026-09-01' },
    ],
    { 'e1|2026-09': true, 'e2|2026-09': true },
    '2026-09'
  ).map((g) => g.id),
  ['mercado', null]
);

/* Centavo é inteiro, e a soma da quebra tem que ser exata como o resto. */
conferir(
  'soma de centavos na mesma categoria',
  gastosPorCategoria(
    [
      { id: 'c1', tipo: 'saida', descricao: 'a', categoria: 'mercado', fixo: false, valor: 7, data: '2026-09-01' },
      { id: 'c2', tipo: 'saida', descricao: 'b', categoria: 'mercado', fixo: false, valor: 7, data: '2026-09-02' },
      { id: 'c3', tipo: 'saida', descricao: 'c', categoria: 'mercado', fixo: false, valor: 7, data: '2026-09-03' },
    ],
    { 'c1|2026-09': true, 'c2|2026-09': true, 'c3|2026-09': true },
    '2026-09'
  )[0].total,
  21
);

/* ---------- limites ---------- */

conferir('definir um limite', definirLimite({}, 'mercado', 40000), { mercado: 40000 });
conferir('redefinir troca o valor', definirLimite({ mercado: 40000 }, 'mercado', 50000), { mercado: 50000 });
conferir('e não mexe nos outros', definirLimite({ mercado: 40000, casa: 90000 }, 'mercado', 0), { casa: 90000 });

/* Zero, vazio ou lixo REMOVE o limite. Guardar um limite de R$ 0,00 diria "você
   já estourou" para quem só quis apagar o limite. */
conferir('zero remove', definirLimite({ mercado: 40000 }, 'mercado', 0), {});
conferir('lixo remove', definirLimite({ mercado: 40000 }, 'mercado', lixo('abc')), {});
conferir('indefinido remove', definirLimite({ mercado: 40000 }, 'mercado', lixo(undefined)), {});
conferir('id vazio não cria chave', definirLimite({}, '', 40000), {});
/* Limite não tem lado, é sempre um teto: negativo não é "teto para o outro
   lado", é dado torto, e um teto de R$ 0,01 deixaria a pessoa estourada de
   saída. */
conferir('negativo também remove', definirLimite({ mercado: 40000 }, 'mercado', -40000), {});
conferir('menos de um centavo não é limite', definirLimite({}, 'mercado', 0.9), {});
conferir('fração de centavo não existe', definirLimite({}, 'mercado', 40000.9), { mercado: 40000 });

{
  const antes = { mercado: 40000 };
  definirLimite(antes, 'casa', 90000);
  conferir('definir não mexe no mapa que recebeu', antes, { mercado: 40000 });
}

conferir('abaixo do limite', situacaoDoLimite(38000, 40000), {
  usado: 38000, restante: 2000, proporcao: 95, estourou: false,
});
/* Gastar exatamente o limite não é estourar: usou o que tinha para usar. */
conferir('exatamente no limite', situacaoDoLimite(40000, 40000), {
  usado: 40000, restante: 0, proporcao: 100, estourou: false,
});
/* O restante negativo é o quanto passou. A tela informa, sem bronca. */
conferir('acima do limite', situacaoDoLimite(45000, 40000), {
  usado: 45000, restante: -5000, proporcao: 100, estourou: true,
});
/* A barra para em 100%: quem gastou o dobro não tem barra do dobro do tamanho
   da tela. */
conferir('a barra não passa de cheia', situacaoDoLimite(400000, 40000).proporcao, 100);
conferir('nada gasto ainda', situacaoDoLimite(0, 40000), {
  usado: 0, restante: 40000, proporcao: 0, estourou: false,
});
conferir('proporção com fração', situacaoDoLimite(500, 4000).proporcao, 12.5);
/* Sem limite não existe estouro: tratar a ausência como limite de zero faria
   toda categoria nascer estourada, que é o oposto de aliado. */
conferir('categoria sem limite', situacaoDoLimite(5000, 0), {
  usado: 5000, restante: 0, proporcao: 0, estourou: false,
});
conferir('gasto torto não vira dívida', situacaoDoLimite(lixo(-500), 40000).usado, 0);

/* ---------- a travessia da v3 ---------- */

/* Um lançamento da v3 é um Lancamento válido: `categoria` é opcional justamente
   porque o registro nasce sem ela. */
/** @type {Lancamento[]} */
const LANCAMENTOS_V3 = [
  {
    id: 'v1', tipo: 'entrada', descricao: 'Salário da firma', fixo: true, dia: 5,
    inicio: '2026-09', fim: null, pulados: [],
    valores: [{ desde: '2026-09', valor: 267526 }, { desde: '2027-01', valor: 300000 }],
  },
  {
    id: 'v2', tipo: 'saida', descricao: 'Aluguel', fixo: true, dia: 10,
    inicio: '2026-09', fim: null, pulados: [],
    valores: [{ desde: '2026-09', valor: 180000 }],
  },
  { id: 'v3', tipo: 'saida', descricao: 'Mercado da semana', fixo: false, valor: 32450, data: '2026-09-03' },
  { id: 'v4', tipo: 'saida', descricao: 'asdfgh', fixo: false, valor: 1000, data: '2026-09-04' },
];

/** @type {Realizados} */
const REALIZADOS_V3 = { 'v1|2026-09': true, 'v3|2026-09': true };

const MIGRADO = normalizarEstado({ versao: 3, lancamentos: LANCAMENTOS_V3, realizados: REALIZADOS_V3 });

conferir('a travessia da v3 sobe a versão', MIGRADO.versao, 4);
conferir('e não perde nenhum registro', MIGRADO.lancamentos.map((l) => l.id), ['v1', 'v2', 'v3', 'v4']);
conferir('e mantém as marcações de realizado', MIGRADO.realizados, REALIZADOS_V3);
conferir('e nasce sem categoria do usuário e sem limite', [MIGRADO.categorias, MIGRADO.limites], [[], {}]);

/* Decisão 8: a migração categoriza o passado pela descrição, para a tela nascer
   útil em vez de vazia pedindo trabalho. O que a sugestão não reconhece fica
   sem categoria, e não em Outros. */
conferir(
  'e categoriza o passado pela descrição',
  MIGRADO.lancamentos.map((l) => l.categoria),
  ['salario', 'casa', 'mercado', null]
);

/* A GARANTIA DA TRAVESSIA: acrescentar categoria não pode mover um centavo. Os
   dois meses conferidos são de trechos diferentes da linha do tempo do salário,
   para o B3 atravessar junto. */
conferir(
  'nenhum valor de setembro muda na travessia',
  resumoDoMes(MIGRADO.lancamentos, MIGRADO.realizados, '2026-09'),
  resumoDoMes(LANCAMENTOS_V3, REALIZADOS_V3, '2026-09')
);
conferir(
  'nem os de janeiro, do outro trecho da linha do tempo',
  resumoDoMes(MIGRADO.lancamentos, MIGRADO.realizados, '2027-01'),
  resumoDoMes(LANCAMENTOS_V3, REALIZADOS_V3, '2027-01')
);
conferir(
  'e o fixo continua com a linha do tempo inteira',
  acharFixo(MIGRADO.lancamentos, 'v1').valores,
  [{ desde: '2026-09', valor: 267526 }, { desde: '2027-01', valor: 300000 }]
);

/* Ler duas vezes tem que dar no mesmo: se a segunda leitura mudasse alguma
   coisa, o dado do aparelho ficaria se alterando a cada abertura do app. */
conferir('normalizar o que já foi normalizado não muda nada', normalizarEstado(MIGRADO), MIGRADO);

/* ---------- categoria como dado hostil ---------- */

/**
 * Normaliza um estado com um lançamento só, e devolve a categoria que sobrou
 * nele. É o formato de quase todo teste desta seção.
 *
 * @param {unknown} categoria
 * @param {{ tipo?: 'entrada'|'saida', categorias?: unknown }} [resto]
 * @returns {string|null|undefined}
 */
function categoriaQueSobrou(categoria, resto = {}) {
  const estado = normalizarEstado({
    lancamentos: [
      {
        id: 'a',
        tipo: resto.tipo || 'saida',
        descricao: 'Mercado da semana',
        categoria,
        fixo: false,
        valor: 100,
        data: '2026-09-01',
      },
    ],
    categorias: resto.categorias,
  });
  return estado.lancamentos[0].categoria;
}

conferir('categoria de fábrica válida sobrevive', categoriaQueSobrou('lazer'), 'lazer');
/* `null` explícito é respeitado: a pessoa tirou a etiqueta, e sugerir de novo a
   cada leitura desfaria isso em silêncio. É por isso que o gatilho da sugestão é
   a AUSÊNCIA do campo, e não o `versao` do arquivo. */
conferir('categoria nula continua nula, mesmo com descrição que casaria', categoriaQueSobrou(null), null);
/* Id que não existe mais vira nulo, como a marcação órfã de realizado. */
conferir('categoria que aponta para o nada vira nula', categoriaQueSobrou('fantasma'), null);
/* Uma saída apontando para Salário guardaria o registro numa fatia que a pessoa
   não pode nem escolher para corrigir. */
conferir('categoria do outro lado vira nula', categoriaQueSobrou('salario'), null);
conferir('e o mesmo do outro jeito', categoriaQueSobrou('mercado', { tipo: 'entrada' }), null);
conferir('categoria em número não passa', categoriaQueSobrou(42), null);
conferir(
  'categoria do usuário sobrevive',
  categoriaQueSobrou('pet', { categorias: [{ id: 'pet', nome: 'Pet', tipo: 'saida' }] }),
  'pet'
);
/* Decisão 4 de novo: a categoria escondida continua valendo no registro antigo. */
conferir(
  'categoria do usuário oculta continua valendo no registro',
  categoriaQueSobrou('pet', { categorias: [{ id: 'pet', nome: 'Pet', tipo: 'saida', oculta: true }] }),
  'pet'
);

conferir(
  'a lista de categorias descarta o que não presta e deixa o resto passar',
  normalizarEstado({
    lancamentos: [],
    categorias: [
      { id: 'pet', nome: '  pet  ', tipo: 'saida' },
      { id: 'mercado', nome: 'Mercado meu', tipo: 'saida' },
      { id: 'pet', nome: 'Pet de novo', tipo: 'saida' },
      { id: '', nome: 'Sem id', tipo: 'saida' },
      { id: 'sem-nome', nome: '   ', tipo: 'saida' },
      { id: 'bico', nome: 'Bico', tipo: 'torto', oculta: 'sim' },
      null,
      'texto',
    ],
  }).categorias,
  [
    { id: 'pet', nome: 'Pet', tipo: 'saida', oculta: false },
    { id: 'bico', nome: 'Bico', tipo: 'saida', oculta: true },
  ]
);
conferir('categorias que não é lista não derruba nada', normalizarEstado({ lancamentos: [], categorias: 'varias' }).categorias, []);

conferir(
  'o limite fica de pé para categoria que existe, e sai para o resto',
  normalizarEstado({
    lancamentos: [],
    categorias: [{ id: 'pet', nome: 'Pet', tipo: 'saida' }],
    limites: { mercado: 40000, pet: 5000, fantasma: 9000, casa: 0, transporte: -1, lazer: 'muito' },
  }).limites,
  { mercado: 40000, pet: 5000 }
);
conferir('limites que não é objeto não derruba nada', normalizarEstado({ lancamentos: [], limites: 7 }).limites, {});

/* ---------- as três semânticas de excluir um fixo ---------- */

conferir(
  'excluir de todos os meses tira o lançamento',
  excluirLancamento(LANCAMENTOS, '2').map((l) => l.id),
  ['1', '3']
);

const pulado = pularMes(LANCAMENTOS, '2', '2026-10');
conferir(
  'excluir só neste mês some com ele em outubro',
  lancamentosDoMes(pulado, '2026-10').map((l) => l.descricao),
  ['Salário']
);
conferir(
  'e o fixo continua em novembro',
  lancamentosDoMes(pulado, '2026-11').map((l) => l.descricao),
  ['Salário', 'Aluguel']
);
conferir(
  'pular o mesmo mês duas vezes não duplica',
  acharFixo(pularMes(pulado, '2', '2026-10'), '2').pulados,
  ['2026-10']
);

const encerrado = encerrarFixo(LANCAMENTOS, '2', '2026-11');
conferir('encerrar daqui deixa o mês anterior intacto', lancamentosDoMes(encerrado, '2026-10').map((l) => l.id), ['1', '2']);
conferir('e o mês do encerramento já não mostra', lancamentosDoMes(encerrado, '2026-11').map((l) => l.id), ['1']);

/* Encerrar no próprio mês de início equivale a apagar de todos os meses. */
const encerradoNoInicio = encerrarFixo(LANCAMENTOS, '2', '2026-09');
conferir(
  'encerrar no mês de início some com o fixo por completo',
  lancamentosDoMes(encerradoNoInicio, '2026-09').map((l) => l.id),
  ['3', '1']
);

/* ---------- Backup: o envelope ---------- */

const AGORA = new Date('2026-09-03T21:30:00-03:00');

{
  const estado = estadoVazio();
  const pacote = montarBackup(estado, AGORA);
  conferir('o envelope se identifica', pacote.app, 'zenny');
  conferir('o envelope carrega a versao do esquema', pacote.versao, 4);
  conferir('o envelope carrega o estado', pacote.estado, estado);
  conferir('exportadoEm e ISO', pacote.exportadoEm, AGORA.toISOString());
}

/* O nome usa a data LOCAL. Escrito com uma data cuja hora local no Brasil (21h)
   ja e o dia seguinte em UTC: se alguem trocar por toISOString().slice(0,10),
   este teste pega. */
conferir('nome do arquivo usa o dia local, nao o UTC', nomeDoArquivo(AGORA), 'zenny-2026-09-03.json');

/* ---------- resumirEstado ---------- */

/* As fixturas do backup trazem `categoria` explícita porque a ida e a volta pelo
   arquivo passa por normalizarEstado, que preenche o campo em todo registro: sem
   ela, o objeto que sai não seria igual ao que entrou. */

/** @type {Avulso} */
const AVULSO = {
  id: 'a1',
  tipo: 'saida',
  descricao: 'Mercado',
  categoria: 'mercado',
  fixo: false,
  valor: 12000,
  data: '2026-10-15',
};

/** @type {Fixo} */
const FIXO_ABERTO = {
  id: 'f1',
  tipo: 'entrada',
  descricao: 'Salario',
  categoria: 'salario',
  fixo: true,
  dia: 5,
  inicio: '2026-09',
  fim: null,
  pulados: [],
  valores: [{ desde: '2026-09', valor: 300000 }],
};

/** @type {Fixo} */
const FIXO_ENCERRADO = {
  id: 'f2',
  tipo: 'saida',
  descricao: 'Curso',
  categoria: 'estudo',
  fixo: true,
  dia: 10,
  inicio: '2026-11',
  fim: '2027-03',
  pulados: [],
  valores: [{ desde: '2026-11', valor: 25000 }],
};

conferir('resumo de estado vazio', resumirEstado(estadoVazio()), {
  total: 0,
  fixos: 0,
  avulsos: 0,
  primeiroMes: null,
  ultimoMes: null,
});

conferir(
  'resumo conta fixos e avulsos, e acha as pontas',
  resumirEstado({ lancamentos: [AVULSO, FIXO_ABERTO, FIXO_ENCERRADO], realizados: {} }),
  { total: 3, fixos: 2, avulsos: 1, primeiroMes: '2026-09', ultimoMes: '2027-03' }
);

/* Um fixo sem fim e aberto. Afirmar um ultimo mes que nao existe seria inventar
   dado na tela de confirmacao — justo a tela em que a pessoa decide se troca o
   que tem no aparelho por aquele arquivo. */
conferir(
  'fixo aberto nao estica o intervalo para o infinito',
  resumirEstado({ lancamentos: [FIXO_ABERTO], realizados: {} }),
  { total: 1, fixos: 1, avulsos: 0, primeiroMes: '2026-09', ultimoMes: '2026-09' }
);

/* ---------- lerBackup ---------- */

/** @type {Estado} */
const ESTADO_CHEIO = {
  versao: 4,
  lancamentos: [AVULSO, FIXO_ABERTO],
  realizados: { 'a1|2026-10': true },
  categorias: [],
  limites: {},
};

{
  const texto = JSON.stringify(montarBackup(ESTADO_CHEIO, AGORA));
  const lido = lerOk(texto);
  conferir('le o envelope', lido.ok, true);
  conferir('a ida e a volta preservam os lancamentos', lido.estado.lancamentos, ESTADO_CHEIO.lancamentos);
  conferir('a ida e a volta preservam os realizados', lido.estado.realizados, ESTADO_CHEIO.realizados);
  conferir('nada foi descartado', lido.descartados, 0);
  conferir('devolve quando o arquivo foi feito', lido.exportadoEm, AGORA.toISOString());
}

/* Ser liberal na leitura: quem editou o arquivo a mao e tirou o envelope nao
   pode ficar trancado para fora dos proprios dados. */
{
  const lido = lerOk(JSON.stringify(ESTADO_CHEIO));
  conferir('aceita o estado cru, sem envelope', lido.ok, true);
  conferir('estado cru traz os lancamentos', lido.estado.lancamentos.length, 2);
}

conferir('recusa texto que nao e JSON', erroDe('isto nao e json'), 'nao-e-json');
conferir('recusa JSON que nao e objeto', erroDe('42'), 'nao-e-json');
conferir('recusa JSON sem lancamentos', erroDe('{"algo":1}'), 'nao-e-zenny');
conferir('recusa lancamentos que nao e lista', erroDe('{"lancamentos":"varios"}'), 'nao-e-zenny');

/* Um app ainda vazio tem backup valido. Recusar seria dizer que o arquivo esta
   quebrado quando ele so esta vazio. */
{
  const lido = lerOk(JSON.stringify(montarBackup(estadoVazio(), AGORA)));
  conferir('backup de app vazio e valido', lido.ok, true);
  conferir('backup de app vazio nao descarta nada', lido.descartados, 0);
}

/* O ponto da decisao 10: o descarte deixa de ser silencioso. */
{
  const comLixo = {
    lancamentos: [
      AVULSO,
      { id: '', tipo: 'saida', descricao: 'sem id', fixo: false, valor: 100, data: '2026-10-01' },
      { id: 'x', tipo: 'saida', descricao: 'sem data', fixo: false, valor: 100 },
      { id: 'y', tipo: 'saida', descricao: 'fixo sem inicio', fixo: true, dia: 5, valor: 100 },
    ],
    realizados: {},
  };
  const lido = lerOk(JSON.stringify(comLixo));
  conferir('sobrevive ao lixo', lido.ok, true);
  conferir('mantem o que presta', lido.estado.lancamentos.length, 1);
  conferir('conta o que jogou fora', lido.descartados, 3);
}

/* Marcacao apontando para lancamento que nao existe e limpeza, nao perda: nao
   entra na conta de descartados, que fala de lancamentos. */
{
  const lido = lerOk(
    JSON.stringify({ lancamentos: [AVULSO], realizados: { 'a1|2026-10': true, 'sumiu|2026-10': true } })
  );
  conferir('marcacao orfa nao conta como descarte', lido.descartados, 0);
  conferir('marcacao orfa e limpa mesmo assim', lido.estado.realizados, { 'a1|2026-10': true });
}

/* ---------- diasEntre ---------- */

conferir('mesmo dia', diasEntre('2026-09-03T08:00:00', '2026-09-03T23:00:00'), 0);
conferir('um dia', diasEntre('2026-09-03T23:00:00', '2026-09-04T01:00:00'), 1);
conferir('quarenta e sete dias', diasEntre('2026-07-18T12:00:00', '2026-09-03T12:00:00'), 47);
conferir('atravessa o ano', diasEntre('2025-12-31T12:00:00', '2026-01-01T12:00:00'), 1);
conferir('ano bissexto', diasEntre('2028-02-28T12:00:00', '2028-03-01T12:00:00'), 2);
conferir('para tras da negativo', diasEntre('2026-09-04T12:00:00', '2026-09-03T12:00:00'), -1);
conferir('data invalida devolve nulo', diasEntre('nao e data', '2026-09-03'), null);

/* Duas horas distantes dentro do mesmo par de dias continuam sendo um dia so.
   E o caso que a divisao crua por 86.400.000 erraria: 2h ate 23h do dia
   seguinte da 1,875 dia, que truncado vira 1 e arredondado vira 2. */
conferir('a hora do dia nao muda a conta', diasEntre('2026-09-03T02:00:00', '2026-09-04T23:00:00'), 1);

/* ---------- textoDoUltimoBackup ---------- */

conferir(
  'sem copia nenhuma',
  textoDoUltimoBackup(null, AGORA),
  'Você ainda não guardou nenhuma cópia.'
);
conferir('hoje', textoDoUltimoBackup('2026-09-03T09:00:00-03:00', AGORA), 'Última cópia: hoje.');
conferir('ontem', textoDoUltimoBackup('2026-09-02T09:00:00-03:00', AGORA), 'Última cópia: ontem.');
conferir(
  'ha muitos dias',
  textoDoUltimoBackup('2026-07-18T09:00:00-03:00', AGORA),
  'Última cópia: há 47 dias.'
);

/* Relogio do aparelho mexido para tras nao pode dizer que a pessoa nunca
   guardou nada logo depois de ela ter guardado. */
conferir(
  'data no futuro vira hoje',
  textoDoUltimoBackup('2027-01-01T09:00:00-03:00', AGORA),
  'Última cópia: hoje.'
);
conferir(
  'data invalida nao quebra a frase',
  textoDoUltimoBackup('qualquer coisa', AGORA),
  'Você ainda não guardou nenhuma cópia.'
);

/* ---------- resultado ---------- */

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} de ${passaram + falhas.length} falharam:\n`);
  for (const f of falhas) console.error('  ' + f + '\n');
  process.exit(1);
}

console.log(`✓ ${passaram} testes passaram`);
