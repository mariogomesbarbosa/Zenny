# B6 — Cartões de crédito

> Plano do bloco. Escrito antes do código, como manda o `CLAUDE.md`. O que está
> aqui foi decidido; o que ficou de fora está na última seção, com o porquê.

## Por que este bloco, e não as metas

O roteiro do [conceito](conceito.md) tinha **B6 — guardar para algo (metas)**
neste lugar. O Mário trocou, e a troca se defende sozinha: o cartão de crédito
é a dor real de quem tem 20 e poucos anos e renda apertada. A meta é aspiração;
a fatura é o que chega.

As metas não morreram — saíram da aba e voltam ao roteiro mais para a frente.
O que elas perdem é a vaga no menu, que passa a ser dos cartões.

## O problema que o bloco resolve

Hoje o Zenny responde "dá para chegar no fim do mês?" olhando só para o que
entra e o que sai da conta. O cartão fura isso de dois jeitos:

1. **A fatura é a maior despesa do mês e não está no app.** Quem não a cadastra
   como fixo vê uma sobra que não existe.
2. **O que você compra hoje não sai da conta hoje.** Uma compra de setembro só
   vira dinheiro perdido em outubro. Um app que trate a compra como saída
   imediata mente sobre setembro *e* sobre outubro.

## As decisões

### 1. O diário é opcional — os dois caminhos convivem

Esta foi a decisão do Mário, e ela é melhor que as três opções que a
precederam. Há **duas formas de a fatura ter valor**, e a pessoa escolhe sem
configurar nada:

- **Anotando as compras.** Cada saída pode dizer em que cartão foi paga. A
  fatura é a soma delas.
- **Informando o total.** Um campo na fatura: "veio R$ 847,20". Para quem não
  quer alimentar o app todo dia.

Isso resolve uma tensão real com o conceito. O `conceito.md` diz que o Zenny é
*planejador, não diário* — "um diário exige registro diário e apodrece na
primeira semana em que a pessoa esquece". Se anotar cada compra fosse a **única**
forma de a fatura existir, o bloco contrariaria a régua do projeto. Sendo
opcional, não contraria: quem esquece de anotar informa o total e segue com o
app funcionando.

**Quando os dois existem, o valor informado vence.** Sempre, sem exceção e sem
mágica. Se você anotou R$ 300 em compras e digitou R$ 847,20, a fatura é
R$ 847,20 — a fatura real sabe de coisas que o app não sabe (anuidade, juros, a
compra que você esqueceu). O app mostra a diferença sem julgar:

> Você anotou R$ 300,00 em compras. A fatura veio R$ 847,20.

Não é erro, é informação. E o valor informado **não se apaga sozinho** quando
uma compra nova é anotada: mudar o número que a pessoa digitou, sem ela pedir,
seria a pior surpresa possível num app de dinheiro.

### 2. A compra de um mês cai na fatura do mês seguinte

Esta é a decisão menos óbvia do bloco, e a que mais muda o comportamento.

Uma compra do dia 20 de setembro **não** pode entrar numa fatura que vence dia
10 de setembro — essa fatura já foi. Na vida real, a compra de setembro cai na
fatura que fecha no fim de setembro e vence em outubro. Então a regra é:

> Compra do mês **M** → fatura que vence no mês **M+1**.

É uma aproximação, e é honesta sobre isso: o certo mesmo depende da **data de
fechamento**, que este bloco não pede (ver "O que ficou de fora"). Para a
esmagadora maioria dos cartões e das compras, M+1 acerta.

**A consequência que precisa estar visível:** uma compra no cartão em setembro
não muda a sobra de setembro. O dinheiro não saiu da conta. Isso está certo — é
exatamente a razão de o bloco existir — mas surpreende quem não espera. Por
isso a compra não some: ela aparece na tela do cartão, dentro da fatura de
outubro, com o total correndo.

### 3. A fatura é derivada, nunca gravada

A fatura **não** vira um lançamento no estado. Ela é calculada na hora, a partir
do cartão, das compras e do valor informado.

O motivo é dívida evitada: fatura gravada é uma segunda cópia da verdade. Bastaria
apagar uma compra, mudar o dia do vencimento ou editar um valor para as duas
discordarem — e a que estivesse errada seria a que a pessoa lê. Derivar sempre
custa alguns microssegundos e elimina a classe inteira de bugs.

O que **é** gravado: o cartão, o vínculo da compra com o cartão, e o valor
informado de cada mês.

### 4. A fatura entra como despesa planejada, no dia do vencimento

É o que o Mário pediu, e encaixa no que o app já faz: ela aparece na lista do
mês como qualquer outra saída, no dia do vencimento, contando como
**planejado**. Quando é paga, marca-se como paga — o mesmo gesto dos fixos, o
mesmo `realizados`.

Uma compra anotada no cartão sai do cálculo direto das despesas do mês. Se ela
contasse *e* a fatura contasse, o mês contaria duas vezes.

Para o Relatório ("para onde foi") a compra continua sendo uma compra, na
categoria dela, no mês em que aconteceu. Cartão é forma de pagamento, não
categoria: mercado é mercado, tenha saído do débito ou do crédito.

### 5. O limite mostra o quanto a fatura ocupa

Decisão do Mário. Barra na tela do cartão — "R$ 847,20 de R$ 3.000,00" —
reusando a barra que o B5 já construiu para os limites de categoria, inclusive o
`situacaoDoLimite` e o campo `excedente`.

Sem aviso ao se aproximar, sem vermelho, sem bronca: o conceito pede
"informação, não bronca", e uma barra cheia já diz o que precisa ser dito.

## O modelo de dados

O estado sobe para a **versão 5** do esquema, e ganha dois campos:

```js
/**
 * @typedef {object} Cartao
 * @property {string} id
 * @property {string} nome
 * @property {number} limite      Centavos. Zero é "não informou".
 * @property {number} vencimento  Dia do mês, 1–31.
 * @property {boolean} arquivado
 */

// No Estado:
//   cartoes: Cartao[]
//   faturas: Record<string, number>   chave "<cartaoId>|AAAA-MM" → centavos
```

E cada saída passa a poder apontar para um cartão:

```js
//   cartao: string|null   no Avulso e no Fixo
```

`cartao` é opcional no tipo e sempre preenchido por `normalizarEstado`, exatamente
como `categoria` já é — a mesma decisão, pelo mesmo motivo: o formulário não
precisa ter resposta pronta.

**Migração da versão 4 para a 5** é trivial de escrever e precisa de teste
mesmo assim: estado antigo não tem `cartoes` nem `faturas`, e nenhum lançamento
tem `cartao`. Todos viram lista vazia, objeto vazio e `null`.

Dois descartes que a normalização precisa fazer, na mesma linha do que ela já faz
com marcação órfã e limite de categoria que não existe mais:

- **compra apontando para cartão apagado** → `cartao` volta a `null`, e a compra
  reaparece como despesa comum do mês em que foi feita;
- **valor de fatura de cartão apagado** → sai.

E um cuidado que o código atual **não** tem e vai precisar: hoje a normalização
descarta toda chave de `realizados` cujo id não esteja em `lancamentos`. A fatura
paga usa o id sintético `fatura:<cartaoId>`, que nunca vai estar lá. Sem tratar
isso, **toda fatura marcada como paga seria esquecida no primeiro recarregamento**
— em silêncio, que é o pior jeito.

## As funções do núcleo

Todas puras, todas com teste, como manda o `CLAUDE.md` para qualquer coisa que
faça conta com dinheiro.

| Função | O que faz |
|---|---|
| `criarCartao(estado, nome, limite, vencimento)` | Valida e acrescenta |
| `alterarCartao(estado, id, campos)` | Nome, limite ou vencimento |
| `arquivarCartao(estado, id)` | Some da lista sem perder o histórico |
| `cartaoPorId(estado, id)` | |
| `mesDaFatura(data)` | A regra M+1, num lugar só |
| `faturaDoMes(estado, cartaoId, mes)` | O objeto `Fatura` completo |
| `faturasDoMes(estado, mes)` | Todas as faturas que vencem no mês |
| `definirValorDaFatura(faturas, cartaoId, mes, valor)` | Zero ou negativo remove o valor informado, como `definirLimite` já faz |
| `comprasDaFatura(estado, cartaoId, mes)` | As compras que caem nesta fatura |

E duas que mudam:

- `lancamentosDoMes` passa a **excluir** as compras marcadas com cartão;
- `resumoDoMes` passa a receber as faturas do mês e somá-las às despesas.

O `situacaoDoLimite` do B5 é reusado sem tocar.

## A tela

A aba **Metas** vira **Cartões**, com ícone de cartão. A navegação continua com
quatro itens — os 90px por aba que o PR anterior mediu seguem valendo.

Cada cartão é um bloco com nome, o dia do vencimento em português ("vence todo
dia 10"), a barra do limite e o valor da fatura do mês, com uma linha para o
total informado quando ele existir. Um toque abre a fatura: as compras anotadas,
o campo do valor informado, e o botão de marcar como paga.

O campo **"pago com"** entra no formulário de lançamento atrás de *mais opções*,
junto da data e da repetição — o princípio dos dois campos não abre exceção para
cartão. Só aparece em saídas, e só quando existe pelo menos um cartão: um campo
que só oferece "nenhum" é ruído.

## O que ficou de fora

- **Compra parcelada.** Decisão do Mário: fica para um bloco próprio. É a dor
  mais real do cartão depois da fatura, e cada pergunta que ela abre — juros?
  antecipar? o que acontece ao apagar a terceira de seis? — merece plano em vez
  de improviso.
- **Data de fechamento.** Seria um terceiro campo na criação, contra o princípio
  dos dois campos, e a regra M+1 acerta na maioria dos casos. É a evolução
  natural quando alguém reclamar de uma compra caindo no mês errado — e é
  compatível com o que este bloco grava, então chega sem migração.
- **Juros, anuidade, IOF, multa.** O app não tem como saber. O valor informado
  cobre todos eles de uma vez, que é o motivo de ele vencer sobre a soma.
- **Aviso ao se aproximar do limite.** Recusado na decisão 5: barra cheia já
  informa, e o conceito pede aliado, não fiscal.
- **Cartão como entrada.** Estorno e pagamento de fatura por outra pessoa
  existem, mas são raros o bastante para não pagarem a complexidade agora.
