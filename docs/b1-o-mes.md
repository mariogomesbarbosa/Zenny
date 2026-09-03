# B1 — O mês, entradas e saídas

O bloco em que o Zenny passa a ser útil. Entra o modelo de dados, entra dinheiro,
e com dinheiro entram os primeiros testes.

Escopo: navegar por mês, adicionar entradas e saídas **avulsas**, ver a lista do
mês e ver o número da sobra. Fixos ficam no B2; marcar recebi/paguei fica no B3;
backup fica no B4.

## Decisões, e o porquê

**1. Dinheiro é inteiro em centavos, nunca ponto flutuante.** O MVP guardava
`6028.91` como número. Somar dezenas de valores assim acumula erro de fração de
centavo, e o `CLAUDE.md` é explícito: erro de centavo destrói a confiança no app
inteiro. Tudo é centavo inteiro do armazenamento até a última soma; a divisão por
100 acontece só na hora de formatar.

**2. A interpretação do valor digitado é feita por texto, não por `parseFloat`.**
Aqui há um defeito real do MVP que não atravessa: `parseAmount("1.234")`
devolvia `1.234`, ou seja, **R$ 1,23** para quem quis digitar mil duzentos e
trinta e quatro reais. A regra do Zenny: se há vírgula, os pontos são separador
de milhar; se não há vírgula e o último ponto tem exatamente três dígitos depois,
também é separador de milhar — porque dinheiro em real nunca tem três casas
decimais. O resto é decimal.

**3. Lógica pura em `nucleo.js`, como módulo ES.** O `app.js` mexe no DOM; o
`nucleo.js` só faz contas e não sabe que existe navegador. Assim o teste importa
o módulo direto (`import { analisarValor } from '../nucleo.js'`) em vez de
extrair funções do fonte por casamento de chaves, que é o que o Daysk precisou
fazer e que ele mesmo documenta como frágil. Custo: `<script type="module">` não
roda em `file://`. Como o app já exige servidor por causa do service worker, o
custo é zero na prática.

**4. O mês vive na barra superior, e a marca cede espaço no celular.** O controle
mais usado do app é trocar de mês; ele precisa estar no lugar mais alcançável. Em
telas estreitas fica só o símbolo do Zenny à esquerda; o nome volta a partir de
768px. O botão "Hoje" só aparece quando o mês visível não é o atual — botão que
não faz nada não merece ocupar espaço.

**5. Duas telas, não uma.** Início responde "como está o mês?" com o número e as
duas barras. "Entra e sai" mostra a lista. Juntar as duas reproduziria a página
de planilha do MVP, que é justamente a forma que o público-alvo evita
(ver [mescla-com-o-mvp.md](mescla-com-o-mvp.md)).

**6. O nome da segunda aba é "Entra e sai".** "Extrato" e "Movimentações" são
vocabulário de banco; "Lançamentos" é de contador; "Gastos" mente, porque a tela
também mostra o que entra. "Entra e sai" é como alguém explicaria para um amigo.
É a decisão mais discutível do bloco, e está aberta a revisão.

**7. O formulário mostra dois campos.** Tipo (entrada ou saída) é um alternador
no topo, não um campo. Descrição e valor ficam visíveis. A data vem preenchida
com hoje e fica atrás de "mais opções". Cumpre a promessa dos dois campos sem
esconder nada de quem precisa.

**8. Excluir não pede confirmação — oferece desfazer.** Diálogo de confirmação
transfere a dúvida para o usuário antes de ele ver o resultado. Desfazer deixa
agir e corrigir, o que combina com o princípio de não julgar. Também evita o
`confirm()`, que no Daysk já foi suprimido pelo navegador e fez um botão parar de
funcionar sem sinal nenhum.

**9. As barras comparam entradas e saídas na mesma escala.** Ambas usam o maior
dos dois valores como referência, então a saída maior que a entrada é visível de
relance, sem precisar ler número. Sem vermelho de erro e sem texto de bronca: o
coral é informação, não repreensão.

## O modelo

Chave única `zenny:v1` no `localStorage`, com a versão no próprio conteúdo:

```
{
  versao: 1,
  lancamentos: [
    { id, tipo: 'entrada' | 'saida', descricao, valor /* centavos */, data: 'AAAA-MM-DD' }
  ]
}
```

Um lançamento avulso guarda a data completa; o mês é derivado dela. A forma dos
fixos (dia do mês, início, fim, meses pulados) entra no B2 — o campo `versao`
existe para que essa migração seja código de primeira classe, e não adivinhação.

## O que ficou de fora, de propósito

- **Fixos, recorrência e as três semânticas de exclusão** — B2.
- **Marcar como recebido/pago e a separação planejado × realizado** — B3. Por
  isso o número da tela de Início é a sobra **prevista** do mês inteiro.
- **Categorias** — B5, e opcionais, pelo que já foi decidido na mescla.
- **Deslizar para o lado para trocar de mês.** Vale, mas mexe com o gesto de
  rolagem e merece verificação própria no celular; entra junto com o B2.

## Testes

`node tests/nucleo.mjs`. Cobrem o que faz conta com dinheiro e o que fatia o
tempo: interpretar valor digitado, formatar, derivar e deslocar meses, o tamanho
do mês, a seleção dos lançamentos do mês e o resumo. Sem framework, sem
dependência.
