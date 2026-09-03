# A mescla com o MVP

O Mário tinha um MVP funcionando antes de o Zenny existir: um "livro-caixa"
mensal em arquivo único, com entradas e despesas, avulsas e fixas, e um balanço
do planejado contra o realizado. Este documento cruza aquele MVP com o
[conceito.md](conceito.md) escrito aqui, decide o que atravessa para o Zenny e —
o que importa mais — registra o que **não** atravessa, e por quê.

> O arquivo do MVP não está no repositório de propósito: ele traz o salário real
> do Mário embutido como dado semente, e este repositório é público.

## A descoberta central: eram dois produtos diferentes

Vale começar pelo desconforto. O `conceito.md` descrevia um **diário**: registre
um gasto, veja para onde o dinheiro foi. Olha para trás. O MVP é um
**planejador**: monte o mês, e vá marcando o que já entrou e o que já saiu. Olha
para a frente.

São produtos diferentes, com telas diferentes e promessas diferentes. E o
planejador é o certo — por três razões:

1. **É o que o briefing pediu.** "Incentivando planejamento financeiro" estava lá
   desde a primeira frase. O diário responde "para onde foi?"; só o planejador
   responde "dá para chegar no fim do mês?", que é a pergunta que tira o sono.
2. **Exige menos do usuário, não mais.** O diário cobra disciplina diária: se
   você parar de registrar por cinco dias, os dados apodrecem e o app vira uma
   acusação. O planejador com lançamentos fixos funciona sozinho: você cadastra
   salário e aluguel uma vez, e o mês seguinte já nasce montado.
3. **Entrega o número que o Zenny promete.** "O que sobrou este mês" é uma conta
   de entradas menos saídas. Sem receita no modelo, aquele número da tela de
   Início é impossível — e ele é o herói da promessa dos 30 segundos.

O [conceito.md](conceito.md) foi corrigido para refletir isso. Não é ajuste de
rota: é o produto encontrando o próprio nome.

## O que atravessa do MVP

**1. O mês como espinha do app.** O MVP navega por mês (setembro, com seta para
o anterior e para o próximo, botão "Hoje", e deslizar para o lado no celular).
Isso não era um detalhe de navegação — é a unidade de tempo em que a vida
financeira desse público acontece: salário no dia 5, aluguel no 10, cartão no
15. O Zenny adota o mês como cursor global.

**2. Entradas, não só saídas.** O roteiro antigo começava por "registrar um
gasto" e só via receita muito depois. Estava errado: sem entrada não existe
sobra, e sem sobra a tela de Início é uma casca.

**3. Lançamentos fixos.** A peça mais valiosa do MVP, e a que faltava por
inteiro no planejamento. Salário, aluguel, assinatura, academia — a maior parte
do dinheiro de alguém de 25 anos é previsível. Cadastrar uma vez e o app
trabalhar sozinho é o que faz a promessa de "sem fricção" continuar verdadeira
no mês 2, no mês 6 e no mês 12.

**4. Planejado contra realizado.** Cada lançamento tem um estado: já recebi / já
paguei. O painel mostra as duas barras — o tom cheio é o que já aconteceu, o
claro é o que ainda vai acontecer. Essa distinção é o que transforma uma lista
em um plano, e ela não existia em lugar nenhum do nosso planejamento.

**5. As três semânticas de excluir um fixo.** "Só neste mês", "deste mês em
diante", "de todos os meses". Parece detalhe; é o problema mais difícil de
recorrência, e o MVP já o resolveu bem. Herdamos a solução em vez de
redescobrir.

**6. Backup e restauração.** Estavam no fim do roteiro (B6). Sobem: quando o
usuário investe dez minutos cadastrando os fixos, limpar os dados do navegador
passa a ter custo real. Rede de segurança não pode ser a última coisa a chegar.

**7. Um punhado de micro-decisões de celular** que custaram tempo para acertar e
não devem ser redescobertas — estão listadas no fim deste documento.

## O que fica de fora, e por quê

**A linguagem contábil.** "Livro-caixa", "lançamento", "lançar". O MVP fala como
um contador. O princípio 2 do projeto proíbe isso na interface. No Zenny é
"adicionar", e as coisas "entram" e "saem". A palavra "lançamento" pode viver no
código; na tela, não.

**As duas colunas de Entradas e Despesas lado a lado.** *(Qualificado no B2:
os grupos voltaram, mas empilhados no celular; lado a lado só a partir de
768px.)* É a forma de uma
planilha, e ela carrega tudo que o público-alvo teme. O princípio de "uma
pergunta por tela" pede o contrário: a tela de Início responde "como está o
mês?" com um número e duas barras; a lista detalhada é outra tela, para quem
quiser descer ao detalhe.

**A tipografia.** O MVP baixa duas famílias do Google Fonts. Já decidimos por
pilha do sistema, pelo custo de primeira pintura em Android de entrada (ver
[b0-esqueleto.md](b0-esqueleto.md), decisão 2). Mantido.

**A paleta e a ausência de tema escuro.** O MVP tem uma paleta parecida em
espírito com a do Zenny — papel quente, tinta escura, verde para entrada, vinho
para saída — mas só clara. A identidade visual do Zenny fica como está: areia
`#F6F4EF`, tinta `#14181C`, verde `#2E9E70` / `#46C489`, coral `#D9603C` /
`#E8845F`, nos dois temas.

**O `window.storage`.** Chamada a uma API de hospedagem específica que não existe
no Zenny. Só `localStorage`, dentro de `try/catch`.

**O `confirm()` do "Apagar tudo".** Além de destoar do resto, é traiçoeiro: no
Daysk um `confirm()` suprimido pelo navegador fez um botão parar de funcionar
sem qualquer sinal (commit `a2092f6`). Confirmação destrutiva no Zenny é diálogo
próprio.

**O dado semente.** O MVP nasce com um salário real cadastrado. O Zenny nasce
vazio, com estado vazio que ensina.

## As três tensões que a mescla cria

Herdar o planejador não sai de graça. Três conflitos com o que já estava
escrito, e como ficam resolvidos:

### 1. "Sem configuração" contra "cadastre seus fixos"

A promessa era valor em 30 segundos sem configurar nada. Um planejador precisa
saber quanto entra e quanto sai fixo — isso é configuração, e é justamente o
pedágio que o conceito acusava os concorrentes de cobrar.

*Resolução*: o pedágio não é a quantidade de cadastro, é **quando chega o
primeiro retorno**. Cadastrar o salário — um nome e um valor — já faz aparecer
"sobra R$ X este mês". O retorno vem no lançamento número 1, não no fim de um
formulário de onboarding. Portanto: nada de tela de configuração inicial. O
primeiro fixo se cadastra pelo mesmo botão de sempre, a partir do estado vazio.

### 2. "Três toques" contra o formulário de cinco campos

O MVP pede descrição, valor, repetição, data e a marcação de já pago. São cinco.

*Resolução*: dois campos visíveis (o que é, quanto é) e o resto com padrão
inteligente — avulso, data de hoje, não pago. Repetição e data ficam atrás de um
"mais opções". Quem cadastra um fixo aceita o toque extra; quem registra o café
de hoje não paga por isso.

### 3. Categorias contra a ausência delas

O conceito dizia "valor, categoria, pronto". O MVP não tem categoria nenhuma —
só descrição em texto livre — e funciona.

*Resolução*: o MVP tem razão, e o conceito estava errado. Categoria é uma
taxonomia para o usuário aprender antes de conseguir usar o app: exatamente a
barreira que o Zenny existe para remover. Descrição livre no começo; categoria
entra depois, opcional, e de preferência sugerida pelo próprio texto ("mercado",
"uber") em vez de escolhida numa lista.

## O modelo de dados herdado

O MVP resolveu bem, e o Zenny mantém a forma, adaptando os nomes ao português e
à regra de chave raiz única com versão de esquema:

- Um lançamento **avulso** guarda a data completa.
- Um lançamento **fixo** guarda o dia do mês, o mês de início, um fim opcional e
  uma lista de meses pulados. Um mês "vê" o fixo se está dentro da janela e não
  foi pulado.
- O dia é limitado ao tamanho do mês (`min(dia, diasNoMes)`), senão o aluguel do
  dia 31 desaparece em fevereiro.
- O estado de pago vive num mapa separado, com chave `id do lançamento + mês`.
  Isso é sutil e é certo: o mesmo aluguel fixo está pago em setembro e não em
  outubro.

Duas limitações conhecidas do modelo, herdadas junto, ficam registradas:

1. **Editar um fixo reescreve o passado.** Se o salário aumenta e o usuário edita
   o valor, os meses anteriores passam a mostrar o valor novo. Não há histórico.
   Provavelmente aceitável no começo; vira problema quando alguém quiser
   comparar meses.
2. **O mapa de pagos cresce sem limpeza.** Excluir um fixo remove suas chaves,
   mas pular um mês e outros caminhos deixam restos. Não quebra nada, só cresce.

Ambas estão em [pendencias.md](pendencias.md).

## Roteiro revisado

| Bloco | O quê | Situação |
|---|---|---|
| B0 | Esqueleto: navegação, tema, PWA instalável | Na `main` (PR #1) |
| B1 | O mês e o primeiro lançamento: entradas e saídas avulsas, com o número da sobra | A planejar |
| B2 | Lançamentos fixos, com as três semânticas de exclusão | A planejar |
| B3 | Planejado × realizado: marcar recebi/paguei, e as barras do painel | A planejar |
| B4 | Backup: baixar e restaurar | A planejar |
| B5 | Categorias sugeridas e limites por categoria | A planejar |
| B6 | Metas: guardar para alguma coisa | A planejar |
| B7 | Educação no contexto | A planejar |

O que mudou em relação ao roteiro anterior: entradas e o mês entram já no B1;
fixos e planejado × realizado passam a existir; backup sobe de B6 para B4;
categorias descem e deixam de ser obrigatórias.

> **Esta tabela é o roteiro daquele momento, e ficou para trás.** Na
> implementação, o B2 e o B3 acima foram fundidos num bloco só, um novo B3
> apareceu (o valor do fixo com data) e o backup absorveu as configurações. O
> roteiro que vale está em [conceito.md](conceito.md#roteiro-proposto); esta
> tabela fica como registro do que se pensava aqui.

## Detalhes de implementação a não perder

O MVP acertou coisas pequenas que custam tempo para descobrir. Ficam anotadas
para os blocos que vierem:

| Detalhe | Por quê |
|---|---|
| `font-size: 16px` nos campos | Abaixo disso o iOS dá zoom sozinho ao focar o campo |
| `type="text"` + `inputmode="decimal"` no valor | Teclado numérico sem a validação hostil do `type="number"` |
| Interpretar "1.234,56" e "1234.56" | O usuário digita como quiser; o app que se vire |
| `Intl.NumberFormat('pt-BR')` e `font-variant-numeric: tabular-nums` | Dinheiro alinhado em coluna, sem dança de largura |
| `navigator.vibrate(8)` ao marcar como pago | Confirmação tátil, custo zero |
| Deslizar para o lado troca o mês | O gesto que o polegar já espera |
| `<dialog>` nativo: folha por baixo no celular, modal no centro no desktop | Sem biblioteca, com foco e `Esc` de graça |
| `enterkeyhint` nos campos | A tecla do teclado virtual passa a dizer "próximo" ou "concluir" |
| Estado vazio com exemplos ("salário, freela, reembolso") | Ensina o formato sem tutorial |
