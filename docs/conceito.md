# Conceito — Zenny

> Este documento é a régua do projeto. Toda proposta de funcionalidade é medida
> contra ele. Se a proposta não passar, ela não entra — mesmo sendo boa ideia.

## O problema real

A maioria das pessoas de 20 e poucos anos não deixa de cuidar do dinheiro por
falta de aplicativo. Deixa por três motivos, nesta ordem:

1. **Medo de descobrir.** Olhar de frente para os próprios gastos é
   desconfortável. O app não pode aumentar esse desconforto com julgamento —
   nada de vermelho gritante, nada de "você gastou demais".
2. **Complexidade de entrada.** Os apps de finanças pedem que você cadastre
   contas, categorias, orçamentos e saldos iniciais **antes** de entregar
   qualquer valor. Isso é um pedágio de 40 minutos na frente de alguém que tem
   40 segundos de paciência.
3. **Vocabulário de banco.** "Provisionamento", "fluxo de caixa projetado",
   "aporte". A pessoa se sente burra, e sair do app é mais fácil que aprender.

Zenny existe para atacar os três. Nesta ordem.

## Para quem

Jovem adulto (18–30), primeiro ou segundo emprego, renda variável ou salário
apertado, celular Android de entrada ou intermediário, dado móvel limitado.
Nunca usou planilha de gastos por mais de duas semanas. Não quer investir
ainda — quer entender para onde o dinheiro vai e conseguir sobrar algum.

Não é para: quem já usa planilha com prazer, investidor, MEI/empresa,
casal com finanças conjuntas. Essas pessoas são bem servidas por outros apps, e
tentar atendê-las é o caminho mais curto para o Zenny virar complicado.

## A promessa

**Em 30 segundos de uso você sabe mais sobre seu dinheiro do que sabia antes de
abrir o app.** Sem cadastro, sem configuração, sem tutorial.

## Como isso vira produto

| Princípio | O que significa na prática |
|---|---|
| Valor antes de configuração | O app abre útil. Registrar o primeiro gasto não exige criar conta, categoria nem saldo inicial. |
| Três toques | Registrar um gasto: valor, categoria, pronto. Data e o resto têm padrão inteligente. |
| Uma pergunta por tela | Cada tela responde a uma coisa. "Quanto eu tenho?" e "para onde foi?" são telas diferentes. |
| Linguagem de gente | "O que sobrou", não "saldo disponível". "Guardar para" em vez de "meta de aporte". |
| Educação no contexto | A explicação nasce onde a dúvida aparece: um toque no número mostra o que ele quer dizer. Nunca uma aba de artigos que ninguém lê. |
| Sem culpa | Estourar um limite gera informação, não bronca. O tom é de aliado, não de fiscal. |

## O que o Zenny NÃO vai ser

Registrar aqui é tão importante quanto registrar o que ele é — cada item abaixo
é uma tentação real que vai aparecer:

- **Não sincroniza com banco (Open Finance).** Custo regulatório e de
  infraestrutura alto, e mata a proposta de "abre e usa". Entrada é manual, e o
  esforço de digitar é problema de design, não de integração.
- **Não é app de investimento.** Nenhuma recomendação, nenhuma carteira, nenhuma
  projeção de rendimento. Além do escopo, isso é atividade regulada.
- **Não tem rede social nem comparação com outras pessoas.** Comparar gasto com
  a média é exatamente o gatilho de culpa que o app quer remover.
- **Não tem relatório de 12 colunas.** Se a resposta não cabe na tela do
  celular, a pergunta está errada.
- **Não tem login obrigatório.** Dados no aparelho. Se algum dia houver nuvem,
  é opcional e para backup.

## Roteiro proposto

Proposta em aberto, para revisão do Mário — a ordem existe para que cada bloco
entregue algo usável sozinho.

| Bloco | O quê | Por que nesta ordem |
|---|---|---|
| B0 | Esqueleto: navegação, tema claro/escuro, instalável no celular | Base para tudo; permite testar no celular de verdade desde o começo |
| B1 | Registrar um gasto em três toques | É o coração. Se isso não for gostoso, nada mais importa |
| B2 | O mês em uma tela: entrou, saiu, sobrou | Primeiro momento de "descoberta" — o valor que a promessa vende |
| B3 | Limites por categoria (sem usar a palavra "orçamento") | Só faz sentido depois de haver dados para limitar |
| B4 | Guardar para algo (metas com nome e prazo) | Vira motivação positiva; depende de sobrar dinheiro visível no B2 |
| B5 | Pílulas de educação no contexto | Precisa de telas prontas para se ancorar |
| B6 | Exportar e trazer de volta os dados | Rede de segurança; sem isso o usuário não confia dados de meses no app |

## Identidade

- **Nome**: Zenny — *zen* + *money*. A proposta inteira em duas sílabas: calma
  com dinheiro.
- **Tom de voz**: direto, caloroso, nunca professoral. Frases curtas.
- **Marca visual**: o *ensō* — o círculo aberto do zen, que também lê como
  moeda. Traço único, aberto: nada aqui está fechado ou definitivo.
- **Cores**: fundo areia quente (não branco de planilha), tinta escura,
  verde para o que cresce, coral para o que sai. Coral, nunca vermelho de erro.
