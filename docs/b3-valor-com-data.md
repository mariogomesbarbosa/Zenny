# B3 — O valor do fixo passa a ter data

Corrige a pendência mais séria que o B2 deixou: **editar um lançamento fixo
reescrevia o passado**.

## O problema

Um fixo guardava **um** `valor`. Todos os meses da janela renderizavam esse mesmo
número. Quando o salário subia em janeiro e o usuário editava, setembro a
dezembro passavam a mostrar o valor novo — inclusive os meses já marcados como
recebidos.

O que torna isso grave não é a imprecisão, é o **silêncio**: nada na tela indica
que aquele número mudou depois do fato. Um mês fechado parece um registro
histórico e não é. Quem for comparar meses vai comparar ficção.

## A decisão

O Mário escolheu a linha do tempo, contra a recomendação de quem escreveu isto
— e a escolha se sustenta: é a solução exata, e as alternativas eram mais
baratas justamente por resolverem menos.

Um fixo deixa de ter `valor` e passa a ter `valores`, uma lista ordenada de
trechos. Cada mês usa o último trecho que já começou.

```
valores: [ { desde: '2026-09', valor: 267526 },
           { desde: '2027-01', valor: 300000 } ]
```

A alternativa que eu tinha recomendado — encerrar o fixo antigo e criar um novo,
reusando `encerrarFixo`, que já existia e já tinha teste — custava menos e
resolvia o mesmo problema **de dinheiro**. O que ela não dava era identidade: o
histórico de uma despesa ficaria partido em vários registros, e qualquer tela
futura de "como meu aluguel evoluiu" teria que remontá-lo por descrição. A linha
do tempo preserva a identidade nativamente. O custo foi a migração de esquema e
uma passada em tudo que soma dinheiro.

## Decisões, e o porquê

**1. A resolução acontece em `lancamentosDoMes`, e em nenhum outro lugar.** É o
que mantém a linha do tempo invisível para o resto do código: quem soma, quem
desenha e quem compara continua lendo `.valor` como antes, sem saber que ele pode
mudar de mês para mês. Nenhuma linha de `resumoDoMes`, do desenho ou do
`app.js` precisou aprender o conceito.

**2. "Deste mês em diante" preserva o passado e descarta o futuro.** Os trechos
anteriores ao mês ficam intactos — é o ponto do bloco. Os posteriores caem,
porque um trecho futuro sobrevivente contradiria o que a pessoa acabou de pedir.
Isto quase virou um defeito: o primeiro teste que escrevi esperava que os
trechos anteriores também fossem descartados, o que reescreveria a história de
novo. O teste falhou, e foi a expectativa que estava errada — não o código.

**3. "Corrigir em todos os meses" achata a linha do tempo.** É o caso de quem
digitou 500 em vez de 5.000: o valor sempre foi aquele. Destrutivo de propósito,
e coberto pelo desfazer.

**4. A pergunta só aparece quando o valor de um fixo que já existia muda.**
Renomear "Aluguel" para "Aluguel do apê" ou mudar o dia do vencimento vale para
todos os meses sem perguntar: nenhum dos dois reescreve dinheiro. Uma pergunta
que aparece à toa vira uma pergunta que ninguém lê.

**5. Cancelar no diálogo devolve ao formulário, com o que foi digitado.** A
pessoa não pediu para ver aquele diálogo — ela chegou nele por consequência de
salvar. Descartar o que ela escreveu seria puni-la por isso.

**6. A migração é gravada na hora, não na próxima edição.** Isto foi um defeito
encontrado na verificação: a migração acontecia na leitura, mas quem abrisse o
app sem mexer em nada continuaria com o formato antigo no aparelho —
indefinidamente, e quebrando no dia em que aquela versão deixasse de ser lida. O
`CLAUDE.md` diz que migração é código de primeira classe; isso inclui persistir.

**7. Três defesas na normalização, porque isto lê dado que já está no aparelho
de alguém.** A linha do tempo é ordenada por data (a ordem é premissa de
`valorVigenteEm`), trechos repetidos no mesmo mês são reduzidos ao último, e o
trecho mais antigo é puxado para o início do lançamento — senão os meses entre o
início e o primeiro trecho ficariam sem valor nenhum.

## A migração

Esquema na versão 3. Um fixo da versão 2 tem seu `valor` solto convertido no
primeiro — e único — trecho, começando junto com o lançamento. Nenhum mês muda
de valor na travessia, e há teste para exatamente isso.

Avulsos continuam com `valor` simples: acontecem uma vez, e uma linha do tempo
para um único mês seria cerimônia sem ganho.

## O que ficou de fora

- **Ver a linha do tempo.** Não há tela que mostre "este aluguel já foi 500 e
  hoje é 620". O dado existe; a tela chega quando houver motivo.
- **Agendar um valor futuro.** Dá para fazer navegando até o mês e editando, mas
  não é oferecido — e "deste mês em diante" descarta trechos futuros, então quem
  agendar e depois editar no meio perde o agendamento. É consequência do
  significado literal da opção, e está aceito.

## Como verificar

```bash
node tests/nucleo.mjs
```

**109 testes** (eram 88). Os novos cobrem a resolução por mês, os três casos de
`definirValorDesde`, a migração da v2 sem perda, a normalização de linhas do
tempo tortas, e — o mais importante — a regressão: o resumo de um mês passado
tem que ficar **idêntico** depois de um aumento registrado no futuro.

No navegador, partindo de um estado v2 plantado à mão:

| O quê | Resultado |
|---|---|
| Abrir o app com dado v2 | Migra e **grava** a v3, com o realizado preservado |
| Aumentar o salário em janeiro/2027 | Janeiro mostra o novo; setembro/2026 fica idêntico |
| Renomear um fixo | Salva direto, sem perguntar |
| Cancelar no diálogo | Volta ao formulário com o valor digitado; nada muda |
| "Corrigir em todos os meses" | Achata a linha do tempo |
| Desfazer | Restaura a linha do tempo anterior inteira |
| 360px | Sem rolagem horizontal |
| Console | Nenhuma mensagem numa aba limpa |
