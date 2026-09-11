# Planejado e realizado no Relatorio

> Documento de decisoes da melhoria 1 de `docs/melhorias.md`.

Antes desta mudanca, o Relatorio so mostrava o que ja estava marcado como pago:
`gastosPorCategoria` descartava tudo com `!estaRealizado(realizados, l.id, mes)`.
Quem entrava na aba no dia 1o do mes via a tela vazia, mesmo com o mes inteiro
planejado. A pergunta "para onde o dinheiro vai" nao tinha resposta ate o dinheiro
ja ter ido.

## A decisao de desenho

O app inteiro e construido sobre a distincao entre **planejado** e **realizado**
(e o que o faz planejador financeiro e nao apenas diario de gastos). Apagar essa
distincao no Relatorio seria incoerente.

### 1. Dois trechos na mesma barra

Reusamos a gramatica visual que a pessoa ja aprendeu no painel do **Inicio**:
- **Trecho cheio (coral escuro):** o valor ja pago (`realizado`).
- **Trecho claro (coral claro):** o valor planejado que ainda falta pagar
  (`previsto - realizado`).

A soma dos dois trechos representa o valor total previsto para a categoria no mes.
Em "Sem categoria", o mesmo par e mantido em tons neutros (`--tinta-fraca` e `--borda`).

### 2. A escala da barra

A referencia para 100% da barra continua sendo a **categoria de maior valor** do mes
— agora comparando o total previsto (ou realizado, se tiver superado a previsao).
Isso mantem as categorias comparaveis entre si em telas pequenas de 360px.

### 3. O valor e as legendas

- **Valor da linha:** exibe o total planejado (`previsto`) para o mes.
- **Quando ha limite:** a legenda continua comparando o que de fato ja saiu
  (`situacaoDoLimite(fatia.realizado, limite)`), preservando a decisao 9 do B5:
  limite mede dinheiro consumido no presente, sem dar bronca nem acusar estouro de
  dinheiro que ainda nao saiu.
- **Quando nao ha limite:**
  - Se nada foi pago: `A pagar.`
  - Se parte foi paga: `X pago.`
  - Se tudo foi pago: `Pago.`

## O que ficou de fora

- **Graficos de pizza ou rosca:** recusados pelo conceito original do Zenny.
  Barras horizontais sao escaneaveis no celular, nao tem problema de legenda
  espremida e permitem comparar proporcoes com precisao.
- **Filtro toggle "so pagos / so previstos":** botoes adicionais de modo poluem a
  interface. A barra com dois tons ja entrega ambas as informacoes de relance.
