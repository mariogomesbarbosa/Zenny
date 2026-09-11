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

**Status:** 🟢 Feita — [PR #27](https://github.com/mariogomesbarbosa/Zenny/pull/27)
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

**Status:** 🟢 Feita — [PR #28](https://github.com/mariogomesbarbosa/Zenny/pull/28)
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

Esta é a de maior alcance da lista, porque encosta na lista mais vista do
app. Vale plano próprio em `docs/`, como manda o `CLAUDE.md`.

## 4. Os campos de valor precisam de máscara

**Status:** 🟢 Feita — [PR #26](https://github.com/mariogomesbarbosa/Zenny/pull/26)
**Onde:** `app.js` (os cinco campos de dinheiro), `index.html`
**Pedido:** máscara nos campos de valor, para não ser preciso digitar a
vírgula — como na maioria dos aplicativos de banco.

Hoje os campos são texto livre com `inputmode="decimal"`, e quem digita
"1234" quis dizer mil duzentos e trinta e quatro reais, não doze reais e
trinta e quatro centavos. O app só descobre a intenção quando a pessoa
digita a vírgula — e digitar vírgula no teclado numérico do Android é uma
troca de teclado que ninguém quer fazer dez vezes por dia.

A máscara que os bancos usam preenche **da direita para a esquerda**: cada
dígito empurra os anteriores, e a vírgula fica fixa duas casas antes do fim.

| Digita | Mostra |
|---|---|
| `1` | R$ 0,01 |
| `12` | R$ 0,12 |
| `1234` | R$ 12,34 |
| `123456` | R$ 1.234,56 |

Três coisas que a implementação não pode esquecer:

- **São CINCO campos**, não um: `campo-valor`, `campo-limite-do-cartao`,
  `campo-fatura`, `campo-limite` e `campo-fatura-detalhe`. A máscara tem que
  ser uma função compartilhada — cinco cópias divergem na primeira correção.
- **`analisarValor` continua existindo.** Ela deixa de receber texto torto da
  digitação, mas continua lendo o que vem do arquivo de backup e de texto
  colado. Tirá-la seria confiar que todo valor entrou pela máscara, o que é
  falso.
- **O cursor.** Máscara que reformata a cada tecla costuma jogar o cursor para
  lugar errado. O preenchimento da direita para a esquerda evita isso por
  construção — o cursor fica sempre no fim, que é onde o próximo dígito entra
  — e é por isso que esse é o desenho certo, e não só o mais familiar.

## 5. O limite de 1 a 31 nos dias não é respeitado

**Status:** 🟢 Feita — [PR #26](https://github.com/mariogomesbarbosa/Zenny/pull/26)
**Onde:** `index.html` (os três campos de dia), `nucleo.js` (`limitarDia`)
**Pedido:** o campo de dia de fechamento e de vencimento deve ser numérico,
com limite de 1 a 31.

**Metade disto já existe, e é importante dizer:** os três campos já são
numéricos com os limites declarados.

```html
<input type="number" id="campo-fechamento" inputmode="numeric" min="1" max="31" value="30">
```

O que **não** existe é o limite valer. O formulário é `novalidate` (de
propósito: a validação nativa do navegador é hostil e em português ruim),
então `min` e `max` não bloqueiam nada. Quem digita 45 consegue digitar 45 —
e o `limitarDia` do núcleo corta para 31 **em silêncio**, na hora de salvar:

```js
// nucleo.js
export function limitarDia(dia) {
  return Math.min(31, Math.max(1, Math.trunc(Number(dia)) || 1));
}
```

O corte silencioso é o defeito de verdade, e é pior que o campo aceitar o
número: a pessoa digita 45, salva, e o cartão passa a fechar dia 31 sem que
ninguém tenha dito nada. Num app de dinheiro, número corrigido em silêncio é
a mesma família de erro que este projeto já corrigiu duas vezes.

O `limitarDia` **fica como está** — ele é a última defesa contra dado torto
vindo do arquivo de backup, e essa defesa tem que continuar calada. O
conserto é na tela: impedir a digitação fora da faixa, ou dizer que corrigiu.
Qual das duas é decisão a tomar na implementação.

## 6. Card de compras do cartão e confirmação para ações destrutivas

**Status:** 🟡 Em andamento — `feat/ajustes-card-compras-cartao`
**Onde:** `app.js`, `styles.css`, `index.html`, `nucleo.js`
**Pedido:**
- Remover botões inline de editar e excluir dos cards de compras na fatura do cartão, abrindo o drawer de edição ao tocar no card.
- No lugar dos botões, exibir a tag de categoria (ou o botão `+ categoria` quando não houver categoria atribuída).
- Exibir a hora de lançamento junto à data e ordenar a lista de compras em ordem decrescente (mais recente no topo).
- Adicionar confirmação modal para ações destrutivas (exclusão de lançamentos avulsos e compras, arquivamento de cartão e remoção de limites).

---

## Feitas

- **1. O Relatório só mostra o que já foi pago** — [PR #27](https://github.com/mariogomesbarbosa/Zenny/pull/27)
- **2. O botão flutuante "Adicionar" aparece na tela de detalhe da fatura** — [PR #28](https://github.com/mariogomesbarbosa/Zenny/pull/28)
- **4. Os campos de valor precisam de máscara** — [PR #26](https://github.com/mariogomesbarbosa/Zenny/pull/26)
- **5. O limite de 1 a 31 nos dias não é respeitado** — [PR #26](https://github.com/mariogomesbarbosa/Zenny/pull/26)

As melhorias que entraram antes desta lista existir estão na seção "Resolvidas" de [pendencias.md](pendencias.md).
