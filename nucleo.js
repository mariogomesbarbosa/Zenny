/* Núcleo do Zenny: as contas, sem nenhum DOM.
 *
 * Este módulo não sabe que existe navegador. É de propósito: assim o teste
 * (tests/nucleo.mjs) importa as funções diretamente, em vez de extraí-las do
 * fonte por casamento de chaves — que é o que o Daysk precisou fazer por viver
 * num arquivo único, e que ele mesmo documenta como frágil.
 *
 * REGRA DO PROJETO: dinheiro é sempre inteiro em CENTAVOS. Nunca ponto
 * flutuante. Somar `6028.91` dezenas de vezes acumula erro de fração de centavo,
 * e erro de centavo destrói a confiança no app inteiro (ver CLAUDE.md). A
 * divisão por 100 acontece só na hora de formatar para a tela.
 */

export const CHAVE = 'zenny:v1';
export const VERSAO_DO_ESQUEMA = 1;

/* ---------- Dinheiro ---------- */

const FORMATO_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/* Interpreta o que a pessoa digitou no campo de valor e devolve centavos.
 *
 * O MVP resolvia isso com parseFloat e tinha um defeito silencioso:
 * "1.234" virava 1.234, ou seja R$ 1,23 para quem quis digitar mil duzentos e
 * trinta e quatro reais. A regra aqui é explícita:
 *
 * - Se há vírgula, ela é o separador decimal e os pontos são de milhar.
 * - Se não há vírgula e o último ponto tem exatamente três dígitos depois dele,
 *   esse ponto é separador de milhar — dinheiro em real não tem três casas
 *   decimais.
 * - Fora isso, o ponto é decimal.
 *
 * A terceira casa decimal em diante é descartada, não arredondada: quem digitou
 * "12,999" vê R$ 12,99, que é o que aparece na tela enquanto digita.
 */
export function analisarValor(texto) {
  const limpo = String(texto ?? '').replace(/[^\d.,]/g, '');
  if (!limpo) return 0;

  let normalizado;

  if (limpo.includes(',')) {
    const semMilhar = limpo.replace(/\./g, '');
    const corte = semMilhar.lastIndexOf(',');
    normalizado =
      semMilhar.slice(0, corte).replace(/,/g, '') + '.' + semMilhar.slice(corte + 1);
  } else {
    const partes = limpo.split('.');
    const ultima = partes[partes.length - 1];
    if (partes.length > 1 && ultima.length === 3) {
      normalizado = limpo.replace(/\./g, '');
    } else if (partes.length > 2) {
      normalizado = partes.slice(0, -1).join('') + '.' + ultima;
    } else {
      normalizado = limpo;
    }
  }

  const [inteira, decimal = ''] = normalizado.split('.');
  const reais = Number(inteira || '0');
  const centavos = Number((decimal + '00').slice(0, 2));

  if (!Number.isFinite(reais) || !Number.isFinite(centavos)) return 0;
  return reais * 100 + centavos;
}

export function formatarDinheiro(centavos) {
  return FORMATO_BRL.format((Number(centavos) || 0) / 100);
}

/* Para preencher o campo ao editar: 123456 -> "1234,56". Sem símbolo e sem
   separador de milhar, porque é texto para continuar editando, não para ler. */
export function valorParaCampo(centavos) {
  const n = Math.abs(Number(centavos) || 0);
  return String(Math.floor(n / 100)) + ',' + String(n % 100).padStart(2, '0');
}

/* ---------- Meses ---------- */

const NOMES_DOS_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/* Aceita 'AAAA-MM-DD' ou Date, e devolve 'AAAA-MM'. */
export function mesDe(data) {
  if (data instanceof Date) {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
  }
  return String(data).slice(0, 7);
}

export function deslocarMes(mes, passos) {
  const [ano, m] = mes.split('-').map(Number);
  // Date normaliza o estouro sozinho: mês 13 vira janeiro do ano seguinte.
  const d = new Date(ano, m - 1 + passos, 1);
  return mesDe(d);
}

export function diasNoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m, 0).getDate();
}

export function rotuloDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return NOMES_DOS_MESES[m - 1] + ' de ' + ano;
}

export function diaDe(data) {
  return Number(String(data).slice(8, 10));
}

/* ---------- Estado ---------- */

export function estadoVazio() {
  return { versao: VERSAO_DO_ESQUEMA, lancamentos: [] };
}

/* Aceita qualquer coisa vinda do localStorage e devolve um estado utilizável.
 *
 * Dado corrompido, de outra versão ou simplesmente estranho não pode derrubar o
 * app: o usuário não tem como consertar, e perder a tela é pior que perder um
 * lançamento torto. Cada lançamento é validado por conta própria; o que não
 * passa é descartado, e o resto sobrevive. */
export function normalizarEstado(bruto) {
  if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.lancamentos)) {
    return estadoVazio();
  }

  const lancamentos = bruto.lancamentos
    .filter((l) => l && typeof l === 'object')
    .map((l) => ({
      id: String(l.id ?? ''),
      tipo: l.tipo === 'entrada' ? 'entrada' : 'saida',
      descricao: String(l.descricao ?? '').trim(),
      valor: Math.abs(Math.trunc(Number(l.valor))) || 0,
      data: String(l.data ?? ''),
    }))
    .filter((l) => l.id && l.descricao && l.valor > 0 && /^\d{4}-\d{2}-\d{2}$/.test(l.data));

  return { versao: VERSAO_DO_ESQUEMA, lancamentos };
}

/* ---------- Seleção e resumo ---------- */

/* Os lançamentos de um mês, do dia 1 para o 31. Empate de dia desempata pela
   descrição, para que a ordem não dance a cada nova gravação. */
export function lancamentosDoMes(lancamentos, mes) {
  return lancamentos
    .filter((l) => mesDe(l.data) === mes)
    .sort(
      (a, b) =>
        diaDe(a.data) - diaDe(b.data) ||
        a.descricao.localeCompare(b.descricao, 'pt-BR') ||
        a.id.localeCompare(b.id)
    );
}

export function resumoDoMes(lancamentos, mes) {
  let entrou = 0;
  let saiu = 0;

  for (const l of lancamentosDoMes(lancamentos, mes)) {
    if (l.tipo === 'entrada') entrou += l.valor;
    else saiu += l.valor;
  }

  return { entrou, saiu, sobra: entrou - saiu };
}

/* Largura das barras do painel, em porcentagem. As duas dividem a mesma
   referência — o maior dos dois lados — para que "saiu mais do que entrou" seja
   visível de relance, sem precisar ler número. */
export function proporcoesDoResumo({ entrou, saiu }) {
  const referencia = Math.max(entrou, saiu);
  if (referencia === 0) return { entrou: 0, saiu: 0 };
  return {
    entrou: (entrou / referencia) * 100,
    saiu: (saiu / referencia) * 100,
  };
}
