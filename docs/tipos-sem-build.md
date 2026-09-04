# Tipos sem build

Verificação de tipos no Zenny, sem bundler, sem transpilação e sem mudar um
arquivo do que se serve ao navegador.

## Como isto começou

O Mário propôs migrar para Vite + TypeScript + Node, com uma motivação concreta:
sincronizar o backup com o Google Drive, no modelo do WhatsApp, e a impressão de
que HTML puro limitaria isso.

**A premissa não se sustentava.** O backup no Drive não precisa de build,
TypeScript nem Node:

- A autorização é o [Google Identity Services](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
  com *authorization code flow* + PKCE, que é o fluxo que o Google recomenda
  para navegador. É uma tag `<script>`.
- A gravação é a Drive API v3 na [`appDataFolder`](https://developers.google.com/workspace/drive/api/guides/appdata),
  por `fetch()`.

Node é runtime de servidor. Adotá-lo significaria adicionar um **backend** —
hospedagem, guarda de token de terceiro, LGPD — e o Drive não pede isso. Sem
backend é até melhor para a promessa do conceito: o token vai do navegador direto
ao Google, e nenhum dado do usuário passa por servidor nosso.

O que sobrou do pedido, depois de tirar a premissa errada, foi legítimo e é o
que este bloco entrega: **segurança de tipos**. Ela não exige build.

## A decisão

O TypeScript entra como **conferidor**, não como compilador:

- `tsconfig.json` com `allowJs`, `checkJs`, `strict` e `noEmit`
- Os tipos vivem em **JSDoc**, dentro dos próprios `.js`
- `npm run conferir` roda o conferidor e os testes

Nada é gerado. O arquivo que o navegador baixa é o `app.js` que está no
repositório, byte por byte. O `npm` existe só na máquina de quem desenvolve, e
o `node_modules` está no `.gitignore`.

A regra do `CLAUDE.md` — *"sem build e sem dependências, nada de npm no
runtime"* — continua valendo inteira. O que este bloco acrescenta é uma
dependência de **desenvolvimento**, na mesma categoria dos testes.

## O que o conferidor achou

Foram 356 erros na primeira passada com `strict`. Nenhum deles era erro de
conta com dinheiro — o que é uma boa notícia sobre o código, e vale dizer sem
inflar: **o conferidor não encontrou nenhum defeito de valor**.

Mas encontrou três coisas que valeram a passada:

**1. `proporcoesDasBarras` pedia mais do que usava.** A assinatura recebia o
`Resumo` inteiro, e a conta usa dois números de cada lado. O erro apareceu num
teste que já passava um resumo parcial — o teste estava certo, e a função estava
prometendo uma dependência que não tinha. Agora ela pede só o que lê.

**2. `eraFixo` respondia à pergunta sem dar acesso à resposta.** O padrão
`const eraFixo = editando && editando.fixo` aparecia três vezes, e depois dele o
código lia `editando.valores` — o que só era seguro porque o leitor humano
lembrava da implicação. Virou `fixoEmEdicao()`, que devolve o fixo ou `null`, e
carrega a garantia junto com o dado.

**3. `lerBackup` devolve uma união discriminada, e os testes não checavam.** Ler
`.estado` de um resultado que pode ser `{ok: false}` é testar `undefined`. Os
testes ganharam `lerOk()` e `erroDe()`, que exigem escolher o lado antes de ler.

## Decisões, e o porquê

**1. Os tipos do domínio moram no núcleo.** `Lancamento`, `Estado`, `Resumo` e
os outros ficam em `nucleo.js`, junto das funções que os produzem, e o `app.js`
os importa com `import('./nucleo.js')` dentro do JSDoc. Um arquivo separado de
tipos seria um segundo lugar para a mesma verdade.

**2. `Avulso` e `Fixo` se distinguem por `fixo: false` e `fixo: true`.** Isso
faz do par uma união discriminada: dentro de um `if (l.fixo)` o conferidor sabe
que existe `valores` e não existe `data`. É o que transforma a regra do B3 em
algo que a ferramenta cobra, em vez de algo que a gente lembra.

**3. `$()` promete um elemento, e a promessa é verificada.** Ela lança quando o
id não existe, com o id na mensagem — em vez de devolver `null` e estourar
quarenta linhas depois num "cannot read properties of null". Todos os ids do app
são estáticos: se existe em desenvolvimento, existe em produção. Isso é erro de
programação, não estado de execução.

**4. Três irmãos tipados: `$campo`, `$selecao`, `$dialogo`.** `.value`,
`.checked`, `.close()` e `.showModal()` não moram em `HTMLElement`. Sem os
irmãos, cada um dos 37 usos precisaria da sua própria anotação; com eles, a
informação fica num lugar só — e o código diz que tipo de coisa está buscando.

**5. `normalizarEstado` recebe `any`, de propósito.** É a fronteira do sistema:
entra o que estava no `localStorage` ou num arquivo editado à mão. Prometer uma
forma para esse dado seria mentir para o conferidor — o corpo da função existe
justamente para transformar qualquer coisa em algo utilizável.

**6. Os testes ganharam `lixo()`.** Vários testes passam `undefined` de
propósito, porque provar que a função sobrevive a dado torto é o contrato dela.
O nome deixa a intenção explícita, em vez de esconder um cast no meio da linha.

**7. `sw.js` fica fora da conferência.** Service worker roda no escopo
`WebWorker`, cujos tipos conflitam com os do DOM que o resto do app usa. Os dois
no mesmo programa produzem erro em todo lugar. Conferir o service worker exigiria
um segundo `tsconfig` — trabalho para quando ele crescer.

## O que ficou de fora

- **Vite, bundler, transpilação.** Não habilitam nada que o app precise, e
  colocariam um passo de build entre o Mário e o navegador. Hoje se clona e
  abre.
- **Node no runtime, e portanto backend.** Ver a primeira seção.
- **`.ts` de verdade.** Exigiria compilar, o que é exatamente o que este
  caminho evita. JSDoc dá o mesmo conferidor com outra sintaxe.
- **Um segundo `tsconfig` para o `sw.js`.** Ver decisão 7.
- **Conferência no CI.** Não há GitHub Action no projeto. `npm run conferir`
  roda na mão, junto da verificação no navegador que o `CLAUDE.md` já exige.

## Como verificar

```
npm install        # só na primeira vez
npm run conferir   # tipos + testes
```

O conferidor deve dizer nada (silêncio é sucesso) e os testes devem passar 149.

O app não muda em nada: as 46 verificações do B4 e as 24 de layout continuam
passando, com o console limpo, depois de todo o refactor.
