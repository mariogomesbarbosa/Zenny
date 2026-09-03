# B2 — Fixos, planejado × realizado, e a tela do MVP

Este bloco faz três coisas ao mesmo tempo, e não por descuido: elas são a mesma
coisa vista de ângulos diferentes.

O Mário rodou o MVP no celular, comparou com o que o Zenny tinha entregado no B1
e pediu a tela principal do MVP de volta — resumo detalhado no topo, lançamentos
agrupados em Entradas e Despesas logo abaixo, o formulário com repetição, e o
"já recebi / já paguei" alimentando o resumo. Não dá para entregar esse resumo
sem os fixos (senão o mês seguinte nasce vazio) nem sem o realizado (senão não
existe "na conta agora"). Por isso o B2 e o B3 do roteiro viraram um bloco só.

## O que isto reverte

Três decisões do [B1](b1-o-mes.md) caem. Ficam registradas aqui em vez de
apagadas de lá, porque o raciocínio que as gerou continua tendo valor — o que
mudou foi a evidência:

| Decisão do B1 | O que valia | O que passou a valer |
|---|---|---|
| 5 — duas telas | Início respondia "como está o mês?" e a lista era outra tela, para não virar planilha | Uma tela só. O resumo e as listas convivem, como no MVP |
| 6 — a aba "Entra e sai" | Evitava "extrato" (banco) e "lançamentos" (contador) | A aba deixou de existir. Sobraram Início e Metas |
| 7 — formulário de dois campos | Descrição e valor visíveis; o resto atrás de "mais opções" | O formulário do MVP: tipo, descrição, valor, repetição, data ou dia, e a marcação de já recebido |

A [mescla com o MVP](mescla-com-o-mvp.md) também recusava "as duas colunas de
Entradas e Despesas lado a lado". A recusa continua válida onde importa: no
celular os dois grupos são **empilhados**, um abaixo do outro, e não colunas
paralelas. Lado a lado só a partir de 768px, onde há largura para isso sem
espremer nada.

O que não mudou: a paleta, o tema escuro, a pilha de fontes do sistema, o
dinheiro em centavos e a lógica pura em `nucleo.js`. A identidade visual do Zenny
está inteira; o que veio do MVP foi a arquitetura da tela.

## Decisões, e o porquê

**1. O fixo é uma regra, não uma cópia.** A alternativa seria gerar um
lançamento por mês na hora de salvar. Seria mais simples de ler e um desastre de
manter: editar o valor exigiria caçar todas as cópias, e o app cresceria para
sempre mesmo sem o usuário fazer nada. Aqui o fixo guarda dia, mês de início,
fim opcional e a lista de meses pulados; cada mês pergunta se está dentro da
janela.

**2. O dia do fixo encolhe para o tamanho do mês.** Aluguel no dia 31 tem que
aparecer no dia 28 em fevereiro, não sumir. Tem teste, inclusive para fevereiro
bissexto.

**3. O realizado vive num mapa à parte, com chave `id|AAAA-MM`.** É a peça mais
sutil do modelo, e o MVP já a tinha certa: o mesmo aluguel fixo está pago em
setembro e em aberto em outubro, e o lançamento é um só. Guardar um booleano no
próprio lançamento tornaria isso impossível.

**4. A marcação órfã é descartada na leitura.** A [mescla](mescla-com-o-mvp.md)
registrou como limitação herdada que o mapa de pagos do MVP crescia sem limpeza.
Resolvido: ao carregar, toda chave que aponta para um lançamento inexistente é
jogada fora. Custa uma passada no `normalizarEstado` e fecha o vazamento.

**5. As três semânticas de excluir um fixo são funções puras.** "Só neste mês",
"deste mês em diante" e "de todos os meses" viram `pularMes`, `encerrarFixo` e
`excluirLancamento`, testadas fora do navegador. É o problema mais difícil da
recorrência; deixá-lo dentro de um manipulador de clique seria pedir para
quebrar em silêncio.

**6. Editar um fixo preserva a janela dele.** Mudar o valor não pode ressuscitar
meses que o usuário já tinha encerrado, nem desfazer um mês pulado. Só a
transformação de avulso em fixo é que define um início novo — o mês visível.

**7. Excluir sempre oferece desfazer, inclusive nas três semânticas.** O estado
nunca é mutado no lugar, então "desfazer" é só guardar a referência anterior e
devolvê-la. O `<dialog>` das três opções pergunta o que fazer; o desfazer cobre
o caso de a pessoa ter escolhido errado.

**8. As duas barras dividem a mesma escala, e cada uma tem dois trechos.** O
trecho cheio é o que já aconteceu, o claro é o que ainda falta; somados dão o
previsto daquele lado. A referência das duas é o maior dos dois previstos, então
"vai sair mais do que entra" se vê sem ler número.

**9. O detalhe do resumo é montado por nó, não por `innerHTML`.** O texto mistura
valores formatados com marcação, e concatenar HTML com dado que veio do usuário
é como se abre buraco por descuido. Custa três linhas a mais.

## Sobre as palavras da tela

A tela usa **Receitas** e **Despesas**. A primeira versão deste bloco usava
"Entradas", a palavra do MVP; o Mário pediu "Receitas", e é o que vale.

A troca é só de texto visível. Os identificadores do código (`tipo-entrada`,
`lista-entradas`) e o valor gravado (`tipo: "entrada"`) continuam como estão:
renomear o dado exigiria migração de esquema para ganho nenhum, e o nome interno
não é a palavra que o usuário lê.

"Lançamento" continua aparecendo no título do formulário e no diálogo de
exclusão, herdado do MVP. Está em tensão com o princípio 2 do `CLAUDE.md` — nada
de jargão de contador na interface — e é o candidato mais óbvio a uma revisão de
texto quando o app tiver forma.

## O modelo

```
{
  versao: 2,
  lancamentos: [
    { id, tipo, descricao, valor, fixo: false, data: 'AAAA-MM-DD' },
    { id, tipo, descricao, valor, fixo: true, dia, inicio: 'AAAA-MM', fim, pulados: [] }
  ],
  realizados: { 'id|AAAA-MM': true }
}
```

Migração da versão 1: todo lançamento antigo é avulso, e `realizados` nasce
vazio. Um estado v1 entra no `normalizarEstado` e sai v2 sem perder nada — tem
teste para isso.

## O que ficou de fora

- **Backup** (baixar e restaurar) — próximo bloco. O MVP tem, e agora que existe
  trabalho investido nos fixos, ele passa a ser urgente.
- **Deslizar para o lado para trocar de mês** — continua adiado; mexe com o
  gesto de rolagem e merece verificação própria no celular.
- **Configurações (engrenagem)** — pedida, mas ainda sem nada para configurar
  além do tema. Entra quando o backup precisar de casa.
- **Categorias e metas** — mais adiante no roteiro.

## Como verificar

```bash
node tests/nucleo.mjs
```

88 testes. Os novos cobrem a janela do fixo (início, fim inclusive, meses
pulados), o dia encolhendo em fevereiro, o realizado por mês, a limpeza de
marcações órfãs, a migração da v1, os dois trechos de cada barra e as três
semânticas de exclusão.

No navegador, exercitado durante a implementação: fixo aparecendo no mês
seguinte enquanto o avulso não; marcar pago em outubro sem afetar setembro; as
três exclusões com desfazer em todas; editar um fixo preservando a janela; o
rótulo da marcação alternando entre "Já recebi" e "Já paguei".
