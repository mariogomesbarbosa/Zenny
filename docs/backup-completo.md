# A cópia volta inteira

O Mário guardou uma cópia no celular, trouxe de volta no desktop, e os cartões
não vieram. O relato estava certo, e o alcance era maior do que os cartões.

## O defeito

Sair estava certo. `montarBackup` envelopa o **estado inteiro**, e sempre
envelopou — o arquivo do celular tinha os cartões dentro.

Voltar é que escolhia. O `restaurar-confirmar` do `app.js` fazia isto:

```js
estado = { ...estado, lancamentos: lido.estado.lancamentos, realizados: lido.estado.realizados };
```

Dois campos do arquivo, e o resto **do aparelho**. Quando essa linha foi
escrita, no B4, o `Estado` tinha exatamente esses dois campos de dado e a linha
estava completa. Depois:

- o **B5** acrescentou `categorias` e `limites`;
- o **B6** acrescentou `cartoes` e `faturas`.

Nenhum dos dois blocos voltou para atualizar a linha — e não havia por que
voltar, porque nada apontava para ela. O `montarBackup` não precisou de
manutenção nenhuma: ele manda `estado`, e cresceu de graça. Só o outro lado
tinha uma lista de campos escrita à mão, num arquivo distante, esperando ser
esquecida.

## A metade silenciosa

O que se vê é a ausência dos cartões. O que não se vê é pior.

Os lançamentos restaurados vêm com `cartao: 'c1'` e `categoria: 'ifood-do-mes'`
— ids que existiam no aparelho de origem. Enxertados num aparelho que não tem
esse cartão nem essa categoria, eles ficam órfãos. E o `normalizarEstado` tem
uma regra deliberada para órfão: `cartao` que não existe vira `null`, e
`categoria` que não existe vira `null`.

Só que essa regra roda **na leitura do armazenamento**, não no enxerto. Então:

1. A pessoa restaura. A tela mostra as compras de cartão como despesas soltas —
   metade certo, e já estranho.
2. Ela fecha o app e abre de novo.
3. Agora o `normalizarEstado` passa, e o vínculo com o cartão vira `null` de
   verdade. A compra virou despesa comum do mês em que foi feita, e a categoria
   virou "sem categoria".

Perda de dado com um recarregamento de atraso é o pior formato possível: quem
for investigar já não vê o estado intermediário que explicaria o que aconteceu.

## Por que o teste não pegou

Existia teste de ida e volta pelo arquivo. A fixtura dele se chama
`ESTADO_CHEIO`, e era isto:

```js
const ESTADO_CHEIO = {
  versao: 6,
  lancamentos: [AVULSO, FIXO_ABERTO],
  realizados: { 'a1|2026-10': true },
  categorias: [],   // vazio
  limites: {},      // vazio
  cartoes: [],      // vazio
  faturas: {},      // vazio
};
```

Cheia de campos, vazia de dado — e vazia exatamente nos quatro campos que
quebraram. Quando o B5 e o B6 acrescentaram campos ao `Estado`, a fixtura ganhou
as chaves para o conferidor de tipos ficar calado, e não ganhou conteúdo. Um
teste que compara vazio com vazio passa em cima de qualquer defeito.

É a lição que este bloco deixa: **completude de estrutura não é completude de
dado.** A fixtura satisfazia o tipo e não exercitava nada.

## As decisões

**1. Restaurar troca o estado inteiro, sem lista de campos.** A linha vira
`estado = lido.estado`. É mais curta que a que estava, e não tem como
envelhecer: campo novo no `Estado` entra na cópia sem ninguém precisar lembrar.
O `lido.estado` já vem normalizado pelo `lerBackup`, então não há dado torto
entrando por essa porta.

Vale dizer por que trocar tudo é seguro: o que é do aparelho, e não do usuário,
mora **fora** do estado — o tema em `zenny-tema` e a data da última cópia em
`zenny:backup`, cada um na sua chave. Dentro do `Estado` só há dado que a pessoa
digitou, e é justamente isso que ela pediu de volta.

**2. A confirmação passa a dizer os cartões.** "Substituir tudo" só é aceitável
porque a pessoa lê antes o que entra e o que sai. O "tudo" cresceu no B6 e a
frase não: quem tem dois cartões no desktop e restaura uma cópia do celular
precisa saber que os dois saem. Agora a tela diz "A cópia tem 12 lançamentos e 2
cartões" e "Os 3 lançamentos e o 1 cartão que estão neste aparelho saem no
lugar".

Categorias próprias e limites continuam fora da frase, de propósito: são
atributos de lançamento, não coisas que a pessoa procura numa lista. Dizer
quatro números numa frase de confirmação é o mesmo que não dizer nenhum.

**3. `resumirEstado` conta cartões.** A frase precisa do número, e número que
aparece na tela sai do núcleo com teste — não de um `.length` no meio do
`app.js`.

**4. A fixtura do teste deixa de ser vazia onde importa.** `ESTADO_CHEIO` ganha
cartão com fechamento e vencimento, categoria criada pelo usuário, limite e
valor de fatura informado. E a ida e volta passa a conferir os **sete** campos
do estado, um por um, em vez de dois. É o teste de regressão do defeito.

## O que ficou de fora

- **`descartados` continua contando só lançamentos.** Cartão ou categoria que o
  arquivo traz torto sai em silêncio, como saía antes. A frase da confirmação
  teria de crescer para acomodar três contagens de descarte, e o caso é raro —
  arquivo editado à mão. Vai para [pendencias.md](pendencias.md).
- **Juntar duas cópias em vez de substituir.** Continua fora, como no
  [B4](b4-backup.md): decidir o que fazer com o mesmo lançamento vindo de dois
  aparelhos é assunto próprio, e a promessa hoje é explicitamente "substituir".

## Como verificar

```bash
npm run conferir
```

No navegador, o caminho que reproduz o defeito original:

1. Criar um cartão, uma compra nele, uma categoria própria e um limite.
2. **Ajustes → Guardar uma cópia.**
3. **Apagar tudo**, e criar um cartão diferente, para o aparelho não estar vazio.
4. **Trazer de volta**, e ler a confirmação: ela tem que citar os cartões dos
   dois lados.
5. Confirmar. A aba **Cartões** mostra o cartão da cópia, e não o que estava no
   aparelho. A compra aparece dentro da fatura dele.
6. **Recarregar a página** — é aqui que o defeito antigo cobrava a conta. A
   compra continua na fatura, e a categoria própria continua no lançamento.
