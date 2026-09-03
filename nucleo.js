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
export const VERSAO_DO_ESQUEMA = 2;

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

/* ---------- Estado ----------
 *
 * Um lançamento é AVULSO ou FIXO:
 *
 *   avulso  { id, tipo, descricao, valor, fixo: false, data: 'AAAA-MM-DD' }
 *   fixo    { id, tipo, descricao, valor, fixo: true, dia, inicio, fim, pulados }
 *
 * O fixo não é copiado mês a mês: ele é uma regra, e cada mês pergunta se está
 * dentro da janela. `fim` é inclusive, e `pulados` guarda os meses em que o
 * usuário apagou só aquela ocorrência.
 *
 * O que já aconteceu vive em `realizados`, num mapa com chave "id|AAAA-MM".
 * Isso é sutil e é certo: o mesmo aluguel fixo está pago em setembro e não em
 * outubro, e o lançamento é um só. */

export function estadoVazio() {
  return { versao: VERSAO_DO_ESQUEMA, lancamentos: [], realizados: {} };
}

const ehMes = (v) => /^\d{4}-\d{2}$/.test(v);
const ehData = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function limitarDia(dia) {
  return Math.min(31, Math.max(1, Math.trunc(Number(dia)) || 1));
}

/* Aceita qualquer coisa vinda do localStorage e devolve um estado utilizável.
 *
 * Dado corrompido, de outra versão ou simplesmente estranho não pode derrubar o
 * app: o usuário não tem como consertar, e perder a tela é pior que perder um
 * lançamento torto. Cada lançamento é validado por conta própria; o que não
 * passa é descartado, e o resto sobrevive.
 *
 * Migração da versão 1: lá não havia fixos nem realizados. Um estado v1 entra
 * aqui e sai v2 sem perder nada — todo lançamento antigo é avulso. */
export function normalizarEstado(bruto) {
  if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.lancamentos)) {
    return estadoVazio();
  }

  const lancamentos = [];

  for (const cru of bruto.lancamentos) {
    if (!cru || typeof cru !== 'object') continue;

    const base = {
      id: String(cru.id ?? ''),
      tipo: cru.tipo === 'entrada' ? 'entrada' : 'saida',
      descricao: String(cru.descricao ?? '').trim(),
      valor: Math.abs(Math.trunc(Number(cru.valor))) || 0,
    };

    if (!base.id || !base.descricao || base.valor <= 0) continue;

    if (cru.fixo) {
      if (!ehMes(cru.inicio)) continue;
      lancamentos.push({
        ...base,
        fixo: true,
        dia: limitarDia(cru.dia),
        inicio: cru.inicio,
        fim: ehMes(cru.fim) ? cru.fim : null,
        pulados: Array.isArray(cru.pulados) ? cru.pulados.filter(ehMes) : [],
      });
    } else {
      if (!ehData(cru.data)) continue;
      lancamentos.push({ ...base, fixo: false, data: cru.data });
    }
  }

  const realizados = {};
  const cruRealizados = bruto.realizados;
  if (cruRealizados && typeof cruRealizados === 'object') {
    const idsValidos = new Set(lancamentos.map((l) => l.id));
    for (const chave of Object.keys(cruRealizados)) {
      if (!cruRealizados[chave]) continue;
      const [id, mes] = chave.split('|');
      // Descarta a marcação órfã, do lançamento que não existe mais: é o que
      // impedia o mapa de encolher no MVP.
      if (idsValidos.has(id) && ehMes(mes)) realizados[chave] = true;
    }
  }

  return { versao: VERSAO_DO_ESQUEMA, lancamentos, realizados };
}

/* ---------- Realizado ---------- */

export function chaveDeRealizado(id, mes) {
  return id + '|' + mes;
}

export function estaRealizado(realizados, id, mes) {
  return Boolean(realizados[chaveDeRealizado(id, mes)]);
}

export function alternarRealizado(realizados, id, mes) {
  const chave = chaveDeRealizado(id, mes);
  const copia = { ...realizados };
  if (copia[chave]) delete copia[chave];
  else copia[chave] = true;
  return copia;
}

export function limparRealizadosDe(realizados, id, mes) {
  const copia = { ...realizados };
  if (mes) {
    delete copia[chaveDeRealizado(id, mes)];
    return copia;
  }
  for (const chave of Object.keys(copia)) {
    if (chave.startsWith(id + '|')) delete copia[chave];
  }
  return copia;
}

/* ---------- Seleção ---------- */

/* Um mês "vê" um fixo se está dentro da janela e não foi pulado. */
export function fixoApareceEm(lancamento, mes) {
  if (mes < lancamento.inicio) return false;
  if (lancamento.fim && mes > lancamento.fim) return false;
  return !lancamento.pulados.includes(mes);
}

/* Os lançamentos de um mês, do dia 1 para o 31, já com o dia resolvido.
 *
 * O dia do fixo é limitado ao tamanho do mês: sem isso o aluguel do dia 31
 * desaparece em fevereiro. */
export function lancamentosDoMes(lancamentos, mes) {
  return lancamentos
    .filter((l) => (l.fixo ? fixoApareceEm(l, mes) : mesDe(l.data) === mes))
    .map((l) => ({ ...l, dia: l.fixo ? Math.min(l.dia, diasNoMes(mes)) : diaDe(l.data) }))
    .sort(
      (a, b) =>
        a.dia - b.dia ||
        a.descricao.localeCompare(b.descricao, 'pt-BR') ||
        a.id.localeCompare(b.id)
    );
}

/* ---------- Resumo ---------- */

/* Tudo que o painel do topo precisa, numa passada só.
 *
 * "previsto" é o mês inteiro como planejado; "realizado" é o que já foi
 * marcado como recebido ou pago. A diferença entre os dois é o que torna isto
 * um planejador e não um diário. */
export function resumoDoMes(lancamentos, realizados, mes) {
  const doMes = lancamentosDoMes(lancamentos, mes);

  const entradas = { previsto: 0, realizado: 0, quantidade: 0 };
  const despesas = { previsto: 0, realizado: 0, quantidade: 0 };

  for (const l of doMes) {
    const lado = l.tipo === 'entrada' ? entradas : despesas;
    lado.previsto += l.valor;
    lado.quantidade += 1;
    if (estaRealizado(realizados, l.id, mes)) lado.realizado += l.valor;
  }

  return {
    entradas,
    despesas,
    sobra: entradas.previsto - despesas.previsto,
    naContaAgora: entradas.realizado - despesas.realizado,
    faltaEntrar: entradas.previsto - entradas.realizado,
    faltaSair: despesas.previsto - despesas.realizado,
    vazio: doMes.length === 0,
  };
}

/* Largura dos dois trechos de cada barra, em porcentagem.
 *
 * As duas barras dividem a mesma referência — o maior dos dois previstos — para
 * que "vai sair mais do que entra" seja visível de relance. Dentro de cada
 * barra, o trecho cheio é o que já aconteceu e o claro é o que ainda falta; os
 * dois somados dão o previsto do lado. */
export function proporcoesDasBarras(resumo) {
  const referencia = Math.max(resumo.entradas.previsto, resumo.despesas.previsto);

  const fatiar = (lado) =>
    referencia === 0
      ? { realizado: 0, previsto: 0 }
      : {
          realizado: (lado.realizado / referencia) * 100,
          previsto: (Math.max(lado.previsto - lado.realizado, 0) / referencia) * 100,
        };

  return { entradas: fatiar(resumo.entradas), despesas: fatiar(resumo.despesas) };
}

/* ---------- Alterações que envolvem recorrência ----------
 *
 * As três semânticas de excluir um fixo. São o problema mais difícil da
 * recorrência, e por isso vivem aqui, puras e testadas, em vez de espalhadas
 * pelos manipuladores de clique. */

export function excluirLancamento(lancamentos, id) {
  return lancamentos.filter((l) => l.id !== id);
}

/* "Excluir só neste mês": o fixo continua existindo, mas este mês passa a ser
   pulado. */
export function pularMes(lancamentos, id, mes) {
  return lancamentos.map((l) =>
    l.id === id && l.fixo && !l.pulados.includes(mes)
      ? { ...l, pulados: [...l.pulados, mes] }
      : l
  );
}

/* "Encerrar deste mês em diante": o fixo passa a valer até o mês anterior. */
export function encerrarFixo(lancamentos, id, mes) {
  const fim = deslocarMes(mes, -1);
  return lancamentos.map((l) => (l.id === id && l.fixo ? { ...l, fim } : l));
}
