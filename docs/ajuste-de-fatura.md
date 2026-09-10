# Ajuste de fatura — o total informado passa a somar

> Plano do bloco. Escrito antes do código, como manda o `CLAUDE.md`. O que está
> aqui foi decidido; o que fica de fora está na última seção, com o porquê.

## O problema

Hoje o valor informado da fatura **substitui** a soma das compras, em vez de
conviver com ela. Quem informa R$ 3.562,52 e depois anota uma compra de R$ 50
continua vendo R$ 3.562,52: a compra nova é ignorada em silêncio, que é o pior
jeito de um app de dinheiro errar.

O cenário que quebra é o de entrada, e é o mais comum de todos:

> A pessoa cadastra o cartão no meio do ciclo, com uma fatura já em andamento e
> dezenas de lançamentos. Copiar cada um do aplicativo do banco é trabalho que
> ninguém faz. O que ela quer é dizer "está em R$ 3.562,52" uma vez, e daí para
> frente anotar só as compras novas.

A regra "o informado vence" atende a primeira metade e sabota a segunda.

## A decisão central

**O valor informado deixa de ser um campo à parte e passa a ser um lançamento no
cartão, chamado "Ajuste de fatura".** A fatura volta a ser *sempre* a soma dos
seus lançamentos — e a soma passa a incluir os ajustes.

Isso **remove** mecanismo em vez de acrescentar. Desaparecem:

- o mapa `faturas` no estado, e a `chaveDeFatura` que o indexava;
- a regra de precedência `informado ?? soma`;
- o botão "Voltar para a soma", que só existia para desfazer a precedência;
- a frase "Você anotou X em compras. Vale o valor que você informou.";
- os campos `informado` e `soma` da `Fatura`, que existiam para a tela poder
  mostrar a divergência entre as duas verdades.

Uma fonte de verdade só. O ajuste fica **visível na lista**, editável e
apagável como qualquer lançamento — e é isso que substitui o botão de desfazer:
não se remove um valor escondido, apaga-se uma linha que está à vista.

### O ajuste vale a DIFERENÇA, não o valor digitado

Decisão do Mário, e é o que faz o campo continuar significando o que ele diz.

O campo pergunta "quanto veio" — o número que a pessoa lê no aplicativo do
banco. Esse número **já inclui** as compras que ela por acaso tenha anotado. Se
o ajuste valesse o valor digitado, essas compras seriam contadas duas vezes:

| | |
|---|---|
| Compras já anotadas | R$ 8,72 (Uber trabalho) |
| A pessoa digita | R$ 3.562,52 |
| Ajuste criado | **R$ 3.553,80** |
| Fatura resultante | R$ 3.562,52 ✓ |

Compras posteriores somam por cima, que é o pedido. E ler o banco de novo mais
tarde e digitar o novo total fecha a nova diferença — o mecanismo **compõe
sozinho**, sem caso especial.

Uma propriedade que sai de graça e vale registrar: como nada distingue um ajuste
de uma compra no dado, informar um total novo calcula a diferença contra a soma
inteira, **ajustes anteriores incluídos**. É exatamente o certo, e é certo por
construção, não por código que se lembre disso.

### Cada informação cria uma linha nova

Decisão do Mário: "que fique registrado a ordem dos ajustes/lançamentos".

Informar um total pela segunda vez cria um segundo "Ajuste de fatura", em vez de
mexer no primeiro. A fatura fica com a trilha do que foi corrigido e quando —
e um ajuste errado se apaga, porque está na lista.

O custo é conhecido e aceito: quem reconcilia com o banco toda semana vai
acumular linhas de ajuste no mesmo ciclo. Se isso incomodar no uso, a saída é
juntar os ajustes na exibição, não impedir que eles existam no dado.

### O ajuste que subtrai é uma ENTRADA no cartão

Decisão do Mário: quando o total informado for menor que a soma — estorno, ou
uma compra anotada que o banco ainda não cobrou — o app cria um ajuste que
desconta.

Eu havia avisado que um lançamento de valor negativo quebraria uma invariante do
núcleo: **todo valor é positivo, e o `tipo` é que dá o sinal.** Dá para atender
a decisão sem quebrá-la, e é o que este plano faz — o ajuste que subtrai é um
lançamento de `tipo: 'entrada'` com `cartao` preenchido, valor positivo.

Consequências, todas verificadas contra o código atual:

- `comprasDaFatura` filtrava `tipo === 'saida'`; passa a aceitar os dois, e a
  soma da fatura vira **saídas menos entradas**.
- `lancamentosDaConta` filtra `!l.cartao`, então o ajuste-crédito **não** vira
  receita do mês. Nada a mudar.
- `gastosPorCategoria` filtra `tipo !== 'saida'`, então o ajuste-crédito fica
  fora do Relatório. Fica assim por ora: ele não tem categoria para reduzir, e
  inventar uma seria pior que a omissão. Vai para `pendencias.md`.
- O `conceito.md` listava "cartão como entrada (estorno)" entre o que ficou de
  fora do B6. Ele entra agora, mas numa versão estreita: **só o app cria** essas
  linhas. O campo "pago com" do formulário continua só em despesa.

## O que a tela passa a fazer

O campo continua na folha da fatura, com três mudanças:

1. **Vem preenchido com o total atual.** A pergunta é "quanto veio", e a
   resposta corrente é o total corrente. Digitar outro número ajusta para ele;
   digitar o mesmo não faz nada.
2. **Mostra o que vai acontecer, antes de acontecer.** Enquanto a pessoa digita,
   uma linha prevê o ajuste: *"Vai criar um ajuste de R$ 3.553,80."* — ou *"um
   crédito de R$ 12,00"* quando subtrai. Educar no contexto, e sem surpresa:
   o mecanismo aparece antes do toque, não depois.
3. **"Voltar para a soma" sai.** Não há mais um valor escondido para remover. O
   ajuste é uma linha, e se apaga como as outras.

O rótulo passa de "Quanto veio (opcional)" para **"Total da fatura"**, porque o
campo deixou de ser opcional-ou-não: ele sempre tem um valor, o atual.

## O modelo de dados

O esquema sobe para a **versão 7**. O `Estado` perde `faturas`; nada é
acrescentado.

O ajuste é um `Avulso` comum:

```js
{
  id, tipo: 'saida' | 'entrada', descricao: 'Ajuste de fatura',
  categoria: null, cartao: <id do cartão>, fixo: false,
  valor: <a diferença, sempre positiva>, data: <uma data dentro do ciclo>
}
```

Sem sinalizador que o marque como ajuste. É deliberado: nenhuma lógica precisa
reconhecê-lo, e é justamente por não haver marca que a propriedade da seção
anterior — informar um total novo mede a diferença contra tudo — vale por
construção.

A data vem de `dataPadraoDaFatura`, que já existe: hoje, quando hoje cai naquele
ciclo; senão o dia do fechamento. Assim o ajuste cai na fatura certa, e dois
ajustes no mesmo ciclo ficam em ordem cronológica pelo id, que começa com o
instante da criação.

**Migração da v6 para a v7**: cada entrada de `faturas` vira um "Ajuste de
fatura" com valor `informado − soma das compras daquele ciclo`, calculado na
travessia. Diferença zero não gera lançamento; diferença negativa gera a
entrada. O id é derivado do cartão e do mês, e não sorteado, para que uma
segunda leitura do mesmo dado não duplique o ajuste.

O que a migração precisa garantir, e o que os testes vão cobrar: **o valor de
toda fatura é o mesmo antes e depois.** Quem informou R$ 3.562,52 continua
vendo R$ 3.562,52 — a diferença é que agora dá para ver de onde ele vem.

## As funções do núcleo

| Função | O que muda |
|---|---|
| `ajusteDeFatura(estado, cartaoId, mes, total, id, hoje)` | **Nova.** Devolve o lançamento de ajuste, ou `null` quando a diferença é zero |
| `comprasDaFatura` | Aceita entrada e saída, para o ajuste-crédito entrar |
| `faturaDoMes` | Soma passa a ser saídas menos entradas; perde `informado` e `soma` |
| `definirValorDaFatura` | **Sai.** Não há mais mapa para escrever |
| `chaveDeFatura` | **Sai.** Não há mais mapa para indexar |
| `normalizarEstado` | Migra `faturas` para lançamentos; para de ler e gravar o mapa |

`resumoDoMes` e `emCartao` não mudam: eles somam o `valor` da fatura, que
continua existindo.

## O que fica de fora

- **Juntar os ajustes na exibição.** Só faz sentido depois de alguém reclamar de
  uma pilha deles, e a decisão de "linha nova a cada ajuste" é justamente para
  que a pilha seja possível. Se virar problema, é problema de tela.
- **Estorno como lançamento do usuário.** O app cria ajustes-crédito; a pessoa
  não pode criar um crédito no cartão pelo formulário. O `conceito.md` deixou
  isso de fora do B6 por ser raro, e continua raro — o que mudou é que o
  *ajuste* precisava do mecanismo.
- **O ajuste-crédito no Relatório.** Ver a lista de consequências acima.
- **Parcelamento**, que segue sendo bloco próprio.
