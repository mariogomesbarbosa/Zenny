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

O Zenny é um **planejador**, não um diário. A diferença é a pergunta que ele
responde: um diário conta para onde o dinheiro foi; um planejador diz se dá para
chegar no fim do mês. É a segunda que tira o sono — e é a única que se sustenta,
porque um diário exige registro diário e apodrece na primeira semana em que a
pessoa esquece. O planejador funciona sozinho: você cadastra o que se repete uma
vez, e o mês seguinte já nasce montado.

O raciocínio completo dessa virada está em
[mescla-com-o-mvp.md](mescla-com-o-mvp.md).

## Como isso vira produto

| Princípio | O que significa na prática |
|---|---|
| Valor antes de configuração | O app abre útil. O primeiro lançamento não exige criar conta, categoria nem saldo inicial — e já devolve o número da sobra. Nada de tela de configuração inicial. |
| Dois campos | O que é, quanto é. O resto tem padrão: avulso, data de hoje, ainda não pago. Repetição e data ficam atrás de "mais opções". |
| Uma pergunta por tela | Cada tela responde a uma coisa. "Dá para chegar no fim do mês?" e "para onde foi?" são telas diferentes. Nada de duas colunas lado a lado como planilha. |
| O mês é a unidade | Salário no dia 5, aluguel no 10, cartão no 15. A vida financeira desse público é mensal, e o app navega assim. |
| Planejado e realizado são coisas diferentes | Cada lançamento sabe se já aconteceu. É o que transforma uma lista em um plano. |
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
- **Não vira livro-caixa.** Ser um planejador não autoriza a linguagem nem a
  forma da contabilidade: "lançamento", "livro-caixa", entradas e despesas em
  duas colunas lado a lado. Essa é a aparência que o público-alvo evita.

## Roteiro proposto

Revisado depois da mescla com o MVP — o raciocínio de cada mudança está em
[mescla-com-o-mvp.md](mescla-com-o-mvp.md). A ordem existe para que cada bloco
entregue algo usável sozinho.

| Bloco | O quê | Por que nesta ordem |
|---|---|---|
| B0 | Esqueleto: navegação, tema claro/escuro, instalável no celular | Base para tudo; permite testar no celular de verdade desde o começo |
| B1 | O mês, e entradas e saídas avulsas, com o número da sobra | É o coração. Entradas entram já aqui: sem elas não existe sobra, e a sobra é o que a promessa vende |
| B2 | Fixos, planejado × realizado, e a tela do MVP | Fundidos num bloco só: o resumo pedido não existe sem os dois. É o que faz o app trabalhar sozinho a partir do mês 2 |
| B3 | O valor do fixo passa a ter data | Sem isso, registrar um aumento reescrevia os meses já fechados — a história ficava errada em silêncio |
| B4 | Backup, Ajustes e apagar tudo | Depois do B2 o usuário tem trabalho investido nos fixos. Rede de segurança não pode chegar por último. Absorveu o antigo B5: o backup não tem onde morar sem a tela de Ajustes, então os dois viraram um bloco só |
| B5 | Categorias sugeridas e limites | Só faz sentido depois de haver dados. Opcional de propósito: taxonomia é barreira |
| B6 | Guardar para algo (metas com nome e prazo) | Motivação positiva; depende de sobrar dinheiro visível |
| B7 | Pílulas de educação no contexto | Precisa de telas prontas para se ancorar |

## Identidade

- **Nome**: Zenny — *zen* + *money*. A proposta inteira em duas sílabas: calma
  com dinheiro.
- **Tom de voz**: direto, caloroso, nunca professoral. Frases curtas.
- **Marca visual**: o *ensō* — o círculo aberto do zen, que também lê como
  moeda. Traço único, aberto: nada aqui está fechado ou definitivo.
- **Cores**: fundo areia quente (não branco de planilha), tinta escura,
  verde para o que cresce, coral para o que sai. Coral, nunca vermelho de erro.
