# Quanto da despesa é cartão

O painel já dizia o número — "R$ 4.760,05 são de fatura de cartão", em cinza,
embaixo do valor de Despesas. O que faltava era **ver** a fatia: o número
respondia "quanto", e não "quanto do total".

## A decisão de desenho, e as duas que foram recusadas

A barra de Despesas tem uma gramática que o B2 estabeleceu e a legenda do painel
ensina em voz alta: **preenchido = já aconteceu, claro = ainda previsto**. Ela é
a mesma nas duas barras, e é a razão de o painel ser legível de relance.

Pintar a fatia do cartão **dentro** desse trilho foi recusado. O roxo passaria a
disputar significado com o cheio e o claro, e a pergunta que sobra não tem
resposta na própria barra: *esse roxo já foi pago ou não?* A fatura pode estar
paga ou pendente como qualquer despesa — são duas dimensões, e uma barra só
comporta uma.

Deixar o roxo só no texto também foi recusado, por não resolver o pedido: a
proporção continuaria existindo apenas como número.

**O que entrou: uma segunda barrinha, roxa, fina, debaixo do trilho de
Despesas.** Duas dimensões, duas linhas. A de cima diz o que já aconteceu; a de
baixo, quanto daquilo é cartão.

**A barrinha não tem trilho de fundo.** Um segundo trilho cinza de ponta a ponta
leria como uma terceira barra do painel, competindo com Receitas e Despesas. Sem
fundo, o que se vê é só o pedaço roxo começando no mesmo lugar que a barra de
cima — e o que ele diz é "esta fatia daquela barra é cartão".

**A escala é a mesma das duas barras de cima**, o maior dos dois previstos. Uma
escala própria — a fatura contra o total de despesas — faria uma fatura de 4 mil
encher a barrinha inteira, e ela pareceria maior que a despesa de 11 mil logo
acima. Barra embaixo de barra é comparada por quem olha, quer a gente queira ou
não.

**A divisão fica no núcleo**, em `proporcoesDasBarras`, junto das outras quatro.
A interface não faz conta com dinheiro, nem para largura de barra — é a mesma
regra que já vale para as fatias do Relatório.

**`emCartao` entra como parâmetro obrigatório**, sem valor padrão. É a mesma
escolha que o `faturas` do `resumoDoMes` fez, e pelo mesmo motivo: um padrão
silencioso fabrica a chamada esquecida que devolve barra faltando sem ninguém
notar.

## A cor

Roxo novo na paleta, `--roxo`, nos três blocos de tema. `#6d4aa0` no claro e
`#b39ddb` no escuro — contraste de 6,69:1 e 6,76:1 sobre a superfície do cartão,
acima do 4,36:1 que o coral já pratica. Escolhido com a conta feita, e não a
olho: a legenda tem 0,75rem, que é onde contraste apertado cobra primeiro.

A legenda troca o cinza pelo roxo e ganha um ponto roxo antes. Isso reverte, de
propósito, a decisão do B6 de mantê-la em tom fraco "para não competir com o
número acima": agora ela é a etiqueta da barrinha, e precisa ser reconhecível
como o mesmo assunto.

## O que ficou de fora

- **Dizer quanto da fatura já foi paga.** É a segunda dimensão de novo, agora na
  barrinha. Enquanto a fatura for uma linha só na lista do mês, quem quer essa
  resposta a tem lá.
- **A mesma barrinha em Receitas.** Não existe receita de cartão.
- **Barrinha por cartão, quando há vários.** O painel responde "quanto do mês é
  cartão"; qual cartão é pergunta da aba Cartões.

## Como verificar

```bash
npm run conferir
```

```bash
npx --yes http-server . -p 8142 -c-1
```

1. Um mês com fatura de cartão e despesas comuns: a barrinha roxa aparece
   debaixo do trilho de Despesas, e começa alinhada com ele.
2. A largura dela em relação à barra de cima tem que bater com a razão entre o
   número roxo e o valor de Despesas.
3. Um mês sem cartão: nem legenda, nem barrinha — nada de espaço sobrando.
4. Nos dois temas, e em 360px.
