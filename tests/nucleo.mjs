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
conferir('linha ausente', valorVigenteEm(undefined, '2026-09'), 0);

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

conferir('estado vazio', estadoVazio(), { versao: 3, lancamentos: [], realizados: {} });
conferir('nulo vira estado vazio', normalizarEstado(null), {
  versao: 3, lancamentos: [], realizados: {},
});
conferir('lixo vira estado vazio', normalizarEstado('xpto'), {
  versao: 3, lancamentos: [], realizados: {},
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
    versao: 3,
    lancamentos: [
      { id: 'a', tipo: 'entrada', descricao: 'Salário', fixo: false, valor: 350000, data: '2026-09-05' },
    ],
    realizados: {},
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
    id: 'a', tipo: 'saida', descricao: 'Aluguel',
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
  }).lancamentos[0].valores,
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

const SALARIO = {
  id: '1', tipo: 'entrada', descricao: 'Salário', fixo: true, dia: 5,
  inicio: '2026-09', fim: null, pulados: [],
  valores: [{ desde: '2026-09', valor: 267526 }, { desde: '2027-01', valor: 300000 }],
};
const ALUGUEL = {
  id: '2', tipo: 'saida', descricao: 'Aluguel', fixo: true, dia: 31,
  inicio: '2026-09', fim: null, pulados: [],
  valores: [{ desde: '2026-09', valor: 180000 }],
};
const MERCADO = { id: '3', tipo: 'saida', descricao: 'Mercado', fixo: false, valor: 32450, data: '2026-09-03' };

const LANCAMENTOS = [SALARIO, ALUGUEL, MERCADO];

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

/* O ponto do bloco: cada mês recebe o valor que valia NELE. */
conferir(
  'setembro usa o valor antigo do salário',
  lancamentosDoMes(LANCAMENTOS, '2026-09').find((l) => l.id === '1').valor,
  267526
);
conferir(
  'dezembro ainda usa o valor antigo',
  lancamentosDoMes(LANCAMENTOS, '2026-12').find((l) => l.id === '1').valor,
  267526
);
conferir(
  'janeiro já usa o valor novo',
  lancamentosDoMes(LANCAMENTOS, '2027-01').find((l) => l.id === '1').valor,
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
const comAumento = LANCAMENTOS.map((l) =>
  l.id === '1' ? { ...l, valores: definirValorDesde(l.valores, '2027-03', 400000) } : l
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
const corrigido = LANCAMENTOS.map((l) =>
  l.id === '2' ? { ...l, valores: definirValorSempre(50000, l.inicio) } : l
);
conferir(
  'corrigir para sempre alcança os meses antigos',
  lancamentosDoMes(corrigido, '2026-09').find((l) => l.id === '2').valor,
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
  pularMes(pulado, '2', '2026-10').find((l) => l.id === '2').pulados,
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
  conferir('o envelope carrega a versao do esquema', pacote.versao, 3);
  conferir('o envelope carrega o estado', pacote.estado, estado);
  conferir('exportadoEm e ISO', pacote.exportadoEm, AGORA.toISOString());
}

/* O nome usa a data LOCAL. Escrito com uma data cuja hora local no Brasil (21h)
   ja e o dia seguinte em UTC: se alguem trocar por toISOString().slice(0,10),
   este teste pega. */
conferir('nome do arquivo usa o dia local, nao o UTC', nomeDoArquivo(AGORA), 'zenny-2026-09-03.json');

/* ---------- resumirEstado ---------- */

const AVULSO = {
  id: 'a1',
  tipo: 'saida',
  descricao: 'Mercado',
  fixo: false,
  valor: 12000,
  data: '2026-10-15',
};

const FIXO_ABERTO = {
  id: 'f1',
  tipo: 'entrada',
  descricao: 'Salario',
  fixo: true,
  dia: 5,
  inicio: '2026-09',
  fim: null,
  pulados: [],
  valores: [{ desde: '2026-09', valor: 300000 }],
};

const FIXO_ENCERRADO = {
  id: 'f2',
  tipo: 'saida',
  descricao: 'Curso',
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

const ESTADO_CHEIO = { versao: 3, lancamentos: [AVULSO, FIXO_ABERTO], realizados: { 'a1|2026-10': true } };

{
  const texto = JSON.stringify(montarBackup(ESTADO_CHEIO, AGORA));
  const lido = lerBackup(texto);
  conferir('le o envelope', lido.ok, true);
  conferir('a ida e a volta preservam os lancamentos', lido.estado.lancamentos, ESTADO_CHEIO.lancamentos);
  conferir('a ida e a volta preservam os realizados', lido.estado.realizados, ESTADO_CHEIO.realizados);
  conferir('nada foi descartado', lido.descartados, 0);
  conferir('devolve quando o arquivo foi feito', lido.exportadoEm, AGORA.toISOString());
}

/* Ser liberal na leitura: quem editou o arquivo a mao e tirou o envelope nao
   pode ficar trancado para fora dos proprios dados. */
{
  const lido = lerBackup(JSON.stringify(ESTADO_CHEIO));
  conferir('aceita o estado cru, sem envelope', lido.ok, true);
  conferir('estado cru traz os lancamentos', lido.estado.lancamentos.length, 2);
}

conferir('recusa texto que nao e JSON', lerBackup('isto nao e json').erro, 'nao-e-json');
conferir('recusa JSON que nao e objeto', lerBackup('42').erro, 'nao-e-json');
conferir('recusa JSON sem lancamentos', lerBackup('{"algo":1}').erro, 'nao-e-zenny');
conferir('recusa lancamentos que nao e lista', lerBackup('{"lancamentos":"varios"}').erro, 'nao-e-zenny');

/* Um app ainda vazio tem backup valido. Recusar seria dizer que o arquivo esta
   quebrado quando ele so esta vazio. */
{
  const lido = lerBackup(JSON.stringify(montarBackup(estadoVazio(), AGORA)));
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
  const lido = lerBackup(JSON.stringify(comLixo));
  conferir('sobrevive ao lixo', lido.ok, true);
  conferir('mantem o que presta', lido.estado.lancamentos.length, 1);
  conferir('conta o que jogou fora', lido.descartados, 3);
}

/* Marcacao apontando para lancamento que nao existe e limpeza, nao perda: nao
   entra na conta de descartados, que fala de lancamentos. */
{
  const lido = lerBackup(
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
