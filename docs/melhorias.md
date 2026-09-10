# Melhorias

> Lista de melhorias identificadas usando o app, com status. Serve para não
> esquecer — e para que a melhoria chegue à implementação já com a causa
> apurada, em vez de só com o sintoma.
>
> **Isto não é `pendencias.md`.** Lá ficam as ressalvas que um bloco deixou de
> propósito, cada uma com o motivo da recusa. Aqui ficam coisas que devem ser
> feitas e ainda não foram.

## Como usar

Status possíveis:

| Status | Significa |
|---|---|
| 🔴 **Aberta** | Identificada, ninguém mexeu |
| 🟡 **Em andamento** | Tem branch ou PR aberto |
| 🟢 **Feita** | Mergeada na `main` e verificada |

Quando uma melhoria é feita, ela **não sai da lista**: vira 🟢 com o link do PR.
Lista que só mostra o que falta esconde o que já melhorou, e é justamente esse
histórico que evita refazer a mesma discussão.

---

## 1. O Relatório só mostra o que já foi pago

**Status:** 🔴 Aberta
**Onde:** `nucleo.js`, `gastosPorCategoria`
**Pedido:** a tela de Relatório deve detalhar os gastos por categoria
**inclusive os planejados**, não só os já realizados.

Confirmado no código. A função descarta tudo que não está marcado como pago:

```js
// nucleo.js — dentro de gastosPorCategoria
if (l.tipo !== 'saida') continue;
if (!estaRealizado(realizados, l.id, mes)) continue;   // <- é esta linha
```

Consequência hoje: quem entra no Relatório no dia 1º do mês vê a tela vazia,
mesmo tendo o mês inteiro planejado. A pergunta "para onde o dinheiro vai" não
tem resposta até o dinheiro já ter ido.

**O que decidir antes de implementar** — e é decisão de produto, não de código:

- Somar planejado e realizado num número só, ou mostrar os dois lado a lado?
  O app inteiro é construído sobre a distinção planejado × realizado (é o que
  o faz planejador e não diário), e apagá-la só nesta tela seria incoerente.
- A barra de proporção passa a comparar o quê? Hoje ela é a fração do maior
  gasto do mês; com dois números por categoria, "o maior" fica ambíguo.

A escolha mais provável, a confirmar: **os dois trechos na mesma barra**, como
o painel do Início já faz — cheio para o que já saiu, claro para o que ainda
vai. Reusaria a linguagem visual que a pessoa já aprendeu.

## 2. O botão flutuante "Adicionar" aparece na tela de detalhe da fatura

**Status:** 🔴 Aberta
**Onde:** `styles.css`, a regra que esconde o botão flutuante
**Pedido:** ele não deve existir nessa tela, que já tem seu próprio botão de
anotar lançamento no cartão.

Causa exata, e é de uma linha. A tela nova entrou na navegação
(`app.js`: `const TELAS = [..., 'cartao-detalhe', ...]`) mas não entrou na regra
que esconde o botão:

```css
/* styles.css — falta 'cartao-detalhe' nesta lista */
body[data-tela="ajustes"] .botao-flutuante,
body[data-tela="cartoes"] .botao-flutuante,
body[data-tela="relatorio"] .botao-flutuante { display: none; }
```

O problema é o mesmo que a tela de Cartões já resolveu: dois botões de adicionar
na mesma tela, criando coisas diferentes — um cria lançamento do mês, o outro
uma compra no cartão. É a ambiguidade que faz a pessoa tocar no errado.

**Vale mais que a linha:** esta é a segunda vez que uma tela nova nasce com o
botão flutuante aparecendo por esquecimento. A regra é uma lista de exceções,
e lista de exceções esquece. Inverter — o botão aparece só onde é declarado —
faria a próxima tela nascer certa por padrão. Fica como parte desta melhoria,
a decidir na implementação.

## 3. Os cards de lançamento da home ficaram atrás do redesenho do cartão

**Status:** 🔴 Aberta
**Onde:** `app.js` (`linhaDoLancamento` e `linhaDaCompraDetalhe`), `styles.css`
**Pedido:** melhorar o card de lançamento da home, que ficou diferente e pior
que o do cartão de crédito depois do redesenho.

Confirmado: existem **dois renderizadores diferentes para a mesma coisa**.

| Onde | Função | Classe |
|---|---|---|
| Lista do mês, no Início | `linhaDoLancamento` | `.lancamento` |
| Fatura, na tela de detalhe | `linhaDaCompraDetalhe` | `.lancamento-detalhe` |

Um lançamento é um lançamento. Ter dois desenhos e dois códigos para ele custa
duas vezes em toda mudança futura, e a divergência vai crescer sozinha.

**O que decidir antes de implementar:**

- O desenho novo vira o único, ou os dois contextos têm necessidades
  legitimamente diferentes? A linha do Início carrega marcador de realizado,
  etiqueta de categoria e etiqueta de fixo; a da fatura não precisa das três.
- Se virar um só, é uma função com variações declaradas — e não duas funções
  parecidas, que é o estado atual.

Esta é a de maior alcance das três, porque encosta na lista mais vista do
app. Vale plano próprio em `docs/`, como manda o `CLAUDE.md`.

---

## Feitas

Nada aqui ainda. As melhorias que já entraram antes desta lista existir estão
na seção "Resolvidas" de [pendencias.md](pendencias.md).
