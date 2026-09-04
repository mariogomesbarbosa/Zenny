# B5 — Categorias e limites

Responde à segunda pergunta do app: **para onde o dinheiro foi.** A primeira —
"dá para chegar no fim do mês?" — o Início já responde desde o B2.

## A história desta decisão

Categoria é o único item do roteiro que já foi **recusado uma vez**. O conceito
original dizia "valor, categoria, pronto"; a
[mescla com o MVP](mescla-com-o-mvp.md#3-categorias-contra-a-ausência-delas)
reverteu:

> O MVP tem razão, e o conceito estava errado. Categoria é uma taxonomia para o
> usuário aprender antes de conseguir usar o app: exatamente a barreira que o
> Zenny existe para remover. Descrição livre no começo; categoria entra depois,
> opcional, e de preferência **sugerida pelo próprio texto** em vez de escolhida
> numa lista.

Este bloco cumpre aquela resolução ao pé da letra. Se em algum momento a
implementação exigir que o usuário escolha categoria **antes** de ver valor, a
implementação está errada — não a resolução.

## Decisões, e o porquê

**1. A categoria é sugerida pela descrição, e nunca perguntada.** A pessoa
digita "mercado da semana" e o registro nasce em Mercado. O formulário continua
com dois campos — o que é e quanto é. Nenhum campo novo, nenhuma lista para
aprender, nenhuma etapa a mais entre digitar e ver a sobra.

**2. A correção é um toque na etiqueta.** A categoria aparece como etiqueta no
próprio registro, ao lado do "fixa" que já existe. Um toque nela abre a lista.
Isso resolve os dois casos que a sugestão automática deixa em aberto: quando ela
erra, e quando não reconhece nada. Sem esse toque, a sugestão seria uma
imposição.

**3. Dez categorias de fábrica, e a pessoa cria as dela se quiser.** As de
fábrica cobrem a vida do público-alvo e não pedem configuração nenhuma. Criar as
próprias respeita o "o app é do usuário" — e abre uma porta que precisa de
regra, que é a decisão 4.

**4. Categoria criada pelo usuário não se apaga; se esconde.** Apagar exigiria
decidir o que fazer com os registros que apontam para ela — e qualquer resposta
(virar sem categoria, virar Outros, apagar junto) reescreve história que a
pessoa não pediu para reescrever. Esconder tira da lista de escolha e mantém o
passado intacto. É a mesma lógica do `fim` do fixo no B2: o passado não se mexe.

**5. Limite avisa, e nunca repreende.** O conceito é explícito: *"estourar um
limite gera informação, não bronca. O tom é de aliado, não de fiscal."* Então:
coral, nunca vermelho; "você já usou R$ 380 dos R$ 400 de Comida fora", nunca
"você estourou o limite". Nenhum ícone de alerta, nenhum ponto de exclamação.

**6. Limite é opcional e por categoria, e vive na tela de Relatório.**

> **Esta decisão foi corrigida depois da primeira implementação.** Ela dizia
> *"não há tela de configuração: o limite se define na mesma folha onde se vê o
> gasto daquela categoria"* — e o `juiz` mostrou o buraco: a folha só abre a
> partir de uma linha do detalhamento, e o detalhamento só lista o que já foi
> pago. No dia 1º do mês não havia porta nenhuma. Pior: um limite posto em
> setembro ficava **inalcançável** em outubro enquanto não houvesse gasto
> naquela categoria, continuando a valer sem porta para removê-lo.
>
> O erro era do plano, não de quem o implementou.

O detalhamento deixa de ser um diálogo e vira a **tela de Relatório**, alcançada
pelo botão "Para onde foi" do Início. Ela lista as categorias com gasto no mês
**e** as que têm limite definido, mesmo sem gasto — é essa segunda parte que
garante que todo limite tenha porta de entrada e de saída.

Ela não entra na navegação de baixo, pelo mesmo motivo da decisão 7: um item de
menu para algo que se consulta uma vez por semana custa caro em 360px. E é a
tela que cresce: os gráficos que hoje estão fora de escopo têm onde nascer sem
inventar lugar novo.

**6b. O limite aparece na própria linha.** A decisão 5 chama o limite de
"aviso", e um aviso que exige três toques para ser visto é quase mudo. Cada
linha do Relatório que tem teto mostra o quanto dele foi usado, junto do valor —
o aviso passa a existir onde a pessoa já está olhando. O Início não muda: ele
continua respondendo uma pergunta só.

**7. "Para onde foi" é um botão visível no Início.** Não uma quarta aba — que em
360px deixaria cada item com 90px — e não um toque escondido no número das
despesas, que ninguém descobre. Um botão dentro do painel, com rótulo, que abre
o detalhamento. Assim a navegação não cresce e a tela se anuncia.

**8. A migração categoriza o passado pela descrição.** Um estado que vem da v3
não tem categoria em nenhum registro. Aplicar a sugestão na travessia faz a tela
nascer útil no primeiro uso, em vez de vazia pedindo trabalho. Não perde dado —
só acrescenta —, e cada acerto ou erro se corrige com um toque.

**9. Só o realizado conta no limite.** Um limite compara com o que já saiu, não
com o previsto: dizer "você já usou 380 de 400" sobre dinheiro que ainda não
saiu seria mentir sobre o presente. O previsto continua sendo assunto do painel.

## As categorias de fábrica

Escolhidas pela vida de quem tem 22 anos e um salário apertado, não por
taxonomia contábil:

| Saídas | Entradas |
|---|---|
| Mercado, Casa, Transporte, Comida fora, Assinatura, Saúde, Estudo, Lazer, Outros | Salário, Extra |

"Outros" existe para a sugestão ter onde cair sem inventar. "Extra" cobre
freela, reembolso e presente — três coisas que o público recebe e que não são
salário.

## Como a sugestão funciona

Uma tabela de palavras-chave por categoria, casada contra a descrição em minúsculas
e sem acento. "Mercado da semana" → Mercado. "Uber pro trampo" → Transporte.
"Netflix" → Assinatura.

Sem acerto, o registro fica **sem categoria** — e não em "Outros". A diferença
importa: "sem categoria" é honesto sobre o que o app não sabe, e a etiqueta
convida ao toque. Jogar em Outros seria fingir uma classificação.

A tabela vive no núcleo, é dado puro, e tem teste. Ela vai errar — o objetivo não
é acertar sempre, é acertar o suficiente para a pessoa não precisar categorizar
à mão o que é óbvio.

## O modelo

O estado sobe para a **versão 4**:

```
{
  versao: 4,
  lancamentos: [ { ..., categoria: 'mercado' | null } ],
  realizados: {},
  categorias: [ { id, nome, tipo, oculta } ],   // só as criadas pelo usuário
  limites: { mercado: 40000 }                    // centavos, por categoria
}
```

As de fábrica **não** vão para o estado: são constante do código. Guardá-las
significaria versionar no aparelho de cada um uma lista que pode mudar no
próximo deploy — e aí renomear "Comida fora" viraria migração.

## O que vai para o núcleo

| Função | O que faz |
|---|---|
| `CATEGORIAS_DE_FABRICA` | A lista, como dado |
| `sugerirCategoria(descricao, tipo)` | A tabela de palavras-chave em ação |
| `categoriasDisponiveis(estado, tipo)` | Fábrica + as do usuário, sem as ocultas |
| `categoriaPorId(estado, id)` | Nome e tipo, ou `null` |
| `criarCategoria(estado, nome, tipo)` | Com nome normalizado e id derivado |
| `ocultarCategoria(estado, id)` | A decisão 4 |
| `gastosPorCategoria(lancamentos, realizados, mes)` | A quebra do mês, do maior para o menor |
| `definirLimite(limites, id, valor)` | Zero ou vazio remove o limite |
| `situacaoDoLimite(gasto, limite)` | `{ usado, restante, proporcao, estourou }` |

Todas puras, todas testadas. `gastosPorCategoria` e `situacaoDoLimite` fazem
conta com dinheiro, então a regra dura do `CLAUDE.md` se aplica: teste e tipo.

## O que ficou de fora

- **Apagar categoria.** Ver decisão 4.
- **Limite total do mês**, além dos por categoria. O painel já mostra a sobra, que
  é o limite de verdade.
- **Gráfico de pizza.** Uma lista ordenada com barra proporcional responde
  melhor em 360px, e o conceito recusa relatório.
- **Histórico de categoria entre meses** ("gastei mais em Mercado que no mês
  passado"). Depende de haver meses, e é assunto de outro bloco.
- **Aprender com a correção** — o app não passa a lembrar que "Zé Mercadinho" é
  Mercado depois que a pessoa corrige. Seria bom, e é bloco próprio: exige
  guardar o que a pessoa ensinou e decidir o que fazer quando ela se contradiz.
- **Categoria em lançamento fixo por mês.** O fixo tem uma categoria só, para
  todos os meses. Aluguel não muda de categoria em março.
- **Emoji ou ícone por categoria.** Nome basta, e ícone é decisão de identidade
  que merece sua própria conversa.

## Como verificar

No navegador, em 360px, nos dois temas:

1. Registrar "mercado da semana" como despesa — nasce com etiqueta Mercado, sem
   nenhuma pergunta a mais
2. Registrar "asdfgh" — nasce sem categoria, e a etiqueta convida ao toque
3. Tocar na etiqueta, trocar a categoria, e conferir que o registro mudou
4. Criar uma categoria nova pela mesma folha, e usá-la
5. No Início, o botão "Para onde foi" abre o detalhamento com a quebra do mês,
   ordenada do maior para o menor
6. Definir um limite numa categoria, gastar abaixo dele, e conferir o texto
7. Gastar acima do limite: o texto informa **sem** bronca — coral, sem ícone de
   alerta, sem exclamação
8. Um estado da v3 (sem categoria em nada) atravessa e nasce categorizado pela
   descrição, sem perder nenhum registro
9. Console limpo, nada estourando a largura
10. No dia 1º do mês, sem nada pago ainda, ainda **é possível** definir um
    limite — a porta não depende de haver gasto
11. Um limite definido num mês continua alcançável no mês seguinte, mesmo sem
    gasto naquela categoria
12. A linha do Relatório mostra o quanto do limite foi usado, sem precisar abrir
    nada

O que só um aparelho real prova continua indo para [pendencias.md](pendencias.md).
