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
  resumoDoMes,
  proporcoesDasBarras,
  excluirLancamento,
  pularMes,
  encerrarFixo,
  montarBackup,
  nomeDoArquivo,
  lerBackup,
  textoDoUltimoBackup,
} from './nucleo.js';

const TELAS = ['inicio', 'metas', 'ajustes'];
const TELA_PADRAO = 'inicio';
const CHAVE_TEMA = 'zenny-tema';

/* Fora do estado, de propósito. Se a data da última cópia morasse dentro do
   estado, ela entraria no próprio arquivo de backup — e restaurar num celular
   novo faria ele herdar a data do celular velho, afirmando uma cópia que
   aquele aparelho nunca teve. Aqui, aparelho novo diz "nunca", que é a
   verdade. Pela mesma razão o tema também vive fora. */
const CHAVE_BACKUP = 'zenny-backup';

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
  desenharAjustes();
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

  // O CSS precisa saber qual tela está aberta: nos Ajustes o botão flutuante
  // some, por não ter o que fazer lá.
  document.body.dataset.tela = nome;

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

/* O tema tem dois controles: o atalho no cabeçalho, que é o gesto de impulso
   ("está claro demais agora"), e o alternador dos Ajustes, que é onde a pessoa
   vai procurar quando procura. Dois controles para o mesmo estado só não viram
   dessincronia porque um lugar só escreve o tema e um lugar só redesenha os
   dois. */
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
for (const id of ['dialogo', 'dialogo-exclusao', 'dialogo-valor', 'dialogo-restaurar', 'dialogo-apagar']) {
  $(id).addEventListener('click', (evento) => {
    if (evento.target === $(id)) {
      if (id === 'dialogo-exclusao') pendenteDeExclusao = null;
      if (id === 'dialogo-valor') pendenteDeValor = null;
      if (id === 'dialogo-restaurar') pendenteDeRestauracao = null;
      $(id).close();
    }
  });
}

/* Guarda o que o formulário coletou enquanto o diálogo pergunta a partir de
   quando o valor novo vale. */
let pendenteDeValor = null;

/* Monta a linha do tempo de valores do fixo.
 *
 * `modo` só importa quando se está editando um fixo que já existia:
 *   'daqui'      — o valor novo vale deste mês em diante, e o passado fica
 *   'sempre'     — corrige todos os meses (o caso do erro de digitação)
 *   'inalterado' — o valor não mudou, então a linha do tempo não se mexe */
function linhaDoTempoDoFixo(valor, inicio, modo) {
  const eraFixo = editando && editando.fixo;
  if (!eraFixo) return [{ desde: inicio, valor }];
  if (modo === 'sempre') return definirValorSempre(valor, inicio);
  if (modo === 'daqui') return definirValorDesde(editando.valores, mesVisivel, valor);
  return editando.valores;
}

function aplicarAlteracao({ descricao, valor, ehFixa, data, dia, jaAconteceu }, modo) {
  const eraFixo = editando && editando.fixo;
  const base = { id: editando ? editando.id : novoId(), tipo: tipoDoFormulario, descricao };

  let novo;
  if (ehFixa) {
    // Virar fixo a partir de um avulso começa no mês visível; um fixo que já
    // era fixo mantém a própria janela, senão editar o valor reviveria meses
    // que o usuário já tinha encerrado.
    const inicio = eraFixo ? editando.inicio : mesVisivel;
    novo = {
      ...base,
      fixo: true,
      dia: limitarDia(dia),
      inicio,
      fim: eraFixo ? editando.fim : null,
      pulados: eraFixo ? editando.pulados : [],
      valores: linhaDoTempoDoFixo(valor, inicio, modo),
    };
  } else {
    novo = { ...base, fixo: false, valor, data };
  }

  const lancamentos = editando
    ? estado.lancamentos.map((l) => (l.id === novo.id ? novo : l))
    : [...estado.lancamentos, novo];

  // Se a data cai em outro mês, vai junto — senão o registro some na cara de
  // quem acabou de criá-lo.
  const mesDoRegistro = novo.fixo ? mesVisivel : mesDe(novo.data);

  const realizados = jaAconteceu
    ? { ...estado.realizados, [novo.id + '|' + mesDoRegistro]: true }
    : limparRealizadosDe(estado.realizados, novo.id, mesDoRegistro);

  estado = { ...estado, lancamentos, realizados };
  mesVisivel = mesDoRegistro;

  editando = null;
  salvar();
}

$('formulario').addEventListener('submit', (evento) => {
  evento.preventDefault();

  const alteracao = {
    descricao: $('campo-descricao').value.trim(),
    valor: analisarValor($('campo-valor').value),
    ehFixa: $('campo-repeticao').value === 'fixa',
    data: $('campo-data').value || hojeISO(),
    dia: $('campo-dia').value,
    jaAconteceu: $('campo-realizado').checked,
  };

  if (!alteracao.descricao) return mostrarErro('Falta dizer o que é.', $('campo-descricao'));
  if (alteracao.valor <= 0) return mostrarErro('Falta o valor.', $('campo-valor'));

  /* A pergunta só aparece quando o VALOR de um fixo que já existia muda. Mudar
     a descrição ou o dia vale para todos os meses sem perguntar: nenhum dos
     dois reescreve dinheiro, e uma pergunta que aparece à toa vira uma pergunta
     que ninguém lê. */
  const eraFixo = editando && editando.fixo;
  const valorAnterior = eraFixo ? valorVigenteEm(editando.valores, mesVisivel) : null;

  if (eraFixo && alteracao.ehFixa && alteracao.valor !== valorAnterior) {
    pendenteDeValor = alteracao;
    $('explicacao-do-valor').textContent =
      `Este lançamento se repete todo mês, e valia ${formatarDinheiro(valorAnterior)}. ` +
      `A partir de quando vale ${formatarDinheiro(alteracao.valor)}?`;
    $('dialogo').close();
    $('dialogo-valor').showModal();
    return;
  }

  $('dialogo').close();
  aplicarAlteracao(alteracao, 'inalterado');
});

function concluirMudancaDeValor(modo, texto) {
  if (!pendenteDeValor) return;
  const anterior = instantaneo();
  const alteracao = pendenteDeValor;
  pendenteDeValor = null;
  $('dialogo-valor').close();
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
  $('dialogo-valor').close();
  if (pendenteDeValor) {
    pendenteDeValor = null;
    $('dialogo').showModal();
  }
});

$('botao-excluir').addEventListener('click', () => {
  const alvo = editando;
  if (!alvo) return;
  $('dialogo').close();
  pedirExclusao(alvo);
});

/* ---------- Ajustes: a cópia, o tema e o apagar tudo ---------- */

let pendenteDeRestauracao = null;

function desenharAjustes() {
  $('estado-do-backup').textContent = textoDoUltimoBackup(
    armazenamento.ler(CHAVE_BACKUP),
    new Date()
  );
}

function registrarBackup(quando) {
  armazenamento.gravar(CHAVE_BACKUP, quando.toISOString());
  desenharAjustes();
}

/* Baixar é a reserva de quem não tem o menu de compartilhar.
 *
 * O objeto de URL não é revogado na hora: em alguns navegadores isso cancela o
 * download que acabou de começar. Um minuto é folga de sobra, e o objeto morre
 * junto com a aba de qualquer jeito. */
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

  if (podeCompartilhar) {
    try {
      await navigator.share({ files: [arquivo], title: 'Cópia do Zenny' });
      registrarBackup(agora);
      avisar('Cópia guardada.');
      return true;
    } catch (e) {
      /* Fechar o menu de compartilhar lança AbortError, e desistir não é erro:
         cair para o download aqui baixaria justamente o arquivo que a pessoa
         acabou de recusar. Qualquer outra falha, sim, merece a reserva. */
      if (e && e.name === 'AbortError') return false;
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

/* Descreve o arquivo para a pessoa reconhecê-lo ANTES de trocar o que está no
   aparelho por ele. É metade do que torna "substituir tudo" aceitável — a outra
   metade é o desfazer. */
function explicarRestauracao(lido) {
  const { total, primeiroMes, ultimoMes } = lido.resumo;

  const partes = [];

  if (total === 0) {
    partes.push('Esta cópia está vazia: não tem nenhum lançamento.');
  } else {
    const quantos = total === 1 ? '1 lançamento' : `${total} lançamentos`;
    const periodo =
      primeiroMes === ultimoMes
        ? ` de ${rotuloDoMes(primeiroMes)}`
        : `, de ${rotuloDoMes(primeiroMes)} a ${rotuloDoMes(ultimoMes)}`;
    partes.push(`A cópia tem ${quantos}${periodo}.`);
  }

  const aqui = estado.lancamentos.length;
  if (aqui > 0) {
    partes.push(
      aqui === 1
        ? 'O lançamento que está neste aparelho sai no lugar.'
        : `Os ${aqui} lançamentos que estão neste aparelho saem no lugar.`
    );
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

async function arquivoEscolhido(evento) {
  const arquivo = evento.target.files && evento.target.files[0];
  // Zerar permite escolher o MESMO arquivo de novo: sem isto, o segundo change
  // não dispara e o botão parece quebrado.
  evento.target.value = '';
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
  $('dialogo-restaurar').showModal();
}

$('botao-guardar').addEventListener('click', guardarCopia);
$('botao-trazer').addEventListener('click', () => $('arquivo-do-backup').click());
$('arquivo-do-backup').addEventListener('change', arquivoEscolhido);

$('restaurar-confirmar').addEventListener('click', () => {
  const lido = pendenteDeRestauracao;
  pendenteDeRestauracao = null;
  $('dialogo-restaurar').close();
  if (!lido) return;

  const anterior = instantaneo();
  const mesAnterior = mesVisivel;
  estado = { ...estado, lancamentos: lido.estado.lancamentos, realizados: lido.estado.realizados };

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
  $('dialogo-restaurar').close();
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
  $('dialogo-apagar').showModal();
}

$('botao-apagar').addEventListener('click', pedirApagamento);
$('apagar-cancelar').addEventListener('click', () => $('dialogo-apagar').close());

/* A fricção certa não é dificultar o gesto, é resolver o arrependimento antes
   dele acontecer. Guardar a cópia deixa o diálogo aberto de propósito: a pessoa
   veio aqui para apagar, e ainda vai querer apagar depois de guardar.
 *
 * A resposta vem no próprio botão, e não pelo aviso de sempre: um <dialog>
 * modal vive na top layer, e o aviso apareceria atrás dele. Um clique sem
 * resposta visível, na tela em que a pessoa está prestes a apagar tudo, é o
 * pior lugar do app para deixar alguém em dúvida. */
$('apagar-guardar-antes').addEventListener('click', async (evento) => {
  const botao = evento.currentTarget;
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
  $('dialogo-apagar').close();

  const lancamentos = estado.lancamentos;
  const realizados = estado.realizados;
  // A data da última cópia vai junto: ela é um fato deste aparelho, e o aparelho
  // acabou de ser esvaziado. O tema fica, porque é preferência, não dado.
  const ultimoBackup = armazenamento.ler(CHAVE_BACKUP);

  estado = estadoVazio();
  armazenamento.gravar(CHAVE_BACKUP, '');
  salvar();

  avisar('Tudo apagado.', () => {
    estado = { ...estado, lancamentos, realizados };
    if (ultimoBackup) armazenamento.gravar(CHAVE_BACKUP, ultimoBackup);
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
sincronizarTema();
mostrarTela(telaDaUrl());
desenhar();
