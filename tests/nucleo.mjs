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
  normalizarEstado,
  estadoVazio,
  lancamentosDoMes,
  resumoDoMes,
  proporcoesDoResumo,
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

/* ---------- estado ---------- */

conferir('estado vazio', estadoVazio(), { versao: 1, lancamentos: [] });
conferir('nulo vira estado vazio', normalizarEstado(null), { versao: 1, lancamentos: [] });
conferir('lixo vira estado vazio', normalizarEstado('xpto'), { versao: 1, lancamentos: [] });
conferir(
  'sem a lista vira estado vazio',
  normalizarEstado({ versao: 1 }),
  { versao: 1, lancamentos: [] }
);

conferir(
  'descarta o lançamento inválido e mantém o resto',
  normalizarEstado({
    versao: 1,
    lancamentos: [
      { id: 'a', tipo: 'entrada', descricao: 'Salário', valor: 500000, data: '2026-09-05' },
      { id: 'b', tipo: 'saida', descricao: '', valor: 100, data: '2026-09-05' },
      { id: 'c', tipo: 'saida', descricao: 'Sem data', valor: 100, data: 'ontem' },
      { id: '', tipo: 'saida', descricao: 'Sem id', valor: 100, data: '2026-09-05' },
      { id: 'e', tipo: 'saida', descricao: 'Valor zero', valor: 0, data: '2026-09-05' },
      null,
    ],
  }).lancamentos.map((l) => l.id),
  ['a']
);

conferir(
  'tipo desconhecido vira saída, e o valor perde o sinal',
  normalizarEstado({
    lancamentos: [{ id: 'a', tipo: 'xpto', descricao: 'x', valor: -250, data: '2026-09-01' }],
  }).lancamentos[0],
  { id: 'a', tipo: 'saida', descricao: 'x', valor: 250, data: '2026-09-01' }
);

/* ---------- seleção e resumo ---------- */

const LANCAMENTOS = [
  { id: '1', tipo: 'entrada', descricao: 'Salário', valor: 602891, data: '2026-09-05' },
  { id: '2', tipo: 'saida', descricao: 'Aluguel', valor: 180000, data: '2026-09-10' },
  { id: '3', tipo: 'saida', descricao: 'Mercado', valor: 32450, data: '2026-09-03' },
  { id: '4', tipo: 'saida', descricao: 'Academia', valor: 12000, data: '2026-10-02' },
];

conferir(
  'só o mês pedido, ordenado por dia',
  lancamentosDoMes(LANCAMENTOS, '2026-09').map((l) => l.descricao),
  ['Mercado', 'Salário', 'Aluguel']
);
conferir(
  'mês seguinte',
  lancamentosDoMes(LANCAMENTOS, '2026-10').map((l) => l.descricao),
  ['Academia']
);
conferir('mês sem nada', lancamentosDoMes(LANCAMENTOS, '2026-11'), []);

conferir(
  'empate de dia desempata pela descrição',
  lancamentosDoMes(
    [
      { id: 'x', tipo: 'saida', descricao: 'Zebra', valor: 100, data: '2026-09-07' },
      { id: 'y', tipo: 'saida', descricao: 'Abacaxi', valor: 100, data: '2026-09-07' },
    ],
    '2026-09'
  ).map((l) => l.descricao),
  ['Abacaxi', 'Zebra']
);

conferir('resumo do mês', resumoDoMes(LANCAMENTOS, '2026-09'), {
  entrou: 602891,
  saiu: 212450,
  sobra: 390441,
});
conferir('resumo de mês vazio', resumoDoMes(LANCAMENTOS, '2026-11'), {
  entrou: 0,
  saiu: 0,
  sobra: 0,
});
conferir('sobra negativa quando sai mais do que entra', resumoDoMes(LANCAMENTOS, '2026-10'), {
  entrou: 0,
  saiu: 12000,
  sobra: -12000,
});

conferir('barras na mesma escala', proporcoesDoResumo({ entrou: 1000, saiu: 500 }), {
  entrou: 100,
  saiu: 50,
});
conferir('a saída maior é que enche a barra', proporcoesDoResumo({ entrou: 500, saiu: 1000 }), {
  entrou: 50,
  saiu: 100,
});
conferir('mês vazio não divide por zero', proporcoesDoResumo({ entrou: 0, saiu: 0 }), {
  entrou: 0,
  saiu: 0,
});

/* ---------- resultado ---------- */

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} de ${passaram + falhas.length} falharam:\n`);
  for (const f of falhas) console.error('  ' + f + '\n');
  process.exit(1);
}

console.log(`✓ ${passaram} testes passaram`);
