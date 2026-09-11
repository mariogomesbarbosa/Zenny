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

/* ---------- Os tipos do domínio ----------
 *
 * Escritos em JSDoc, e verificados por `npm run tipos` — o TypeScript aqui é um
 * conferidor, não um compilador. Nada é gerado, e o arquivo servido ao navegador
 * é este mesmo. O porquê está em docs/tipos-sem-build.md.
 *
 * `Avulso` e `Fixo` se distinguem por `fixo: false` e `fixo: true`. Isso não é
 * capricho de anotação: faz do par uma união discriminada, e dentro de um
 * `if (l.fixo)` o conferidor passa a saber que ali existe `valores` e não
 * existe `data`. É o que transforma a regra do B3 em algo que a ferramenta
 * cobra, em vez de algo que a gente lembra. */

/**
 * Um mês, sempre 'AAAA-MM'.
 * @typedef {string} Mes
 */

/**
 * Um dia, sempre 'AAAA-MM-DD'.
 * @typedef {string} Data
 */

/**
 * @typedef {'entrada'|'saida'} TipoDeLancamento
 */

/**
 * Um trecho da linha do tempo de valores de um fixo (B3).
 * @typedef {object} TrechoDeValor
 * @property {Mes} desde
 * @property {number} valor Em centavos, sempre inteiro.
 */

/* `categoria` é OPCIONAL no tipo, e isso é deliberado: o formulário monta o
 * registro com o que a pessoa digitou — o que é e quanto é — e a categoria é
 * derivada depois, pela descrição. Exigi-la na construção obrigaria toda tela a
 * ter uma resposta pronta, que é exatamente a fricção que o B5 recusa.
 *
 * `normalizarEstado` sempre preenche o campo, então o estado que vem do
 * localStorage tem `string` ou `null` em todo registro. Quem lê trata ausente e
 * `null` do mesmo jeito: "o app não sabe". */

/**
 * @typedef {object} Avulso
 * @property {string} id
 * @property {TipoDeLancamento} tipo
 * @property {string} descricao
 * @property {string|null} [categoria] Id de categoria, ou `null` para sem categoria.
 * @property {string|null} [cartao] Id do cartão em que foi pago, ou `null`.
 * @property {string} [criadoEm] Timestamp ISO de quando o lançamento foi anotado.
 * @property {false} fixo
 * @property {number} valor Em centavos.
 * @property {Data} data
 */

/**
 * @typedef {object} Fixo
 * @property {string} id
 * @property {TipoDeLancamento} tipo
 * @property {string} descricao
 * @property {string|null} [categoria] Id de categoria, ou `null` para sem categoria.
 * @property {string|null} [cartao] Id do cartão em que é pago, ou `null`.
 * @property {string} [criadoEm] Timestamp ISO de quando o lançamento foi anotado.
 * @property {true} fixo
 * @property {number} dia
 * @property {Mes} inicio
 * @property {Mes|null} fim Inclusive. `null` é um fixo sem fim.
 * @property {Mes[]} pulados Meses em que só esta ocorrência foi apagada.
 * @property {TrechoDeValor[]} valores Ordenada por `desde`.
 */

/**
 * @typedef {Avulso|Fixo} Lancamento
 */

/**
 * O que `lancamentosDoMes` devolve: o dia e o valor já resolvidos para aquele
 * mês. O fixo ganha `valor`; o avulso ganha `dia`.
 * @typedef {(Avulso & { dia: number }) | (Fixo & { valor: number })} LancamentoDoMes
 */

/**
 * Mapa de "já aconteceu", com chave "id|AAAA-MM".
 * @typedef {Record<string, true>} Realizados
 */

/**
 * Uma categoria como a tela precisa dela.
 * @typedef {object} Categoria
 * @property {string} id
 * @property {string} nome
 * @property {TipoDeLancamento} tipo
 */

/**
 * O que o estado guarda: só as categorias criadas pelo usuário, e cada uma sabe
 * se está escondida da lista de escolha.
 * @typedef {Categoria & { oculta: boolean }} CategoriaDoUsuario
 */

/**
 * Limite por categoria, em centavos. A ausência da chave é a ausência de limite
 * — não existe limite de R$ 0,00.
 * @typedef {Record<string, number>} Limites
 */

/**
 * Um cartão de crédito (B6).
 * @typedef {object} Cartao
 * @property {string} id
 * @property {string} nome
 * @property {number} limite Centavos. Zero é "não informou" — não existe cartão de limite zero.
 * @property {number} fechamento Dia do mês, 1–31. Depois dele a compra já é da fatura seguinte.
 * @property {number} vencimento Dia do mês, 1–31.
 * @property {boolean} arquivado
 */

/**
 * A fatura de um mês, sempre derivada — nunca gravada. Ver `faturaDoMes`.
 *
 * Ela tem de propósito os mesmos campos de um `LancamentoDoMes` (id, tipo,
 * descricao, categoria, dia, valor): assim a lista do mês desenha as duas
 * coisas com o mesmo código, e o resumo soma as duas no mesmo laço.
 * @typedef {object} Fatura
 * @property {string} id "fatura:<cartaoId>" — estável, para `realizados` marcar como paga.
 * @property {'saida'} tipo
 * @property {string} descricao
 * @property {null} categoria Cartão é forma de pagamento, não categoria.
 * @property {number} dia O vencimento, limitado aos dias que o mês tem.
 * @property {number} valor A soma dos lançamentos do ciclo — saídas menos entradas.
 * @property {true} ehFatura
 * @property {string} cartaoId
 * @property {string} cartao Nome do cartão, para a tela não ter que procurar.
 * @property {number} quantidade Quantos lançamentos ela soma.
 */

/**
 * O que a lista do mês mostra: lançamentos da conta e faturas, lado a lado.
 * @typedef {(LancamentoDoMes & { ehFatura?: false }) | Fatura} ItemDoMes
 */

/**
 * @typedef {object} Estado
 * @property {number} versao
 * @property {Lancamento[]} lancamentos
 * @property {Realizados} realizados
 * @property {CategoriaDoUsuario[]} categorias Só as criadas pelo usuário.
 * @property {Limites} limites
 * @property {Cartao[]} cartoes
 */

/**
 * Uma fatia da quebra do mês. `id` é `null` no registro que ficou sem categoria.
 * @typedef {object} GastoDeCategoria
 * @property {string|null} id
 * @property {number} previsto Centavos planejados/previstos no mês.
 * @property {number} realizado Centavos já pagos no mês.
 * @property {number} total Centavos planejados no mês (mantido para compatibilidade).
 * @property {number} quantidade
 * @property {{ realizado: number, previsto: number }} proporcao Largura dos trechos (% da maior categoria do mês).
 */

/**
 * @typedef {object} SituacaoDeLimite
 * @property {number} usado Centavos.
 * @property {number} restante Centavos. Negativo é o quanto passou.
 * @property {number} excedente Centavos. O quanto passou, já em positivo; zero quando não passou.
 * @property {number} proporcao Largura da barra, em %, no máximo 100.
 * @property {boolean} estourou
 */

/**
 * @typedef {object} LadoDoResumo
 * @property {number} previsto
 * @property {number} realizado
 * @property {number} quantidade
 */

/**
 * @typedef {object} Resumo
 * @property {LadoDoResumo} entradas
 * @property {LadoDoResumo} despesas
 * @property {number} sobra
 * @property {number} naContaAgora
 * @property {number} faltaEntrar
 * @property {number} faltaSair
 * @property {number} emCartao Quanto do previsto das despesas é fatura de cartão.
 * @property {boolean} vazio
 */

export const CHAVE = 'zenny:v1';
export const VERSAO_DO_ESQUEMA = 7;

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
/**
 * @param {unknown} texto
 * @returns {number} Centavos, sempre inteiro e sem sinal.
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

/**
 * @param {number} centavos
 * @returns {string}
 */
export function formatarDinheiro(centavos) {
  return FORMATO_BRL.format((Number(centavos) || 0) / 100);
}

/* Para preencher o campo ao editar: 123456 -> "1234,56". Sem símbolo e sem
   separador de milhar, porque é texto para continuar editando, não para ler. */
/**
 * @param {number} centavos
 * @returns {string}
 */
export function valorParaCampo(centavos) {
  const n = Math.abs(Number(centavos) || 0);
  return String(Math.floor(n / 100)) + ',' + String(n % 100).padStart(2, '0');
}

/**
 * Aplica máscara de moeda preenchendo da direita para a esquerda.
 * Ex: "1" -> "0,01", "12" -> "0,12", "1234" -> "12,34", "123456" -> "1.234,56".
 * Se não houver dígitos significativos, retorna string vazia.
 *
 * @param {unknown} texto
 * @returns {string}
 */
export function aplicarMascaraValor(texto) {
  const digitos = String(texto ?? '')
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .slice(0, 11);

  if (!digitos) return '';

  const comZeros = digitos.padStart(3, '0');
  const inteira = comZeros.slice(0, -2);
  const decimal = comZeros.slice(-2);

  const inteiraFormatada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiraFormatada},${decimal}`;
}

/* ---------- Meses ---------- */

const NOMES_DOS_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/* Aceita 'AAAA-MM-DD' ou Date, e devolve 'AAAA-MM'. */
/**
 * @param {Data|Date} data
 * @returns {Mes}
 */
export function mesDe(data) {
  if (data instanceof Date) {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
  }
  return String(data).slice(0, 7);
}

/**
 * @param {Mes} mes
 * @param {number} passos
 * @returns {Mes}
 */
export function deslocarMes(mes, passos) {
  const [ano, m] = mes.split('-').map(Number);
  // Date normaliza o estouro sozinho: mês 13 vira janeiro do ano seguinte.
  const d = new Date(ano, m - 1 + passos, 1);
  return mesDe(d);
}

/**
 * @param {Mes} mes
 * @returns {number}
 */
export function diasNoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m, 0).getDate();
}

/**
 * @param {Mes} mes
 * @returns {string}
 */
export function rotuloDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return NOMES_DOS_MESES[m - 1] + ' de ' + ano;
}

/**
 * @param {Data} data
 * @returns {number}
 */
export function diaDe(data) {
  return Number(String(data).slice(8, 10));
}

/* ---------- Estado ----------
 *
 * Um lançamento é AVULSO ou FIXO:
 *
 *   avulso  { id, tipo, descricao, valor, fixo: false, data: 'AAAA-MM-DD' }
 *   fixo    { id, tipo, descricao, fixo: true, dia, inicio, fim, pulados, valores }
 *
 * O fixo não é copiado mês a mês: ele é uma regra, e cada mês pergunta se está
 * dentro da janela. `fim` é inclusive, e `pulados` guarda os meses em que o
 * usuário apagou só aquela ocorrência.
 *
 * O fixo não tem UM valor: tem uma LINHA DO TEMPO de valores, em `valores`,
 * ordenada por `desde`. Cada mês usa o último trecho que já começou.
 *
 *   valores: [ { desde: '2026-09', valor: 267526 },
 *              { desde: '2027-01', valor: 300000 } ]
 *
 * Sem isso, aumentar o salário em janeiro reescrevia setembro a dezembro — os
 * meses já fechados, inclusive os já marcados como recebidos, passavam a mostrar
 * o valor novo. A história ficava errada em silêncio, porque nada na tela
 * indicava que aquele número tinha mudado depois do fato.
 *
 * O que já aconteceu vive em `realizados`, num mapa com chave "id|AAAA-MM".
 * Isso é sutil e é certo: o mesmo aluguel fixo está pago em setembro e não em
 * outubro, e o lançamento é um só.
 *
 * `categorias` guarda SÓ as criadas pelo usuário, e `limites` só os que ele
 * definiu. As categorias de fábrica são constante do código: ver a seção
 * Categorias. */

/**
 * @returns {Estado}
 */
export function estadoVazio() {
  return {
    versao: VERSAO_DO_ESQUEMA,
    lancamentos: [],
    realizados: {},
    categorias: [],
    limites: {},
    cartoes: [],
  };
}

/** @param {unknown} v @returns {v is Mes} */
const ehMes = (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);

/** @param {unknown} v @returns {v is Data} */
const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* Põe a linha do tempo de um fixo em ordem e garante que ela cubra o lançamento
 * inteiro.
 *
 * Também é aqui que mora a MIGRAÇÃO da versão 2: lá o fixo tinha um `valor`
 * solto, e ele vira o primeiro — e único — trecho, começando junto com o
 * lançamento. Nenhum dado se perde, e nenhum mês muda de valor na travessia.
 *
 * Três defesas, porque isto lê dado que já está no aparelho de alguém:
 * ordena por data (a ordem é premissa de valorVigenteEm), remove trechos
 * repetidos mantendo o último, e puxa o trecho mais antigo para o início do
 * lançamento — senão os meses entre o início e o primeiro trecho ficariam sem
 * valor nenhum. */
/**
 * @param {unknown} crus
 * @param {number} valorSolto
 * @param {Mes} inicio
 * @returns {TrechoDeValor[]}
 */
function normalizarValores(crus, valorSolto, inicio) {
  const trechos = (Array.isArray(crus) ? crus : [])
    .filter((t) => t && ehMes(t.desde))
    .map((t) => ({ desde: t.desde, valor: Math.abs(Math.trunc(Number(t.valor))) || 0 }))
    .filter((t) => t.valor > 0)
    .sort((a, b) => a.desde.localeCompare(b.desde));

  const semRepetidos = [];
  for (const trecho of trechos) {
    const anterior = semRepetidos[semRepetidos.length - 1];
    if (anterior && anterior.desde === trecho.desde) semRepetidos.pop();
    semRepetidos.push(trecho);
  }

  if (!semRepetidos.length) {
    return valorSolto > 0 ? [{ desde: inicio, valor: valorSolto }] : [];
  }

  if (semRepetidos[0].desde > inicio) semRepetidos[0] = { ...semRepetidos[0], desde: inicio };
  return semRepetidos;
}

/**
 * @param {unknown} dia
 * @returns {number}
 */
export function limitarDia(dia) {
  return Math.min(31, Math.max(1, Math.trunc(Number(dia)) || 1));
}

/* ---------- A linha do tempo de valores de um fixo ---------- */

/* O valor que vale num mês: o último trecho que já começou.
 *
 * Se o mês for anterior a todos os trechos, devolve o primeiro. Não deveria
 * acontecer — normalizarEstado garante que o trecho mais antigo comece junto com
 * o lançamento — mas um dado torto não pode fazer o app mostrar R$ 0,00 e deixar
 * o usuário achando que perdeu dinheiro. */
/**
 * @param {TrechoDeValor[]} valores
 * @param {Mes} mes
 * @returns {number} Centavos.
 */
export function valorVigenteEm(valores, mes) {
  if (!valores || !valores.length) return 0;

  let vigente = valores[0];
  for (const trecho of valores) {
    if (trecho.desde <= mes) vigente = trecho;
    else break;
  }
  return vigente.valor;
}

/* "Deste mês em diante vale X."
 *
 * Substitui o trecho que começa neste mês, se houver, e descarta os trechos
 * posteriores: "deste mês em diante" quer dizer isso mesmo, e um trecho futuro
 * sobrevivente contradiria o que a pessoa acabou de pedir. */
/**
 * @param {TrechoDeValor[]} valores
 * @param {Mes} mes
 * @param {number} valor
 * @returns {TrechoDeValor[]}
 */
export function definirValorDesde(valores, mes, valor) {
  const anteriores = valores.filter((t) => t.desde < mes);
  return [...anteriores, { desde: mes, valor }];
}

/* "Sempre foi X" — a correção de quem digitou errado. Achata a linha do tempo
   num trecho só, começando onde o lançamento começa.
 *
 * Recebe o `inicio` em vez de deduzir do primeiro trecho: a linha do tempo
 * inteira vai ser descartada mesmo, e deduzir de uma lista que pode estar vazia
 * produziria um trecho sem data — o tipo de dado torto que só aparece meses
 * depois. */
/**
 * @param {number} valor
 * @param {Mes} inicio
 * @returns {TrechoDeValor[]}
 */
export function definirValorSempre(valor, inicio) {
  return [{ desde: inicio, valor }];
}

/* ---------- Categorias ----------
 *
 * Categoria é o único item do roteiro que já foi recusado uma vez, e o motivo
 * governa esta seção inteira: uma taxonomia que a pessoa tem que aprender antes
 * de conseguir usar o app é a barreira que o Zenny existe para remover. Então a
 * categoria é SUGERIDA pela descrição e nunca perguntada, e o que a sugestão não
 * acerta se corrige com um toque na etiqueta.
 *
 * As de fábrica são constante do código e NÃO vão para o estado. Guardá-las
 * significaria versionar no aparelho de cada um uma lista que pode mudar no
 * próximo deploy — e aí renomear "Comida fora" viraria migração. O estado guarda
 * só o que é do usuário. Ver docs/b5-categorias-e-limites.md. */

/* A ordem desta lista é a ordem em que a tela oferece as categorias, e "Outros"
   é o último de propósito: ele é o balde, e balde não se oferece primeiro. */
/** @type {Categoria[]} */
export const CATEGORIAS_DE_FABRICA = [
  { id: 'mercado', nome: 'Mercado', tipo: 'saida' },
  { id: 'casa', nome: 'Casa', tipo: 'saida' },
  { id: 'transporte', nome: 'Transporte', tipo: 'saida' },
  { id: 'comida-fora', nome: 'Comida fora', tipo: 'saida' },
  { id: 'assinatura', nome: 'Assinatura', tipo: 'saida' },
  { id: 'saude', nome: 'Saúde', tipo: 'saida' },
  { id: 'estudo', nome: 'Estudo', tipo: 'saida' },
  { id: 'lazer', nome: 'Lazer', tipo: 'saida' },
  { id: 'outros', nome: 'Outros', tipo: 'saida' },
  { id: 'salario', nome: 'Salário', tipo: 'entrada' },
  { id: 'extra', nome: 'Extra', tipo: 'entrada' },
];

/* A tabela de palavras-chave, por id de categoria.
 *
 * Ela vai errar, e isso está previsto: o objetivo não é acertar sempre, é
 * acertar o suficiente para ninguém precisar categorizar à mão o que é óbvio.
 *
 * Escritas em minúsculas e sem acento porque é assim que a descrição chega para
 * a comparação — um teste guarda essa regra, o que é mais barato do que
 * normalizar a tabela inteira em cada chamada.
 *
 * 'outros' não tem palavra nenhuma, e é intencional: sem acerto o registro fica
 * SEM categoria. "Sem categoria" é honesto sobre o que o app não sabe e a
 * etiqueta convida ao toque; jogar em Outros seria fingir uma classificação. */
/** @type {Record<string, string[]>} */
const PALAVRAS_DA_CATEGORIA = {
  mercado: [
    'mercado', 'mercadinho', 'supermercado', 'mercearia', 'feira', 'hortifruti',
    'sacolao', 'acougue', 'padaria', 'quitanda', 'atacado', 'atacadao',
  ],
  casa: [
    'aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'botijao',
    'internet', 'wifi', 'iptu', 'faxina', 'diarista', 'limpeza',
  ],
  transporte: [
    'uber', '99', 'taxi', 'onibus', 'metro', 'trem', 'brt', 'bilhete',
    'passagem', 'gasolina', 'combustivel', 'etanol', 'alcool', 'pedagio',
    'estacionamento', 'oficina', 'mecanico', 'ipva',
  ],
  'comida-fora': [
    'comida fora', 'ifood', 'rappi', 'lanche', 'lanchonete', 'hamburguer',
    'burger', 'pizza', 'pizzaria', 'restaurante', 'marmita', 'delivery', 'cafe',
    'cafeteria', 'sorvete', 'acai', 'doceria', 'bar', 'cerveja', 'almoco',
    'janta',
  ],
  assinatura: [
    'assinatura', 'streaming', 'netflix', 'spotify', 'disney', 'hbo',
    'globoplay', 'youtube', 'deezer', 'prime', 'icloud',
  ],
  saude: [
    'saude', 'farmacia', 'drogaria', 'remedio', 'medicamento', 'medico',
    'dentista', 'consulta', 'exame', 'laboratorio', 'terapia', 'psicologo',
    'vacina', 'oculos', 'academia',
  ],
  estudo: [
    'curso', 'cursinho', 'faculdade', 'universidade', 'escola', 'mensalidade',
    'matricula', 'apostila', 'livro', 'caderno', 'material', 'ingles', 'aula',
  ],
  lazer: [
    'cinema', 'show', 'teatro', 'ingresso', 'festa', 'balada', 'jogo', 'jogos',
    'game', 'games', 'viagem', 'passeio', 'praia', 'parque', 'hotel', 'airbnb',
  ],
  outros: [],
  salario: [
    'salario', 'pagamento', 'holerite', 'contracheque', 'adiantamento',
    'decimo', 'ferias',
  ],
  extra: [
    'extra', 'freela', 'freelance', 'bico', 'reembolso', 'estorno', 'cashback',
    'presente', 'venda', 'vendi', 'bonus', 'premio', 'gorjeta', 'comissao',
    'renda',
  ],
};

/* Minúsculas e sem acento: "Café" e "cafe" são a mesma palavra para quem digita
   com pressa no celular. */
/**
 * @param {unknown} texto
 * @returns {string}
 */
function semAcento(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/* A sugestão, que é o coração do bloco.
 *
 * A descrição vira uma frase de palavras separadas por um espaço só, com espaço
 * nas duas pontas, e cada palavra-chave é procurada CERCADA de espaço. Assim
 * "uber pro trampo" acha 'uber' e "casaco novo" NÃO cai em Casa.
 *
 * Duas alternativas foram recusadas: procurar a chave como substring solta
 * pegaria 'casa' em "casaco" e 'gas' em "gasolina"; casar palavra por palavra
 * num Set seria mais rápido, mas impediria chave de duas palavras, como
 * 'comida fora'.
 *
 * O `tipo` filtra o lado: uma saída não pode nascer em Salário. */
/**
 * @param {unknown} descricao
 * @param {TipoDeLancamento} tipo
 * @returns {string|null} O id da categoria, ou `null` quando nada casa.
 */
export function sugerirCategoria(descricao, tipo) {
  const frase = ' ' + semAcento(descricao).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const lado = tipo === 'entrada' ? 'entrada' : 'saida';

  for (const categoria of CATEGORIAS_DE_FABRICA) {
    if (categoria.tipo !== lado) continue;
    for (const palavra of PALAVRAS_DA_CATEGORIA[categoria.id] || []) {
      if (frase.includes(' ' + palavra + ' ')) return categoria.id;
    }
  }
  return null;
}

/* Quantos caracteres cabem no nome de uma categoria.
 *
 * Não é estética: o nome vira etiqueta dentro do registro em 360px, e um nome
 * colado de outro lugar empurraria o layout para fora da tela. Cortar aqui é
 * mais honesto que cortar com reticências na hora de desenhar, porque o que a
 * pessoa vê na lista passa a ser o que ficou guardado. */
const LIMITE_DO_NOME = 24;

/* Espaços colapsados, pontas limpas e primeira letra maiúscula — para a lista do
   usuário não parecer de segunda classe ao lado das de fábrica. */
/**
 * @param {unknown} nome
 * @returns {string}
 */
function normalizarNome(nome) {
  const limpo = String(nome ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITE_DO_NOME)
    .trim();
  return limpo ? limpo[0].toUpperCase() + limpo.slice(1) : '';
}

/** @param {unknown} nome @returns {string} */
function normalizarNomeDoCartao(nome) {
  return String(nome ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITE_DO_NOME_DO_CARTAO)
    .trim();
}

/* Limite negativo ou lixo vira zero, e zero significa "não informou" — a tela
   esconde a barra em vez de desenhar uma comparação contra nada. */
/** @param {unknown} limite @returns {number} */
function normalizarLimiteDoCartao(limite) {
  const bruto = Math.trunc(Number(limite));
  return Number.isFinite(bruto) && bruto > 0 ? bruto : 0;
}

/* Fábrica + as do usuário, sem as ocultas.
 *
 * As de fábrica vêm primeiro, na ordem da constante; as do usuário vêm depois,
 * em ordem alfabética. Ordem de criação foi recusada: a lista é de escolha, e
 * uma lista de escolha que muda de ordem conforme o histórico obriga a pessoa a
 * procurar de novo o que ela já sabia onde estava. */
/**
 * @param {Estado} estado
 * @param {TipoDeLancamento} tipo
 * @returns {Categoria[]}
 */
export function categoriasDisponiveis(estado, tipo) {
  const doUsuario = estado.categorias
    .filter((c) => c.tipo === tipo && !c.oculta)
    .map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  /* Devolve cópias das de fábrica, e não as próprias: a constante é global ao
     módulo, e um `.nome = ...` de quem desenha a lista contaminaria o app todo
     até recarregar. */
  const daFabrica = CATEGORIAS_DE_FABRICA.filter((c) => c.tipo === tipo).map((c) => ({ ...c }));

  return [...daFabrica, ...doUsuario];
}

/* Acha inclusive a categoria OCULTA, de propósito: o registro antigo continua
   apontando para ela, e a etiqueta precisa do nome. Esconder tira da lista de
   escolha, não do passado (decisão 4). */
/**
 * @param {Estado} estado
 * @param {string|null|undefined} id
 * @returns {Categoria|null}
 */
export function categoriaPorId(estado, id) {
  if (!id) return null;

  const achada = [...CATEGORIAS_DE_FABRICA, ...estado.categorias].find((c) => c.id === id);
  return achada ? { id: achada.id, nome: achada.nome, tipo: achada.tipo } : null;
}

/* O id que `criarCategoria` vai derivar deste nome.
 *
 * Existe exportado porque quem cria uma categoria precisa, no mesmo gesto,
 * apontar o registro para ela — e descobrir o id comparando a lista antes e
 * depois seria frágil. O contrato é: depois de `criarCategoria(estado, nome,
 * tipo)`, este id acha a categoria em `categoriaPorId`.
 *
 * O id vem do nome, e não de um contador ou do relógio, porque assim ele é
 * estável e legível no arquivo de backup: "cabelo-e-unha", não "k3f9x".
 *
 * Quando o id derivado já existe com OUTRO tipo — "Extra" como saída, quando já
 * existe a entrada de fábrica — ele ganha sufixo, senão `categoriaPorId`
 * devolveria a categoria do lado errado. Quando já existe com o MESMO tipo, o id
 * é o mesmo de propósito: pedir "Mercado" de novo não inventa um segundo
 * Mercado. */
/**
 * @param {Estado} estado
 * @param {string} nome
 * @param {TipoDeLancamento} tipo
 * @returns {string}
 */
export function idDeCategoriaPeloNome(estado, nome, tipo) {
  /* Nome que sobra vazio depois de tirar acento e pontuação ainda precisa de um
     id: sem esta base, um nome só de emoji geraria id ''. */
  const base =
    semAcento(normalizarNome(nome))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria';

  /** @type {Map<string, TipoDeLancamento>} */
  const tipoPorId = new Map();
  for (const c of [...CATEGORIAS_DE_FABRICA, ...estado.categorias]) tipoPorId.set(c.id, c.tipo);

  let id = base;
  let n = 1;
  while (tipoPorId.has(id) && tipoPorId.get(id) !== tipo) {
    n += 1;
    id = base + '-' + n;
  }
  return id;
}

/**
 * @param {Estado} estado
 * @param {string} nome
 * @param {TipoDeLancamento} tipo
 * @returns {Estado}
 */
export function criarCategoria(estado, nome, tipo) {
  const limpo = normalizarNome(nome);
  if (!limpo) return estado;

  const id = idDeCategoriaPeloNome(estado, limpo, tipo);

  // Já é de fábrica: nada a guardar, e guardar seria sombrear a de fábrica com
  // uma cópia que não migra quando a lista de fábrica mudar.
  if (CATEGORIAS_DE_FABRICA.some((c) => c.id === id)) return estado;

  if (estado.categorias.some((c) => c.id === id)) {
    /* Recriar um nome que se escondeu é pedir ele de volta. Um segundo "Padaria"
       ao lado do primeiro seria pior: a lista mostraria dois nomes iguais e o
       passado ficaria dividido entre os dois. */
    return {
      ...estado,
      categorias: estado.categorias.map((c) =>
        c.id === id ? { ...c, nome: limpo, oculta: false } : c
      ),
    };
  }

  return {
    ...estado,
    categorias: [...estado.categorias, { id, nome: limpo, tipo, oculta: false }],
  };
}

/* Esconde, não apaga (decisão 4).
 *
 * Apagar exigiria decidir o que fazer com os registros que apontam para ela, e
 * qualquer resposta — virar sem categoria, virar Outros, apagar junto —
 * reescreveria história que ninguém pediu para reescrever. É a mesma lógica do
 * `fim` do fixo no B2: o passado não se mexe.
 *
 * O limite dela sobrevive: a categoria oculta continua aparecendo na quebra dos
 * meses antigos, onde o limite ainda quer dizer algo.
 *
 * Categoria de fábrica não se oculta, e a chamada simplesmente não faz nada: ela
 * não está no estado, e guardar essa exceção obrigaria a versionar a lista de
 * fábrica no aparelho — exatamente o que o modelo recusou. */
/**
 * @param {Estado} estado
 * @param {string} id
 * @returns {Estado}
 */
export function ocultarCategoria(estado, id) {
  return {
    ...estado,
    categorias: estado.categorias.map((c) => (c.id === id ? { ...c, oculta: true } : c)),
  };
}

/* Aceita qualquer coisa vinda do localStorage e devolve um estado utilizável.
 *
 * Dado corrompido, de outra versão ou simplesmente estranho não pode derrubar o
 * app: o usuário não tem como consertar, e perder a tela é pior que perder um
 * lançamento torto. Cada lançamento é validado por conta própria; o que não
 * passa é descartado, e o resto sobrevive.
 *
 * Migração da versão 1: lá não havia fixos nem realizados. Um estado v1 entra
 * aqui e sai v2 sem perder nada — todo lançamento antigo é avulso.
 *
 * Migração da versão 3: lá nenhum registro tinha categoria, e aqui cada um
 * recebe a sugestão pela própria descrição (decisão 8 do B5). Isso faz a tela de
 * "para onde foi" nascer útil no primeiro uso, em vez de vazia pedindo trabalho.
 * Não perde dado — só acrescenta —, e cada acerto ou erro se corrige com um
 * toque. */
/**
 * A fronteira do sistema: aqui entra o que estava no localStorage ou num arquivo
 * de backup, e o tipo de entrada é `any` de propósito. Prometer uma forma para
 * um dado que pode ter sido editado à mão, ou vir de uma versão futura do app,
 * seria mentir para o conferidor — o corpo desta função existe justamente para
 * transformar qualquer coisa em algo utilizável.
 *
 * @param {any} bruto
 * @returns {Estado}
 */
export function normalizarEstado(bruto) {
  if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.lancamentos)) {
    return estadoVazio();
  }

  /* As categorias do usuário são validadas ANTES dos lançamentos, de propósito:
     é a lista de ids válidos que decide se a categoria de um registro
     sobrevive. */
  /** @type {CategoriaDoUsuario[]} */
  const categorias = [];
  const idsDaFabrica = new Set(CATEGORIAS_DE_FABRICA.map((c) => c.id));

  for (const cru of Array.isArray(bruto.categorias) ? bruto.categorias : []) {
    if (!cru || typeof cru !== 'object') continue;

    const id = String(cru.id ?? '').trim();
    const nome = normalizarNome(cru.nome);

    /* Id repetido, ou igual ao de uma de fábrica, sombrearia a categoria certa
       em categoriaPorId — e a lista mostraria dois nomes para o mesmo id. */
    if (!id || !nome || idsDaFabrica.has(id) || categorias.some((c) => c.id === id)) continue;

    categorias.push({
      id,
      nome,
      tipo: cru.tipo === 'entrada' ? 'entrada' : 'saida',
      oculta: Boolean(cru.oculta),
    });
  }

  /** @type {Map<string, TipoDeLancamento>} */
  const tipoPorCategoria = new Map();
  for (const c of [...CATEGORIAS_DE_FABRICA, ...categorias]) tipoPorCategoria.set(c.id, c.tipo);

  /* Os cartões são lidos ANTES dos lançamentos: é a lista de ids válidos que
     decide se o vínculo de uma compra com um cartão sobrevive — a mesma ordem
     que as categorias já seguem logo acima. */
  /** @type {Cartao[]} */
  const cartoes = [];

  for (const cru of Array.isArray(bruto.cartoes) ? bruto.cartoes : []) {
    if (!cru || typeof cru !== 'object') continue;

    const id = String(cru.id ?? '').trim();
    const nome = normalizarNomeDoCartao(cru.nome);

    // Id repetido sombrearia o cartão certo em cartaoPorId.
    if (!id || !nome || cartoes.some((c) => c.id === id)) continue;

    /* MIGRAÇÃO DA v5: lá o cartão não tinha fechamento, e a regra era "compra
       do mês M cai na fatura M+1". O padrão 31 reproduz essa regra EXATAMENTE
       — toda compra do mês fecha no próprio mês, e `fechamento >= vencimento`
       joga o vencimento para o seguinte. Nenhuma compra troca de fatura na
       travessia, que é a única coisa que a migração precisa garantir.

       O gatilho é a ausência do campo, e não `bruto.versao < 6`: `versao` é
       dado de fora como qualquer outro, e um cartão gravado por uma versão que
       não conhecia fechamento merece o mesmo tratamento. É a mesma escolha que
       a categoria já faz logo acima. */
    cartoes.push({
      id,
      nome,
      limite: normalizarLimiteDoCartao(cru.limite),
      fechamento: cru.fechamento === undefined ? 31 : limitarDia(cru.fechamento),
      vencimento: limitarDia(cru.vencimento),
      arquivado: Boolean(cru.arquivado),
    });
  }

  const idsDeCartao = new Set(cartoes.map((c) => c.id));

  /** @type {Lancamento[]} */
  const lancamentos = [];

  for (const cru of bruto.lancamentos) {
    if (!cru || typeof cru !== 'object') continue;

    const criadoEm = typeof cru.criadoEm === 'string' && cru.criadoEm ? cru.criadoEm : undefined;

    /* Anotado porque a inferência alarga `tipo` para `string`, e aí ele não
       serve mais como a metade discriminante de Avulso|Fixo. */
    /** @type {{ id: string, tipo: TipoDeLancamento, descricao: string, criadoEm?: string }} */
    const base = {
      id: String(cru.id ?? ''),
      tipo: cru.tipo === 'entrada' ? 'entrada' : 'saida',
      descricao: String(cru.descricao ?? '').trim(),
      ...(criadoEm ? { criadoEm } : {}),
    };

    if (!base.id || !base.descricao) continue;

    /* A categoria de um registro: ou uma que existe e serve para o lado dele, ou
     * nada.
     *
     * - Id que não existe mais vira `null`, do mesmo jeito que a marcação órfã de
     *   realizado é descartada aqui embaixo.
     * - Id do outro lado — uma saída apontando para Salário — também vira
     *   `null`: guardaria o registro numa fatia que a pessoa não pode nem
     *   escolher para corrigir.
     * - AUSENTE ganha a sugestão pela descrição. É a migração da v3.
     *
     * O gatilho da sugestão é a ausência do campo, e não `bruto.versao < 4`:
     * `versao` é dado de fora como qualquer outro, e um registro gravado por uma
     * versão que não conhecia categoria merece a sugestão do mesmo jeito.
     * `categoria: null` explícito é respeitado — a pessoa tirou a etiqueta, e
     * sugerir de novo a cada leitura desfaria isso em silêncio. */
    const categoria =
      cru.categoria === undefined
        ? sugerirCategoria(base.descricao, base.tipo)
        : tipoPorCategoria.get(String(cru.categoria)) === base.tipo
          ? String(cru.categoria)
          : null;

    /* Cartão que não existe mais vira `null`, como a categoria órfã logo acima.
       A consequência é boa e precisa ser dita: a compra volta a ser despesa
       comum do mês em que foi feita, em vez de sumir junto com o cartão. */
    const cartao = idsDeCartao.has(String(cru.cartao)) ? String(cru.cartao) : null;

    const valorSolto = Math.abs(Math.trunc(Number(cru.valor))) || 0;

    if (cru.fixo) {
      if (!ehMes(cru.inicio)) continue;

      const valores = normalizarValores(cru.valores, valorSolto, cru.inicio);
      if (!valores.length) continue;

      lancamentos.push({
        ...base,
        categoria,
        cartao,
        fixo: true,
        dia: limitarDia(cru.dia),
        inicio: cru.inicio,
        fim: ehMes(cru.fim) ? cru.fim : null,
        pulados: Array.isArray(cru.pulados) ? cru.pulados.filter(ehMes) : [],
        valores,
      });
    } else {
      if (!ehData(cru.data) || valorSolto <= 0) continue;
      lancamentos.push({
        ...base,
        categoria,
        cartao,
        fixo: false,
        valor: valorSolto,
        data: cru.data,
      });
    }
  }

  /** @type {Realizados} */
  const realizados = {};
  const cruRealizados = bruto.realizados;
  if (cruRealizados && typeof cruRealizados === 'object') {
    /* Os ids que podem estar marcados como realizados são os dos lançamentos E
       os das faturas.
       
       A fatura paga usa o id sintético `fatura:<cartaoId>`, que por construção
       NUNCA está em `lancamentos` — ela é derivada, não gravada. Sem esta
       segunda metade, toda fatura marcada como paga seria descartada no
       primeiro recarregamento, em silêncio: o app abriria dizendo que a conta
       de outubro não foi paga depois de a pessoa ter dito que foi. */
    const idsValidos = new Set([
      ...lancamentos.map((l) => l.id),
      ...cartoes.map((c) => idDaFatura(c.id)),
    ]);
    for (const chave of Object.keys(cruRealizados)) {
      if (!cruRealizados[chave]) continue;
      const [id, mes] = chave.split('|');
      // Descarta a marcação órfã, do lançamento que não existe mais: é o que
      // impedia o mapa de encolher no MVP.
      if (idsValidos.has(id) && ehMes(mes)) realizados[chave] = true;
    }
  }

  /* Passa por definirLimite em vez de repetir a regra: assim "zero ou lixo não é
     limite" vale igual para o que vem do arquivo e para o que a tela define. */
  /** @type {Limites} */
  let limites = {};
  const crusLimites = bruto.limites;
  if (crusLimites && typeof crusLimites === 'object') {
    for (const id of Object.keys(crusLimites)) {
      // Limite de categoria que não existe mais sai, como a marcação órfã: ele
      // não teria onde aparecer.
      if (tipoPorCategoria.has(id)) limites = definirLimite(limites, id, Number(crusLimites[id]));
    }
  }

  /* MIGRAÇÃO DA v6: o mapa `faturas` guardava um total informado que SUBSTITUÍA
     a soma das compras. Cada entrada dele vira um lançamento "Ajuste de fatura"
     valendo a diferença — e a fatura volta a ser sempre a soma dos seus
     lançamentos, uma fonte de verdade só.
     
     A régua da travessia, e o que os testes cobram: O VALOR DE TODA FATURA É O
     MESMO ANTES E DEPOIS. Quem informou R$ 3.562,52 continua vendo R$ 3.562,52
     — a diferença é que agora dá para ver de onde ele vem, e mexer nele.
     
     O `hoje` passado é o dia 1 do mês da fatura, e não a data real: uma
     migração cujo resultado depende de quando ela roda é uma migração que não
     se testa. `dataPadraoDaFatura` cai no dia do fechamento do ciclo, que é
     onde o ajuste pertence.
     
     O id é derivado do cartão e do mês em vez de sorteado, para que uma segunda
     leitura do mesmo dado não crie um segundo ajuste. */
  const crusFaturas = bruto.faturas;
  if (crusFaturas && typeof crusFaturas === 'object') {
    /* O ajuste é medido contra os lançamentos que já atravessaram, então este
       estado provisório precisa deles e dos cartões — nada mais. */
    /** @type {Estado} */
    const provisorio = { versao: VERSAO_DO_ESQUEMA, lancamentos, realizados, categorias, limites, cartoes };

    for (const chave of Object.keys(crusFaturas)) {
      const separador = chave.lastIndexOf('|');
      if (separador <= 0) continue;
      const cartaoId = chave.slice(0, separador);
      const mes = chave.slice(separador + 1);
      // Valor de fatura de cartão que não existe mais sai: não teria onde aparecer.
      if (!idsDeCartao.has(cartaoId) || !ehMes(mes)) continue;

      const ajuste = ajusteDeFatura(
        provisorio,
        cartaoId,
        mes,
        Number(crusFaturas[chave]),
        'ajuste:' + cartaoId + ':' + mes,
        mes + '-01'
      );
      if (ajuste) lancamentos.push(ajuste);
    }
  }

  return {
    versao: VERSAO_DO_ESQUEMA,
    lancamentos,
    realizados,
    categorias,
    limites,
    cartoes,
  };
}

/* ---------- Cartões de crédito (B6) ----------
 *
 * A fatura é SEMPRE derivada — nunca gravada. Gravá-la seria uma segunda cópia
 * da verdade: bastaria apagar uma compra, mudar o dia do vencimento ou editar
 * um valor para as duas discordarem, e a que estivesse errada seria justamente
 * a que a pessoa lê. Derivar custa microssegundos e elimina a classe inteira.
 *
 * O que É gravado: o cartão, o vínculo da compra com o cartão, e o valor
 * informado de cada mês. Ver docs/b6-cartoes-de-credito.md. */

const LIMITE_DO_NOME_DO_CARTAO = 24;

/* EM QUE FATURA UMA COMPRA CAI. A regra central do bloco, e a única dona dela.
 *
 * Duas perguntas, nesta ordem:
 *
 * 1. Em que mês a compra FECHA? No próprio, se ela veio até o dia do
 *    fechamento; no seguinte, se veio depois.
 * 2. Em que mês essa fatura VENCE? No mesmo mês do fechamento quando o cartão
 *    fecha antes de vencer (fecha 3, vence 10); no seguinte quando fecha depois
 *    ou no mesmo dia (fecha 30, vence 10).
 *
 * Os dois formatos reais saem daí sem caso especial:
 *
 *   fecha 30, vence 10 | 15/09 -> fecha 30/09 -> vence 10/10
 *   fecha 30, vence 10 | 01/10 -> fecha 30/10 -> vence 10/11
 *   fecha  3, vence 10 | 02/09 -> fecha 03/09 -> vence 10/09
 *   fecha  3, vence 10 | 05/09 -> fecha 03/10 -> vence 10/10
 *
 * A primeira versão do bloco não tinha fechamento e aproximava isto por "mês M
 * cai na fatura M+1". A aproximação servia enquanto a fatura era só um número;
 * parou de servir quando a pessoa passou a lançar compras DENTRO de uma fatura,
 * porque "esta fatura" não tinha definição exata. Ver docs/b6-cartoes-de-credito.md.
 *
 * Devolve o MÊS DO VENCIMENTO, que é como toda fatura é identificada no app. */
/**
 * @param {Cartao} cartao
 * @param {Data} data
 * @returns {Mes}
 */
export function faturaDaCompra(cartao, data) {
  const mes = mesDe(data);

  // Fechamento dia 31 num mês de 30 vira dia 30, como o vencimento já faz.
  const fecha = Math.min(cartao.fechamento, diasNoMes(mes));
  const mesDoFechamento = diaDe(data) <= fecha ? mes : deslocarMes(mes, 1);

  return cartao.fechamento < cartao.vencimento
    ? mesDoFechamento
    : deslocarMes(mesDoFechamento, 1);
}

/* Que data uma compra criada DE DENTRO de uma fatura recebe.
 *
 * Hoje, quando hoje cai naquela fatura — o caso comum, e o mais honesto. Senão,
 * o dia do fechamento daquele ciclo, que é a última data que ainda entra nela.
 *
 * O ponto é a decisão 3: quem abre a fatura de outubro e toca em adicionar
 * espera que a compra entre em outubro. A data vai preenchida e VISÍVEL no
 * formulário, então nada disso é escondido — é só um padrão melhor que "hoje"
 * para quem está olhando outro mês. */
/**
 * @param {Cartao} cartao
 * @param {Mes} mes O mês de vencimento da fatura aberta.
 * @param {Data} hoje
 * @returns {Data}
 */
export function dataPadraoDaFatura(cartao, mes, hoje) {
  if (faturaDaCompra(cartao, hoje) === mes) return hoje;

  /* O ciclo desta fatura fecha no mês anterior ao vencimento, ou no próprio,
     conforme a mesma regra de faturaDaCompra — invertida. */
  const mesDoFechamento = cartao.fechamento < cartao.vencimento ? mes : deslocarMes(mes, -1);
  const dia = Math.min(cartao.fechamento, diasNoMes(mesDoFechamento));

  return mesDoFechamento + '-' + String(dia).padStart(2, '0');
}

/**
 * @param {string} cartaoId
 * @returns {string}
 */
export function idDaFatura(cartaoId) {
  return 'fatura:' + cartaoId;
}

/**
 * @param {Estado} estado
 * @param {string|null|undefined} id
 * @returns {Cartao|null}
 */
export function cartaoPorId(estado, id) {
  if (!id) return null;
  return estado.cartoes.find((c) => c.id === id) ?? null;
}

/**
 * Os cartões que a tela oferece: os não arquivados, em ordem de nome.
 * @param {Estado} estado
 * @returns {Cartao[]}
 */
export function cartoesAtivos(estado) {
  return estado.cartoes
    .filter((c) => !c.arquivado)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id));
}

/* O nome do cartão não vira id, ao contrário do que acontece com categoria.
 *
 * Lá o id derivado do nome existe para que "Padaria" digitado duas vezes seja a
 * mesma categoria. Aqui é o oposto: dois cartões podem legitimamente se chamar
 * "Nubank" — o físico e o virtual, o meu e o da minha mãe — e fundi-los pelo
 * nome misturaria duas faturas numa. */
/**
 * @param {Estado} estado
 * @param {string} id
 * @param {string} nome
 * @param {unknown} limite Centavos.
 * @param {unknown} fechamento Dia do mês.
 * @param {unknown} vencimento Dia do mês.
 * @returns {Estado}
 */
export function criarCartao(estado, id, nome, limite, fechamento, vencimento) {
  const limpo = normalizarNomeDoCartao(nome);
  if (!id || !limpo || estado.cartoes.some((c) => c.id === id)) return estado;

  return {
    ...estado,
    cartoes: [
      ...estado.cartoes,
      {
        id,
        nome: limpo,
        limite: normalizarLimiteDoCartao(limite),
        fechamento: limitarDia(fechamento),
        vencimento: limitarDia(vencimento),
        arquivado: false,
      },
    ],
  };
}

/**
 * Muda só o que veio. Campo ausente fica como estava — assim a tela pode salvar
 * o nome sem ter que reenviar limite e vencimento.
 * @param {Estado} estado
 * @param {string} id
 * @param {{ nome?: string, limite?: unknown, fechamento?: unknown, vencimento?: unknown }} campos
 * @returns {Estado}
 */
export function alterarCartao(estado, id, campos) {
  const cartao = cartaoPorId(estado, id);
  if (!cartao) return estado;

  const nome = campos.nome === undefined ? cartao.nome : normalizarNomeDoCartao(campos.nome);
  // Nome em branco não apaga o nome do cartão: fica o que já estava.
  const alterado = {
    ...cartao,
    nome: nome || cartao.nome,
    limite: campos.limite === undefined ? cartao.limite : normalizarLimiteDoCartao(campos.limite),
    fechamento:
      campos.fechamento === undefined ? cartao.fechamento : limitarDia(campos.fechamento),
    vencimento:
      campos.vencimento === undefined ? cartao.vencimento : limitarDia(campos.vencimento),
  };

  return { ...estado, cartoes: estado.cartoes.map((c) => (c.id === id ? alterado : c)) };
}

/* Arquiva, não apaga — a mesma decisão que as categorias tomaram no B5.
 *
 * Apagar de verdade obrigaria a decidir o que fazer com as compras que apontam
 * para o cartão e com as faturas já pagas: ou some o histórico, ou sobra lixo
 * apontando para o nada. Arquivado, o cartão sai da lista de escolha e para de
 * gerar fatura nos meses novos, e o passado continua contando a mesma história. */
/**
 * @param {Estado} estado
 * @param {string} id
 * @returns {Estado}
 */
export function arquivarCartao(estado, id) {
  return {
    ...estado,
    cartoes: estado.cartoes.map((c) => (c.id === id ? { ...c, arquivado: true } : c)),
  };
}

/* As compras que caem na fatura que vence em `mes`.
 *
 * Deixou de ser "as do mês anterior" quando o fechamento entrou: um ciclo
 * atravessa DOIS meses do calendário (fecha 30/09 e recebe compras desde
 * 01/10... não — desde 01/09; mas com fecha 3, o ciclo que vence em 10/10 vai
 * de 04/09 a 03/10). Então varremos a janela de meses que pode conter o ciclo
 * e deixamos `faturaDaCompra` decidir, que continua sendo a única dona da regra
 * — repetir a conta aqui seria a segunda dona, e as duas divergiriam.
 *
 * A janela é de três meses porque o ciclo mais deslocado possível (fecha 31,
 * vence 1) ainda cabe em dois meses de calendário, e um de folga custa nada. */
/**
 * @param {Estado} estado
 * @param {string} cartaoId
 * @param {Mes} mes O mês de vencimento da fatura.
 * @returns {LancamentoDoMes[]}
 */
export function comprasDaFatura(estado, cartaoId, mes) {
  const cartao = cartaoPorId(estado, cartaoId);
  if (!cartao) return [];

  /** @type {LancamentoDoMes[]} */
  const compras = [];

  for (const passo of [-2, -1, 0]) {
    for (const l of lancamentosDoMes(estado.lancamentos, deslocarMes(mes, passo))) {
      /* Entrada também entra, e é o ajuste que subtrai (ver
         docs/ajuste-de-fatura.md). Todo valor no app é positivo, e o `tipo` é
         que dá o sinal — um lançamento de valor negativo quebraria essa
         invariante em toda conta do app, não só aqui. */
      if (l.cartao !== cartaoId) continue;
      if (faturaDaCompra(cartao, dataDaOcorrencia(l, deslocarMes(mes, passo))) === mes) {
        compras.push(l);
      }
    }
  }

  return compras;
}

/* A data de uma ocorrência: o avulso já tem a sua, e o fixo tem um dia que
   precisa virar data dentro do mês em que aparece. */
/**
 * @param {LancamentoDoMes} l
 * @param {Mes} mes
 * @returns {Data}
 */
function dataDaOcorrencia(l, mes) {
  return l.fixo ? mes + '-' + String(l.dia).padStart(2, '0') : l.data;
}

export const DESCRICAO_DO_AJUSTE = 'Ajuste de fatura';

/* O lançamento que faz a fatura fechar num total informado.
 *
 * ELE VALE A DIFERENÇA, e não o número digitado. O total que a pessoa lê no
 * aplicativo do banco JÁ INCLUI as compras que ela por acaso tenha anotado — se
 * o ajuste valesse o digitado, essas compras contariam duas vezes. Com a
 * diferença, o total bate exatamente, e as compras seguintes somam por cima,
 * que é o pedido inteiro deste bloco.
 *
 * Nada no dado marca este lançamento como ajuste, e isso é deliberado: nenhuma
 * lógica precisa reconhecê-lo, e é por não haver marca que informar um total
 * novo mede a diferença contra a soma INTEIRA — ajustes anteriores incluídos.
 * A propriedade vale por construção, não por código que se lembre dela.
 *
 * Diferença negativa vira ENTRADA no cartão, de valor positivo: é o ajuste que
 * subtrai (estorno, ou compra anotada que o banco ainda não cobrou). Ver a
 * decisão em docs/ajuste-de-fatura.md.
 *
 * Devolve `null` quando não há o que ajustar: diferença zero, cartão que não
 * existe, ou total ilegível. Quem chama trata `null` como "nada a fazer" — não
 * é erro, é a resposta certa para "informei o mesmo valor de novo".
 *
 * O `id` e o `hoje` vêm de fora porque o núcleo é puro: sortear id e ler o
 * relógio aqui tornaria a função impossível de testar duas vezes com o mesmo
 * resultado. */
/**
 * @param {Estado} estado
 * @param {string} cartaoId
 * @param {Mes} mes O mês de vencimento da fatura.
 * @param {unknown} total O total lido no banco, em centavos.
 * @param {string} id
 * @param {Data} hoje
 * @returns {Avulso|null} Sempre avulso: um ajuste é de um ciclo só, nunca uma regra que se repete.
 */
export function ajusteDeFatura(estado, cartaoId, mes, total, id, hoje) {
  const cartao = cartaoPorId(estado, cartaoId);
  if (!cartao || !id || !ehMes(mes)) return null;

  const bruto = Math.trunc(Number(total));
  if (!Number.isFinite(bruto)) return null;

  const fatura = faturaDoMes(estado, cartaoId, mes);
  if (!fatura) return null;

  // Total negativo digitado é lido como zero: a fatura não pode vir devendo
  // menos que nada, e o crédito que sobra já é representado pela diferença.
  const diferenca = Math.max(bruto, 0) - fatura.valor;
  if (diferenca === 0) return null;

  return {
    id,
    tipo: diferenca > 0 ? 'saida' : 'entrada',
    descricao: DESCRICAO_DO_AJUSTE,
    categoria: null,
    cartao: cartaoId,
    fixo: false,
    valor: Math.abs(diferenca),
    data: dataPadraoDaFatura(cartao, mes, hoje),
  };
}

/* A fatura de um cartão num mês.
 *
 * O VALOR INFORMADO VENCE SEMPRE sobre a soma das compras. A fatura real sabe
 * de coisas que o app não sabe — anuidade, juros, a compra que a pessoa esqueceu
 * de anotar — e o número que ela digitou olhando o aplicativo do banco vale mais
 * que a nossa soma. Quando os dois existem, a tela mostra os dois; aqui a
 * escolha é uma só, e é dela.
 *
 * Devolve `null` para cartão que não existe. A tela nunca deveria pedir uma
 * fatura assim, mas devolver um objeto zerado faria um cartão apagado parecer um
 * cartão sem gastos. */
/**
 * @param {Estado} estado
 * @param {string} cartaoId
 * @param {Mes} mes
 * @returns {Fatura|null}
 */
export function faturaDoMes(estado, cartaoId, mes) {
  const cartao = cartaoPorId(estado, cartaoId);
  if (!cartao) return null;

  const compras = comprasDaFatura(estado, cartaoId, mes);

  /* Saídas menos entradas. A entrada num cartão é o ajuste que subtrai, e é
     assim que ele desconta sem que nenhum valor no estado seja negativo. */
  const valor = compras.reduce(
    (total, l) => total + (l.tipo === 'entrada' ? -l.valor : l.valor),
    0
  );

  return {
    id: idDaFatura(cartaoId),
    tipo: 'saida',
    descricao: 'Fatura do ' + cartao.nome,
    categoria: null,
    dia: Math.min(cartao.vencimento, diasNoMes(mes)),
    valor,
    ehFatura: true,
    cartaoId,
    cartao: cartao.nome,
    quantidade: compras.length,
  };
}

/* As faturas que entram na conta do mês.
 *
 * Fatura sem valor nenhum FICA DE FORA. Um cartão recém-criado, ou um mês em
 * que não se comprou nada nem se informou total, produziria "Fatura do Nubank —
 * R$ 0,00" em toda lista, todo mês: ruído puro. O app também não inventa um
 * número para preencher o vazio — se a pessoa não anotou nem informou, ele não
 * sabe, e dizer que não sabe é mais honesto que estimar.
 *
 * A tela do cartão mostra a fatura vazia mesmo assim: lá ela é a resposta à
 * pergunta "quanto está vindo?", e "nada ainda" é uma resposta. */
/**
 * @param {Estado} estado
 * @param {Mes} mes
 * @returns {Fatura[]}
 */
export function faturasDoMes(estado, mes) {
  /** @type {Fatura[]} */
  const faturas = [];

  for (const cartao of estado.cartoes) {
    if (cartao.arquivado) continue;
    const fatura = faturaDoMes(estado, cartao.id, mes);
    if (fatura && fatura.valor > 0) faturas.push(fatura);
  }

  return faturas;
}

/* ---------- Realizado ---------- */

/**
 * @param {string} id
 * @param {Mes} mes
 * @returns {string}
 */
export function chaveDeRealizado(id, mes) {
  return id + '|' + mes;
}

/**
 * @param {Realizados} realizados
 * @param {string} id
 * @param {Mes} mes
 * @returns {boolean}
 */
export function estaRealizado(realizados, id, mes) {
  return Boolean(realizados[chaveDeRealizado(id, mes)]);
}

/**
 * @param {Realizados} realizados
 * @param {string} id
 * @param {Mes} mes
 * @returns {Realizados}
 */
export function alternarRealizado(realizados, id, mes) {
  const chave = chaveDeRealizado(id, mes);
  const copia = { ...realizados };
  if (copia[chave]) delete copia[chave];
  else copia[chave] = true;
  return copia;
}

/**
 * @param {Realizados} realizados
 * @param {string} id
 * @param {Mes} [mes] Sem mês, limpa todos os meses daquele id.
 * @returns {Realizados}
 */
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
/**
 * @param {Fixo} lancamento
 * @param {Mes} mes
 * @returns {boolean}
 */
export function fixoApareceEm(lancamento, mes) {
  if (mes < lancamento.inicio) return false;
  if (lancamento.fim && mes > lancamento.fim) return false;
  return !lancamento.pulados.includes(mes);
}

/* Os lançamentos de um mês, do dia 1 para o 31, já com o dia e o VALOR
 * resolvidos para aquele mês.
 *
 * Resolver aqui é o que mantém a linha do tempo invisível para o resto do
 * código: quem soma, quem desenha e quem compara continua lendo `.valor` como
 * antes, sem saber que ele pode mudar de mês para mês.
 *
 * O dia do fixo é limitado ao tamanho do mês: sem isso o aluguel do dia 31
 * desaparece em fevereiro. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {Mes} mes
 * @returns {LancamentoDoMes[]}
 */
export function lancamentosDoMes(lancamentos, mes) {
  return lancamentos
    .filter((l) => (l.fixo ? fixoApareceEm(l, mes) : mesDe(l.data) === mes))
    .map((l) =>
      l.fixo
        ? { ...l, dia: Math.min(l.dia, diasNoMes(mes)), valor: valorVigenteEm(l.valores, mes) }
        : { ...l, dia: diaDe(l.data) }
    )
    .sort(
      (a, b) =>
        a.dia - b.dia ||
        a.descricao.localeCompare(b.descricao, 'pt-BR') ||
        a.id.localeCompare(b.id)
    );
}

/* O que de fato mexe na conta no mês: os lançamentos do mês MENOS as compras
 * pagas no cartão.
 *
 * A compra no cartão continua sendo uma compra do mês em que foi feita — é
 * assim que o Relatório a conta, e é por isso que o filtro mora AQUI e não
 * dentro de `lancamentosDoMes`. "De que mês é" e "sai da conta quando" são
 * perguntas diferentes, e misturá-las sumiria com a compra do "para onde foi".
 *
 * O que ela não faz é sair da conta em setembro: ela sai quando a fatura vence,
 * em outubro. Por isso a lista e o resumo do mês a excluem, e põem a fatura no
 * lugar. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {Mes} mes
 * @returns {LancamentoDoMes[]}
 */
export function lancamentosDaConta(lancamentos, mes) {
  return lancamentosDoMes(lancamentos, mes).filter((l) => !l.cartao);
}

/* A lista do mês, do jeito que a tela desenha: o que mexe na conta e as faturas
   que vencem, misturados e em ordem de dia. */
/**
 * @param {Estado} estado
 * @param {Mes} mes
 * @returns {ItemDoMes[]}
 */
export function itensDoMes(estado, mes) {
  /** @type {ItemDoMes[]} */
  const itens = [...lancamentosDaConta(estado.lancamentos, mes), ...faturasDoMes(estado, mes)];

  return itens.sort(
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
/* `faturas` é OBRIGATÓRIO, e não tem valor padrão de propósito.
 *
 * Um `= []` faria a chamada esquecida devolver uma sobra maior que a real, em
 * silêncio, para quem tem cartão — exatamente o erro que o CLAUDE.md chama de
 * destruidor de confiança. Quem não tem cartão passa `[]` e diz isso de boca. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {Realizados} realizados
 * @param {Mes} mes
 * @param {Fatura[]} faturas As faturas que vencem neste mês. `[]` quando não há cartão.
 * @returns {Resumo}
 */
export function resumoDoMes(lancamentos, realizados, mes, faturas) {
  /** @type {ItemDoMes[]} */
  const doMes = [...lancamentosDaConta(lancamentos, mes), ...faturas];

  const entradas = { previsto: 0, realizado: 0, quantidade: 0 };
  const despesas = { previsto: 0, realizado: 0, quantidade: 0 };

  /* Quanto do previsto das despesas é fatura de cartão (decisão 5).
     A soma sai daqui, e não da tela, porque é conta com dinheiro — e sai deste
     mesmo laço para não haver duas passadas que possam discordar. */
  let emCartao = 0;

  for (const l of doMes) {
    const lado = l.tipo === 'entrada' ? entradas : despesas;
    lado.previsto += l.valor;
    lado.quantidade += 1;
    if (estaRealizado(realizados, l.id, mes)) lado.realizado += l.valor;
    if (l.ehFatura) emCartao += l.valor;
  }

  return {
    entradas,
    despesas,
    sobra: entradas.previsto - despesas.previsto,
    naContaAgora: entradas.realizado - despesas.realizado,
    faltaEntrar: entradas.previsto - entradas.realizado,
    faltaSair: despesas.previsto - despesas.realizado,
    emCartao,
    vazio: doMes.length === 0,
  };
}

/* Largura dos trechos das barras do painel, em porcentagem.
 *
 * As duas barras dividem a mesma referência — o maior dos dois previstos — para
 * que "vai sair mais do que entra" seja visível de relance. Dentro de cada
 * barra, o trecho cheio é o que já aconteceu e o claro é o que ainda falta; os
 * dois somados dão o previsto do lado. */
/**
 * Pede só os dois números de cada lado, e não o `Resumo` inteiro: é tudo que a
 * conta usa, e prometer menos deixa a função reaproveitável — foi o conferidor
 * de tipos que apontou a diferença, a partir de um teste que já passava um
 * resumo parcial.
 *
 * `emCartao` é obrigatório e não tem valor padrão, pela mesma razão que o
 * `faturas` do resumoDoMes não tem: um padrão silencioso fabrica a chamada
 * esquecida que devolve a barrinha faltando sem ninguém notar.
 *
 * @param {{ entradas: { previsto: number, realizado: number },
 *           despesas: { previsto: number, realizado: number },
 *           emCartao: number }} resumo
 * @returns {{ entradas: { realizado: number, previsto: number },
 *             despesas: { realizado: number, previsto: number },
 *             cartao: number }}
 */
export function proporcoesDasBarras(resumo) {
  const referencia = Math.max(resumo.entradas.previsto, resumo.despesas.previsto);

  /** @param {{ previsto: number, realizado: number }} lado */
  const fatiar = (lado) =>
    referencia === 0
      ? { realizado: 0, previsto: 0 }
      : {
          realizado: (lado.realizado / referencia) * 100,
          previsto: (Math.max(lado.previsto - lado.realizado, 0) / referencia) * 100,
        };

  return {
    entradas: fatiar(resumo.entradas),
    despesas: fatiar(resumo.despesas),
    /* A barrinha do cartão fica DEBAIXO do trilho de Despesas, e por isso usa a
       mesma referência que ele: barra embaixo de barra é comparada por quem
       olha, quer a gente queira ou não. Medi-la contra o total de despesas
       faria uma fatura de 4 mil encher a barrinha inteira e parecer maior que
       a despesa de 11 mil logo acima. */
    cartao: referencia === 0 ? 0 : (resumo.emCartao / referencia) * 100,
  };
}

/* ---------- Para onde o dinheiro foi, e os limites ---------- */

/* A quebra do mês, do maior para o menor.
 *
 * Só SAÍDAS. Inclui lançamentos planejados e realizados: quem entra no
 * Relatório no início do mês vê para onde o dinheiro está planejado para ir, e
 * à medida que paga vê a barra encher (melhoria 1).
 *
 * O valor de cada fixo vem de `lancamentosDoMes`, e não de `valores`: é o que
 * mantém a linha do tempo do B3 invisível aqui, e o que garante que a quebra de
 * dezembro use o salário de dezembro.
 *
 * O registro sem categoria entra na lista com `id: null`, e NÃO somado em
 * Outros: a tela precisa poder convidar ao toque justo em cima do que o app não
 * soube classificar.
 *
 * `proporcao` divide-se em dois trechos: `realizado` (o que já foi pago) e
 * `previsto` (o que ainda falta pagar), medidos em porcentagem do MAIOR gasto do
 * mês. Segue a mesma linguagem visual das barras do painel do Início. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {Realizados} realizados
 * @param {Mes} mes
 * @param {Cartao[]} [cartoes]
 * @returns {GastoDeCategoria[]}
 */
export function gastosPorCategoria(lancamentos, realizados, mes, cartoes = []) {
  /** @type {Map<string|null, { id: string|null, previsto: number, realizado: number, quantidade: number }>} */
  const porCategoria = new Map();

  for (const l of lancamentosDoMes(lancamentos, mes)) {
    if (l.tipo !== 'saida') continue;

    const id = l.categoria ?? null;
    const fatia = porCategoria.get(id) || { id, previsto: 0, realizado: 0, quantidade: 0 };
    fatia.previsto += l.valor;
    fatia.quantidade += 1;

    let pago = estaRealizado(realizados, l.id, mes);
    if (!pago && l.cartao && cartoes && cartoes.length > 0) {
      const cartao = cartoes.find((c) => c.id === l.cartao);
      if (cartao) {
        const data = l.fixo ? mes + '-' + String(l.dia).padStart(2, '0') : l.data;
        const mesFatura = faturaDaCompra(cartao, data);
        pago =
          estaRealizado(realizados, idDaFatura(cartao.id), mesFatura) ||
          estaRealizado(realizados, idDaFatura(cartao.id), mes);
      }
    }

    if (pago) {
      fatia.realizado += l.valor;
    }
    porCategoria.set(id, fatia);
  }

  const fatias = [...porCategoria.values()];
  const maior = fatias.reduce((m, f) => Math.max(m, Math.max(f.previsto, f.realizado)), 0);

  /* Empate desempata pelo id, e "sem categoria" fica por último: a ordem só
     precisa ser ESTÁVEL — duas categorias com o mesmo total tanto faz quem vem
     antes, mas a lista não pode trocar de ordem entre dois desenhos iguais.
     Comparação direta, e não localeCompare, porque id é sempre ASCII. */
  const ordem = (/** @type {{ id: string|null }} */ f) => (f.id === null ? '\uffff' : f.id);

  return fatias
    .map((f) => {
      const previstoRestante = Math.max(f.previsto - f.realizado, 0);
      return {
        id: f.id,
        previsto: f.previsto,
        realizado: f.realizado,
        total: f.previsto,
        quantidade: f.quantidade,
        proporcao: {
          realizado: maior === 0 ? 0 : (f.realizado / maior) * 100,
          previsto: maior === 0 ? 0 : (previstoRestante / maior) * 100,
        },
      };
    })
    .sort((a, b) => {
      const totalA = Math.max(a.previsto, a.realizado);
      const totalB = Math.max(b.previsto, b.realizado);
      return totalB - totalA || (ordem(a) < ordem(b) ? -1 : ordem(a) > ordem(b) ? 1 : 0);
    });
}

/* Zero, vazio ou lixo REMOVE o limite, em vez de gravar um limite de R$ 0,00.
 *
 * Um limite de zero diria "você já estourou" para quem só quis apagar o limite,
 * e não existe pessoa que queira um limite de zero. A ausência da chave é a
 * ausência de limite, e é o mesmo desenho de `realizados`: o mapa só guarda o
 * que é verdade.
 *
 * Negativo também remove, e aqui o núcleo foge da própria regra de "o sinal é
 * descartado, quem decide o lado é o tipo do lançamento": limite não tem lado,
 * é sempre um teto. Um `-1` só chega aqui por arquivo editado à mão, e virar um
 * teto de R$ 0,01 deixaria a pessoa estourada em toda categoria — pior que
 * simplesmente não ter limite. */
/**
 * @param {Limites} limites
 * @param {string} id
 * @param {number} valor Centavos. Zero, negativo, vazio ou inválido remove.
 * @returns {Limites}
 */
export function definirLimite(limites, id, valor) {
  const copia = { ...limites };
  if (!id) return copia;

  const bruto = Number(valor);

  if (Number.isFinite(bruto) && bruto >= 1) copia[id] = Math.trunc(bruto);
  else delete copia[id];

  return copia;
}

/* O que a tela precisa saber sobre um limite — sem dizer nada de ríspido.
 *
 * O conceito é explícito: estourar um limite gera informação, não bronca. Por
 * isso aqui não existe "gravidade" nem "alerta": existe quanto se usou, quanto
 * resta, e um `estourou` que a tela lê para trocar a frase.
 *
 * `restante` é ASSINADO: negativo é o quanto passou. `excedente` é o mesmo
 * número já em positivo — os dois existem porque a tela precisa dos dois, e
 * fazer a inversão de sinal lá seria conta com dinheiro fora do núcleo.
 *
 * `proporcao` para em 100 porque é largura de barra: quem gastou o dobro do
 * limite tem a barra cheia, e quem conta o "passou" é `estourou`.
 *
 * Sem limite (zero ou ausente) não existe estouro. Tratar a ausência como um
 * limite de zero faria toda categoria nascer estourada — o oposto de aliado. */
/**
 * @param {number} gasto Centavos já realizados na categoria.
 * @param {number} limite Centavos. Zero é "sem limite".
 * @returns {SituacaoDeLimite}
 */
export function situacaoDoLimite(gasto, limite) {
  const usado = Math.max(Math.trunc(Number(gasto)) || 0, 0);
  const teto = Math.max(Math.trunc(Number(limite)) || 0, 0);

  if (teto <= 0) return { usado, restante: 0, excedente: 0, proporcao: 0, estourou: false };

  const restante = teto - usado;

  return {
    usado,
    restante,
    /* Quanto passou do teto, já em positivo.
     *
     * Este campo foi recusado na primeira versão, com o argumento de que a
     * frase da tela — "você já usou X dos Y" — não precisava dele. A tela
     * escreveu outra frase, que precisava, e inverteu o sinal do `restante` por
     * conta própria. Era conta com dinheiro fora do núcleo, que é justamente o
     * que o CLAUDE.md proíbe. O campo passa a existir, e o cálculo volta para
     * onde há teste. */
    excedente: Math.max(-restante, 0),
    proporcao: Math.min((usado / teto) * 100, 100),
    // Gastar exatamente o limite não é estourar: usou o que tinha para usar.
    estourou: usado > teto,
  };
}

/* ---------- Alterações que envolvem recorrência ----------
 *
 * As três semânticas de excluir um fixo. São o problema mais difícil da
 * recorrência, e por isso vivem aqui, puras e testadas, em vez de espalhadas
 * pelos manipuladores de clique. */

/**
 * @param {Lancamento[]} lancamentos
 * @param {string} id
 * @returns {Lancamento[]}
 */
export function excluirLancamento(lancamentos, id) {
  return lancamentos.filter((l) => l.id !== id);
}

/* "Excluir só neste mês": o fixo continua existindo, mas este mês passa a ser
   pulado. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {string} id
 * @param {Mes} mes
 * @returns {Lancamento[]}
 */
export function pularMes(lancamentos, id, mes) {
  return lancamentos.map((l) =>
    l.id === id && l.fixo && !l.pulados.includes(mes)
      ? { ...l, pulados: [...l.pulados, mes] }
      : l
  );
}

/* "Encerrar deste mês em diante": o fixo passa a valer até o mês anterior. */
/**
 * @param {Lancamento[]} lancamentos
 * @param {string} id
 * @param {Mes} mes
 * @returns {Lancamento[]}
 */
export function encerrarFixo(lancamentos, id, mes) {
  const fim = deslocarMes(mes, -1);
  return lancamentos.map((l) => (l.id === id && l.fixo ? { ...l, fim } : l));
}

/* ---------- Backup ----------
 *
 * O arquivo leva um envelope em volta do estado, e não o estado cru. Um JSON
 * solto na pasta de Downloads seis meses depois não diz de onde veio nem de
 * quando é — e o app, ao receber um JSON qualquer, não teria como saber se
 * aquilo é uma cópia do Zenny ou outra coisa.
 *
 * Na leitura, porém, o app é liberal: aceita o envelope e o estado cru. Custa
 * três linhas e evita trancar para fora dos próprios dados quem editou o
 * arquivo à mão. */

export const APP_DO_BACKUP = 'zenny';

/**
 * @param {Estado} estado
 * @param {Date} agora
 * @returns {{ app: string, versao: number, exportadoEm: string, estado: Estado }}
 */
export function montarBackup(estado, agora) {
  return {
    app: APP_DO_BACKUP,
    versao: VERSAO_DO_ESQUEMA,
    exportadoEm: agora.toISOString(),
    estado,
  };
}

/* Data LOCAL, e não UTC: o nome é lido por gente, e uma cópia feita às 21h no
   Brasil não pode aparecer com a data de amanhã. */
/**
 * @param {Date} agora
 * @returns {string}
 */
export function nomeDoArquivo(agora) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `zenny-${ano}-${mes}-${dia}.json`;
}

/* O que dizer na confirmação, para a pessoa reconhecer o arquivo antes de
   trocar o que está no aparelho por ele.
 *
 * O fim de um fixo sem `fim` não entra no intervalo: ele é aberto, e afirmar um
 * último mês que não existe seria inventar. Por isso o fixo aberto contribui
 * com o próprio início nas duas pontas. */
/**
 * @param {Partial<Estado> | null | undefined} estado
 * @returns {{ total: number, fixos: number, avulsos: number, cartoes: number,
 *   primeiroMes: Mes|null, ultimoMes: Mes|null }}
 */
export function resumirEstado(estado) {
  const lancamentos = (estado && estado.lancamentos) || [];
  const cartoes = (estado && estado.cartoes) || [];

  let primeiroMes = null;
  let ultimoMes = null;
  let fixos = 0;

  for (const l of lancamentos) {
    if (l.fixo) fixos++;
    const comeca = l.fixo ? l.inicio : mesDe(l.data);
    const termina = l.fixo ? l.fim || l.inicio : comeca;

    if (!primeiroMes || comeca < primeiroMes) primeiroMes = comeca;
    if (!ultimoMes || termina > ultimoMes) ultimoMes = termina;
  }

  return {
    total: lancamentos.length,
    fixos,
    avulsos: lancamentos.length - fixos,
    /* Cartao arquivado conta: ele volta no lugar do que esta no aparelho como
       qualquer outro, e some da frase seria omitir parte da troca. */
    cartoes: cartoes.length,
    primeiroMes,
    ultimoMes,
  };
}

/* Lê o texto de um arquivo e devolve o que dá para fazer com ele.
 *
 * `descartados` existe porque normalizarEstado joga fora lançamento inválido em
 * silêncio. No uso normal isso está certo — o usuário não tem como consertar, e
 * perder a tela é pior que perder um lançamento torto. Aqui o silêncio se
 * inverte: a pessoa lê "pronto" e acredita que está tudo de volta. Então a
 * conta é feita e quem chama decide o que dizer. */
/**
 * @param {string} texto
 * @returns {{ ok: false, erro: 'nao-e-json'|'nao-e-zenny' }
 *   | { ok: true, estado: Estado, resumo: ReturnType<typeof resumirEstado>,
 *       descartados: number, exportadoEm: string|null }}
 */
export function lerBackup(texto) {
  let cru;
  try {
    cru = JSON.parse(texto);
  } catch (e) {
    return { ok: false, erro: 'nao-e-json' };
  }

  if (!cru || typeof cru !== 'object') return { ok: false, erro: 'nao-e-json' };

  const bruto = cru.estado && typeof cru.estado === 'object' ? cru.estado : cru;
  if (!Array.isArray(bruto.lancamentos)) return { ok: false, erro: 'nao-e-zenny' };

  const estado = normalizarEstado(bruto);

  return {
    ok: true,
    estado,
    resumo: resumirEstado(estado),
    descartados: bruto.lancamentos.length - estado.lancamentos.length,
    exportadoEm: typeof cru.exportadoEm === 'string' ? cru.exportadoEm : null,
  };
}

/* Dias inteiros entre duas datas.
 *
 * Cada data vira meia-noite do próprio dia LOCAL antes da subtração. Dividir a
 * diferença bruta de milissegundos por 86.400.000 erra na virada do horário de
 * verão, quando um dia tem 23 ou 25 horas — o tipo de defeito que aparece uma
 * vez por ano e não se reproduz quando alguém vai procurar. */
/**
 * @param {string|Date} inicio
 * @param {string|Date} fim
 * @returns {number|null} `null` se alguma das datas for inválida.
 */
export function diasEntre(inicio, fim) {
  const a = new Date(inicio);
  const b = new Date(fim);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;

  const diaA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const diaB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((diaB - diaA) / 86400000);
}

/* A frase do lembrete. Fica aqui, e não no app.js, porque tem regra: sem cópia,
   hoje, ontem, e o resto em dias. Regra tem teste. */
/**
 * @param {string|null|undefined} iso
 * @param {Date} agora
 * @returns {string}
 */
export function textoDoUltimoBackup(iso, agora) {
  if (!iso) return 'Você ainda não guardou nenhuma cópia.';

  const dias = diasEntre(iso, agora);
  if (dias === null) return 'Você ainda não guardou nenhuma cópia.';

  // Data no futuro significa relógio mexido, não cópia futura. Tratar como hoje
  // é benigno; dizer "nunca guardou" para quem acabou de guardar, não.
  if (dias <= 0) return 'Última cópia: hoje.';
  if (dias === 1) return 'Última cópia: ontem.';
  return `Última cópia: há ${dias} dias.`;
}
