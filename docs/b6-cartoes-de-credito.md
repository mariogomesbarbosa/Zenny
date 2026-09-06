# B6 — Cartões de crédito

> Plano do bloco. Escrito antes do código, como manda o `CLAUDE.md`. O que está
> aqui foi decidido; o que ficou de fora está na última seção, com o porquê.
>
> **Segunda versão.** A primeira foi implementada e revista pelo Mário antes do
> merge. A seção [O que a primeira versão errou](#o-que-a-primeira-versão-errou)
> guarda o que mudou e por quê — em vez de reescrever o documento como se ele
> sempre tivesse dito isto.

## Por que este bloco, e não as metas

O roteiro do [conceito](conceito.md) tinha **B6 — guardar para algo (metas)**
neste lugar. O Mário trocou, e a troca se defende sozinha: o cartão de crédito
é a dor real de quem tem 20 e poucos anos e renda apertada. A meta é aspiração;
a fatura é o que chega.

As metas não morreram — saíram da aba e voltam ao roteiro como B7.

## O problema que o bloco resolve

Hoje o Zenny responde "dá para chegar no fim do mês?" olhando só o que entra e
o que sai da conta. O cartão fura isso de três jeitos:

1. **A fatura é a maior despesa do mês e não está no app.** Quem não a cadastra
   como fixo vê uma sobra que não existe.
2. **O que você compra hoje não sai da conta hoje.** Uma compra de setembro só
   vira dinheiro perdido em outubro. Um app que trate a compra como saída
   imediata mente sobre setembro *e* sobre outubro.
3. **A fatura é uma caixa-preta.** Saber que ela vai custar R$ 800 não é a
   mesma coisa que saber *do que* ela é feita — e é a segunda que permite
   decidir o que cortar.

## O que a primeira versão errou

Três coisas, e a primeira é um defeito de verdade:

**A compra no cartão ficava inalcançável depois de criada.** Ela saía da lista
do mês (correto: não mexe na conta naquele mês) e a folha da fatura só a
escrevia como texto, sem botão. Resultado: não havia como editar nem excluir
uma compra, em lugar nenhum do app. Um valor digitado errado ficava errado para
sempre — e cada nova tentativa de corrigir criava uma segunda compra, inflando
a fatura. Nenhuma das 33 conferências pegou isso, porque todas exercitavam
*criar*, e nenhuma tentava voltar.

**A fatura não tinha data de fechamento**, e a regra "compra do mês M cai na
fatura M+1" era a aproximação que substituía. Ela é boa o bastante quando a
fatura é um número; deixa de ser quando a pessoa gerencia compras *dentro* de
uma fatura — abrir a fatura de outubro, lançar uma compra e vê-la sumir para
novembro é comportamento que não se explica.

**O resumo não separava o cartão.** A fatura entrava em "Despesas" como
qualquer outra, e a pergunta "quanto do meu mês é cartão?" não tinha resposta
na tela que existe para responder perguntas sobre o mês.

## As decisões

### 1. O diário é opcional — os dois caminhos convivem

Mantida da primeira versão. Há **duas formas de a fatura ter valor**, e a
pessoa escolhe sem configurar nada:

- **Anotando as compras.** Cada saída pode dizer em que cartão foi paga.
- **Informando o total.** Um campo na fatura: "veio R$ 847,20".

Isso resolve uma tensão real com o conceito, que diz que o Zenny é *planejador,
não diário* — "um diário exige registro diário e apodrece na primeira semana em
que a pessoa esquece". Se anotar cada compra fosse a **única** forma de a fatura
existir, o bloco contrariaria a régua do projeto. Sendo opcional, não contraria.

**Quando os dois existem, o valor informado vence.** Sempre. A fatura real sabe
de coisas que o app não sabe — anuidade, juros, a compra esquecida — e o número
que a pessoa leu no banco vale mais que a nossa soma. O app mostra a diferença
sem julgar, e **não apaga o número dela** quando uma compra nova é anotada.

### 2. Cada cartão tem seus lançamentos, e eles se editam e se apagam

A correção do defeito acima. A compra no cartão é um lançamento como qualquer
outro — mesma estrutura, mesmo `id`, mesma categoria — e ganha as duas portas
que faltavam:

- **Dentro da fatura**, cada compra é uma linha tocável: toque abre para editar,
  o X apaga. As mesmas ações da lista do mês, no lugar onde a compra mora.
- **Pelo formulário de despesa**, escolhendo o cartão em "pago com", como já era.

Adicionar também ganha duas portas: o formulário de despesa, e um botão dentro
da própria fatura.

### 3. A compra criada dentro de uma fatura nasce naquela fatura

Decisão do Mário. Você está vendo a fatura de outubro e toca em adicionar: a
compra entra **nessa** fatura. Lançar onde se está olhando é o que qualquer um
espera, e o contrário — a compra saltar para outra fatura no instante seguinte
ao toque — é a confusão que a decisão 4 da primeira versão criava.

A data vem preenchida e **visível**, e pode ser corrigida. Ela é hoje quando
hoje cai naquela fatura; senão, é o dia do fechamento daquele ciclo. Assim o
padrão é o mais provável e nada é escondido.

### 4. A fatura tem data de fechamento

Decisão do Mário, e é ela que torna a decisão 3 coerente: sem fechamento,
"esta fatura" não tem definição exata, e "a compra cai nesta fatura" não tem
como ser verdade.

O cartão passa a ter **fecha dia F** e **vence dia V**. A regra:

> Uma compra do dia `d` fecha no dia `F` do próprio mês se `d ≤ F`; senão, no
> `F` do mês seguinte. A fatura que fecha num mês vence **nesse mesmo mês**
> quando `F < V`, e no **mês seguinte** quando `F ≥ V`.

Isso cobre os dois formatos reais sem caso especial:

| Cartão | Compra | Fecha | Vence |
|---|---|---|---|
| fecha 30, vence 10 | 15/09 | 30/09 | 10/10 |
| fecha 30, vence 10 | 01/10 | 30/10 | 10/11 |
| fecha 3, vence 10 | 02/09 | 03/09 | 10/09 |
| fecha 3, vence 10 | 05/09 | 03/10 | 10/10 |

Um fechamento dia 31 num mês de 30 dias vira dia 30 — a mesma limitação que o
vencimento já sofre.

**É o terceiro campo na criação**, contra o princípio dos dois campos, e a troca
é consciente: sem ele o bloco inteiro fica sem chão. O campo tem valor padrão e
fica ao lado do vencimento, então o custo real é ler um número a mais, não
decidir um a mais.

### 5. O resumo ganha uma linha, não um bloco

Decisão do Mário, entre três opções. **Despesas continua sendo tudo que sai da
conta** — nenhuma palavra muda de sentido — e embaixo dela aparece uma linha
discreta:

> R$ 250,00 são de fatura de cartão.

A alternativa era um terceiro bloco ao lado de Receitas e Despesas. Ela foi
recusada por um motivo que vale registrar: "Despesas" passaria a significar "o
que sai fora do cartão", e quem já usa o app teria que reaprender uma palavra
que já sabia. Uma linha responde a mesma pergunta sem cobrar esse preço, e sem
densidade nova na primeira tela.

A linha **só aparece quando há fatura no mês**. Quem não tem cartão vê o painel
de hoje, sem uma linha zerada explicando algo que não existe.

### 6. A fatura é derivada, nunca gravada

Mantida. Fatura gravada é uma segunda cópia da verdade: bastaria apagar uma
compra, mudar o fechamento ou editar um valor para as duas discordarem — e a
que estivesse errada seria a que a pessoa lê. Derivar custa microssegundos e
elimina a classe inteira de bugs.

O que **é** gravado: o cartão, o vínculo da compra com o cartão, e o valor
informado de cada mês.

### 7. O limite mostra o quanto a fatura ocupa

Mantida. Barra na tela do cartão, reusando `situacaoDoLimite` e `excedente` do
B5. Sem aviso ao se aproximar: o conceito pede informação, não fiscal.

## O modelo de dados

O esquema sobe para a **versão 6**.

```js
/**
 * @typedef {object} Cartao
 * @property {string} id
 * @property {string} nome
 * @property {number} limite      Centavos. Zero é "não informou".
 * @property {number} fechamento  Dia do mês, 1–31.
 * @property {number} vencimento  Dia do mês, 1–31.
 * @property {boolean} arquivado
 */

// No Estado:
//   cartoes: Cartao[]
//   faturas: Record<string, number>   chave "<cartaoId>|AAAA-MM" → centavos
//
// Em cada lançamento:
//   cartao: string|null
```

**Migração da v5 para a v6**: o cartão antigo não tem `fechamento`, e ele nasce
**31**. Não é um valor bonito, e é o certo: `fechamento = 31` reproduz
exatamente a regra M+1 da primeira versão (toda compra do mês fecha no próprio
mês, e `F ≥ V` joga o vencimento para o seguinte). Nenhuma compra troca de
fatura na travessia — que é a única coisa que a migração precisa garantir.

Na prática ninguém tem dados na v5, porque a primeira versão nunca chegou à
`main`. O caminho existe mesmo assim: código de migração que só é escrito
quando dói é código que chega tarde.

## As funções do núcleo

Todas puras, todas com teste.

| Função | O que faz |
|---|---|
| `criarCartao`, `alterarCartao`, `arquivarCartao`, `cartaoPorId`, `cartoesAtivos` | O cadastro |
| `faturaDaCompra(cartao, data)` | **A regra da decisão 4**, num lugar só |
| `dataPadraoDaFatura(cartao, mes)` | Que data uma compra nova recebe (decisão 3) |
| `comprasDaFatura(estado, cartaoId, mes)` | As compras daquele ciclo |
| `faturaDoMes`, `faturasDoMes` | A fatura derivada |
| `definirValorDaFatura` | Zero ou negativo remove o valor informado |
| `lancamentosDaConta` | O mês menos as compras no cartão |
| `itensDoMes` | O que a lista do mês desenha |
| `resumoDoMes` | Ganha `emCartao`, para a linha da decisão 5 |

`comprasDaFatura` deixa de ser "as compras do mês anterior": com fechamento, o
ciclo atravessa dois meses do calendário. Ela varre a janela de meses que pode
conter o ciclo e filtra por `faturaDaCompra`, que continua sendo a única dona
da regra.

## A tela

**Cartões** (a aba que era Metas): cada cartão com o valor da fatura do mês, o
fechamento e o vencimento em português, e a barra do limite.

**A fatura**, ao tocar num cartão: as compras como linhas tocáveis — toque
edita, X apaga —, um botão de adicionar compra, o campo do total informado e o
botão de marcar como paga.

**O formulário de despesa** mantém o "pago com", visível só em despesas e só
quando existe cartão, com a dica que diz em que fatura a compra vai cair.

**O painel do Início** ganha a linha do cartão sob as Despesas.

## O que ficou de fora

- **Compra parcelada.** Decisão do Mário: bloco próprio. É a dor mais real do
  cartão depois da fatura, e cada pergunta que ela abre — juros? antecipar? o
  que acontece ao apagar a terceira de seis? — merece plano em vez de improviso.
- **Juros, anuidade, IOF, multa.** O app não tem como saber. O valor informado
  cobre todos de uma vez, que é o motivo de ele vencer sobre a soma.
- **Aviso ao se aproximar do limite.** Recusado na decisão 7.
- **Cartão como entrada** (estorno, pagamento por outra pessoa). Raro o
  bastante para não pagar a complexidade agora.
- **Desarquivar cartão.** Mesma lacuna da categoria oculta, e a mesma resposta:
  enquanto ninguém arquivar por engano, ela é barata. Fica em
  [pendencias.md](pendencias.md).
