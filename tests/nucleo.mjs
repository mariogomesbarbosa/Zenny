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
} from '../nucleo.js';

let passaram = 0;
const falhas = [];

function conferir(descricao, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) passaram++;
  else falhas.push(`${descricao}\n    esperado: ${b}\n    obtido:   ${a}`);
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
conferir('formata indefinido como zero', formatarDinheiro(undefined), `R$${NBSP}0,00`);

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

/* ---------- estado ---------- */

conferir('estado vazio', estadoVazio(), { versao: 2, lancamentos: [], realizados: {} });
conferir('nulo vira estado vazio', normalizarEstado(null), {
  versao: 2, lancamentos: [], realizados: {},
});
conferir('lixo vira estado vazio', normalizarEstado('xpto'), {
  versao: 2, lancamentos: [], realizados: {},
});

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
      null,
    ],
  }).lancamentos.map((l) => l.id),
  ['a']
);

/* Migração da v1: lá não existiam fixos nem realizados, e todo lançamento tinha
   data completa. Nada pode se perder na travessia. */
conferir(
  'estado da versão 1 atravessa inteiro',
  normalizarEstado({
    versao: 1,
    lancamentos: [{ id: 'a', tipo: 'entrada', descricao: 'Salário', valor: 350000, data: '2026-09-05' }],
  }),
  {
    versao: 2,
    lancamentos: [
      { id: 'a', tipo: 'entrada', descricao: 'Salário', valor: 350000, fixo: false, data: '2026-09-05' },
    ],
    realizados: {},
  }
);

conferir(
  'fixo é normalizado com os campos da recorrência',
  normalizarEstado({
    lancamentos: [
      { id: 'a', tipo: 'saida', descricao: 'Aluguel', valor: 180000, fixo: true, dia: 99, inicio: '2026-09' },
    ],
  }).lancamentos[0],
  {
    id: 'a', tipo: 'saida', descricao: 'Aluguel', valor: 180000,
    fixo: true, dia: 31, inicio: '2026-09', fim: null, pulados: [],
  }
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

const FIXO = { id: 'f', tipo: 'saida', descricao: 'Aluguel', valor: 50000, fixo: true, dia: 10, inicio: '2026-09', fim: null, pulados: [] };

conferir('aparece no mês de início', fixoApareceEm(FIXO, '2026-09'), true);
conferir('aparece adiante', fixoApareceEm(FIXO, '2027-03'), true);
conferir('não aparece antes do início', fixoApareceEm(FIXO, '2026-08'), false);
conferir('não aparece no mês pulado', fixoApareceEm({ ...FIXO, pulados: ['2026-10'] }, '2026-10'), false);
conferir('fim é inclusive', fixoApareceEm({ ...FIXO, fim: '2026-11' }, '2026-11'), true);
conferir('não aparece depois do fim', fixoApareceEm({ ...FIXO, fim: '2026-11' }, '2026-12'), false);

/* ---------- seleção ---------- */

const LANCAMENTOS = [
  { id: '1', tipo: 'entrada', descricao: 'Salário', valor: 602891, fixo: true, dia: 5, inicio: '2026-09', fim: null, pulados: [] },
  { id: '2', tipo: 'saida', descricao: 'Aluguel', valor: 180000, fixo: true, dia: 31, inicio: '2026-09', fim: null, pulados: [] },
  { id: '3', tipo: 'saida', descricao: 'Mercado', valor: 32450, fixo: false, data: '2026-09-03' },
];

conferir(
  'fixos e avulsos convivem, ordenados por dia',
  lancamentosDoMes(LANCAMENTOS, '2026-09').map((l) => [l.descricao, l.dia]),
  [['Mercado', 3], ['Salário', 5], ['Aluguel', 30]]
);

/* Setembro tem 30 dias: o fixo do dia 31 não pode sumir. */
conferir(
  'dia 31 encolhe para o tamanho do mês',
  lancamentosDoMes(LANCAMENTOS, '2026-09').find((l) => l.id === '2').dia,
  30
);
conferir(
  'e em fevereiro encolhe mais ainda',
  lancamentosDoMes(LANCAMENTOS, '2027-02').find((l) => l.id === '2').dia,
  28
);
conferir(
  'o avulso não se repete no mês seguinte',
  lancamentosDoMes(LANCAMENTOS, '2026-10').map((l) => l.descricao),
  ['Salário', 'Aluguel']
);
conferir('antes do início, mês vazio', lancamentosDoMes(LANCAMENTOS, '2026-08'), []);

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

const REALIZADOS = { '1|2026-09': true, '3|2026-09': true };
const resumo = resumoDoMes(LANCAMENTOS, REALIZADOS, '2026-09');

conferir('entradas previstas e realizadas', resumo.entradas, {
  previsto: 602891, realizado: 602891, quantidade: 1,
});
conferir('despesas previstas e realizadas', resumo.despesas, {
  previsto: 212450, realizado: 32450, quantidade: 2,
});
conferir('sobra prevista do mês', resumo.sobra, 390441);
conferir('na conta agora', resumo.naContaAgora, 570441);
conferir('falta entrar', resumo.faltaEntrar, 0);
conferir('falta sair', resumo.faltaSair, 180000);
conferir('mês com lançamentos não é vazio', resumo.vazio, false);

const semNada = resumoDoMes(LANCAMENTOS, {}, '2026-08');
conferir('mês vazio', [semNada.sobra, semNada.naContaAgora, semNada.vazio], [0, 0, true]);

const semMarcar = resumoDoMes(LANCAMENTOS, {}, '2026-09');
conferir(
  'sem nada marcado, na conta agora é zero e falta tudo',
  [semMarcar.naContaAgora, semMarcar.faltaEntrar, semMarcar.faltaSair],
  [0, 602891, 212450]
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
conferir('pular o mesmo mês duas vezes não duplica', pularMes(pulado, '2', '2026-10').find((l) => l.id === '2').pulados, ['2026-10']);

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

/* ---------- resultado ---------- */

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} de ${passaram + falhas.length} falharam:\n`);
  for (const f of falhas) console.error('  ' + f + '\n');
  process.exit(1);
}

console.log(`✓ ${passaram} testes passaram`);
