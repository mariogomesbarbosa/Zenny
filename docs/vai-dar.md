# Vai dar? — o saldo real contra as contas que faltam

> Plano do bloco. Escrito antes do código, como manda o `CLAUDE.md`. O que está
> aqui foi decidido; o que fica de fora está na última seção, com o porquê.

## O problema

O Zenny é um planejador: a pessoa cadastra o que entra e o que sai, e marca o
que já aconteceu. O plano só é verdadeiro enquanto ela anota tudo. Basta
esquecer o mercado de uma semana para o app passar a acreditar num dinheiro que
não existe.

O momento em que isso dói é previsível, e é o mais importante do mês:

> O salário caiu. As contas estão chegando. A pessoa quer saber, de relance, se
> dá para pagar tudo e quanto sobra depois.

Hoje o painel do Início responde com "Na conta agora: R$ X". Esse número é um
**palpite** do app: o que foi marcado como recebido menos o que foi marcado
como pago (`naContaAgora`, no `resumoDoMes`). É exatamente o número que mente
quando a anotação falha.

## A decisão central

**Trocar o palpite pelo número real, sem pedir mais nada.**

A pessoa digita um valor só: quanto tem na conta agora, lido no aplicativo do
banco. O resto o app já sabe. As despesas do mês que ainda não foram marcadas
como pagas, faturas de cartão incluídas, são as contas que faltam, e elas
aparecem já preenchidas. A resposta é uma frase:

> Depois de pagar tudo, sobram **R$ 491,00**.

Um dado para entregar valor: é o princípio 1 do `CLAUDE.md`, ao pé da letra.

### A conta

```
sobra = saldo informado − soma das contas marcadas na lista
```

| | |
|---|---|
| Saldo informado | R$ 2.430,00 |
| Aluguel (dia 10) | R$ 1.200,00 |
| Fatura do Nubank (dia 15) | R$ 640,00 |
| Internet (dia 20) | R$ 99,00 |
| ~~Academia (dia 5)~~, desmarcada: já foi paga | — |
| **Sobram** | **R$ 491,00** |

Resultado negativo vira "Faltam R$ X", no coral do app, e não no vermelho de
erro. É informação, não bronca: o tom é o da regra "Sem culpa" do
[conceito](conceito.md).

### A lista é um rascunho, não o plano

Cada conta aparece com uma caixa marcada. Desmarcar quer dizer "essa eu já
paguei, mas não anotei". É o caso comum, e é o próprio motivo da tela existir.
"+ outra conta" soma algo que não está no plano: o conserto da moto, o
presente de aniversário.

**Nada disso é gravado.** Desmarcar não marca a conta como paga, e a conta
avulsa não vira lançamento. A tela é uma conta de padaria: quem abre para
perguntar "vai dar?" não espera que a resposta mude o planejamento por baixo.
Efeito colateral escondido numa calculadora é o tipo de surpresa que destrói
confiança.

## As duas formas recusadas

**A calculadora solta**, em que a pessoa digita o saldo e cada conta à mão,
foi recusada. Ela ignora o que o app já sabe e vira uma ferramenta à parte do
planejamento. Pede cinco dados onde um basta.

**O acerto**, em que a tela mostra a diferença entre o palpite e o saldo real
("R$ 230 saíram sem anotação") e oferece registrá-la como lançamento, ficou
para depois. É a forma mais forte, porque devolve a verdade ao painel, e segue o
mesmo mecanismo do [ajuste de fatura](ajuste-de-fatura.md). Mas ela abre uma
pergunta que merece plano próprio: se a pessoa depois anotar o gasto que tinha
esquecido, ele passa a contar duas vezes. Ver "O que fica de fora".

## O nome

**"Vai dar?"** Título da tela: **"Vai dar para pagar tudo?"**

É uma pergunta, como a regra "Uma pergunta por tela" pede, e cabe num botão
em 360px.

Foram recusados "A conta fecha?" e "Conta rápida" por causa da palavra
"conta", que já tem dois sentidos nesta tela: a conta do banco ("quanto tem na
conta") e a conta a pagar ("ainda falta pagar"). Um terceiro sentido, a conta
de fazer, seria demais. "Quanto vai sobrar?" foi recusado por ser longo e
repetir o "Sobra prevista no mês" que fica logo acima.

## O lugar

**Um botão no painel do Início, junto do "Na conta agora".**

A dúvida nasce ali: a pessoa olha o palpite, desconfia, e a resposta está ao
alcance do dedo. É o princípio 5, educar no contexto, aplicado à própria
navegação.

Tem que ser um **botão**, e não texto tocável. O Relatório já aprendeu isso:
a porta dele começou como um texto "Para onde foi" no painel, e ninguém
percebia que dava para tocar.

A tela abre num `<dialog>`, como os outros formulários do app. Não ganha item
na navegação de baixo: quinta aba em 360px é caro para algo usado poucas vezes
por mês.

## Decisões menores, com o padrão proposto

São escolhas que o plano faz por padrão e que valem confirmação antes do código.

| # | Pergunta | Padrão proposto | Por quê |
|---|---|---|---|
| 1 | Receita que ainda não entrou conta? | **Não entra na sobra.** Aparece numa linha à parte: "e ainda entra R$ X" (`faltaEntrar`, que o resumo já calcula) | O vale do dia 20 pode atrasar. A resposta conservadora é a que não decepciona |
| 2 | Qual mês? | **O mês aberto no seletor**, com o nome do mês no título | Quem recebe no dia 30 abre o mês seguinte para ver as contas dele. Travar no mês corrente quebraria esse caso |
| 3 | Conta atrasada, com dia já passado e não paga | **Entra na lista**, como qualquer pendente | Se não foi marcada, para o app ela ainda não foi paga. A caixa resolve se foi |
| 4 | Conta pendente de mês anterior | **Não entra** | O app não tem a noção de "atrasada de outro mês" hoje, e inventá-la aqui é escopo de outro bloco |
| 5 | O saldo digitado fica salvo? | **Não.** Fechou, zerou | Saldo é foto de um instante. Gravado, ele vira o palpite errado da semana que vem. E não guardar dispensa migração de esquema |
| 6 | Mês sem nenhuma conta pendente | A lista mostra "Nada para pagar neste mês" e a sobra é o próprio saldo | Estado vazio que responde, em vez de tela em branco |

## Quem faz o quê

A fronteira do `CLAUDE.md` vale aqui: o `nucleo` nunca toca DOM, e a
`interface` nunca faz conta com dinheiro.

**`nucleo`**, com teste e tipo, porque é conta com dinheiro:

- uma função que devolve as **contas a pagar** do mês: as saídas de
  `itensDoMes` que não estão realizadas, faturas incluídas, na ordem do dia;
- uma função que recebe o saldo e os valores marcados e devolve o **total a
  pagar e a sobra**, em centavos. Os testes cobrem saldo zero, sobra negativa,
  lista vazia e conta avulsa.

**`interface`**: o botão no painel, o `<dialog>` em 360px, o campo de saldo com
a máscara que os outros campos de dinheiro já usam (`aplicarMascaraValor`), a
lista com caixas e o "+ outra conta". A tela recalcula a cada mudança chamando
o `nucleo`, e nunca soma por conta própria.

## O que fica de fora

- **O acerto do plano.** Registrar a diferença entre palpite e saldo real como
  lançamento é o próximo passo natural, e o mais valioso. Fica fora porque traz
  a contagem em dobro (a pessoa anota depois o gasto esquecido) e decisões de
  dado que este bloco não precisa tomar: que categoria o acerto tem, se ele
  aparece no Relatório e em qual mês ele mora.
- **Marcar como pago a partir desta tela.** Seria o atalho óbvio da caixa
  desmarcada, mas transforma uma consulta em edição. Se o uso pedir, entra como
  botão explícito ("Marcar as desmarcadas como pagas"), nunca como efeito da
  caixa.
- **O gatilho ao receber o salário.** Oferecer "Caiu! Quer ver se dá para pagar
  tudo?" quando a pessoa marca uma receita como recebida foi considerado e
  deixado para depois. Primeiro a porta fixa; o empurrão só faz sentido quando
  se souber que a porta é usada.
- **Mais de uma conta bancária.** O saldo é um número só. Quem tem duas contas
  soma de cabeça, e o público-alvo raramente tem.

## Como verificar

- `npm run conferir` em silêncio, com os testes novos das duas funções do
  `nucleo`.
- No navegador, em 360px: o botão aparece no painel; o diálogo abre com as
  contas pendentes do mês já marcadas; digitar o saldo atualiza a sobra;
  desmarcar e somar uma conta avulsa mudam o resultado; resultado negativo vira
  "Faltam"; fechar e reabrir zera tudo; **e nenhum lançamento, nem marca de
  pago, mudou depois de usar a tela.**
- Um mês com cartão, para conferir que a fatura entra como conta.
