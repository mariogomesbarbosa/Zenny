# Zenny — como trabalhar neste projeto

Leia antes de escrever a primeira linha de código. Este arquivo é o contrato de
trabalho do repositório: o que o produto é, o que ele se recusa a ser, e como
uma mudança sai da ideia até a `main`.

## O produto em uma frase

Zenny ajuda jovens adultos a cuidar do próprio dinheiro sem medo — planejamento
e educação financeira em doses pequenas, na rotina, sem jargão e sem curva de
aprendizado.

O detalhamento está em [docs/conceito.md](docs/conceito.md). Leia antes de
propor qualquer funcionalidade: metade das decisões deste projeto é sobre o que
**não** entra.

## Princípios que valem mais que qualquer feature

1. **A primeira tela não pode intimidar.** Se uma tela pede mais de um dado para
   entregar valor, ela está errada. O usuário-alvo abandona na fricção, não na
   falta de recurso.
2. **Nada de jargão.** "Fluxo de caixa", "aporte", "provisionamento" estão
   proibidos na interface. Escreva como se explicasse para um amigo.
3. **Mobile first, de verdade.** Todo layout começa em 360px de largura. Desktop
   é adaptação, não o ponto de partida. Media queries usam `min-width`, nunca
   `max-width`.
4. **O app é do usuário.** Dados ficam no aparelho (localStorage). Nada de
   cadastro obrigatório para começar a usar.
5. **Educar no contexto, não em uma aba de "conteúdo".** A explicação aparece
   onde a dúvida nasce.

## Regras técnicas

- **Sem build e sem dependências.** HTML, CSS e JavaScript puros, servidos como
  arquivos estáticos. Nada de npm no runtime, nada de framework, nada de
  transpilação. Se uma biblioteca parecer necessária, isso é assunto de PR
  próprio com justificativa — não se resolve no meio de outro bloco.
- **Arquivos separados**: `index.html`, `styles.css`, `app.js`. Esta é uma
  divergência deliberada do Daysk, que vive num único `index.html` de 10 mil
  linhas. Zenny começa separado porque separar depois custa caro.
- **Persistência**: `localStorage`, com uma única chave raiz e versão do
  esquema. Migração de dados é código de primeira classe, não gambiarra.
- **PWA**: `manifest.webmanifest` + `sw.js`. O app tem que instalar como app de
  verdade no Android (WebAPK) e abrir sem rede.
- **Ícones do PWA** são gerados por `tools/gerar-icones.mjs` (`node
  tools/gerar-icones.mjs`). Não edite os PNGs à mão — mexa no script e rode de
  novo.
- **Idioma**: interface, documentação e comentários em português do Brasil.
- **Comentários explicam o porquê**, não o quê. Comentário que narra o código é
  ruído; comentário que preserva uma decisão vale ouro seis meses depois.

## Fluxo de trabalho — obrigatório

Nada entra na `main` por commit direto. Todo trabalho segue este ciclo:

1. **Planejar antes de codar.** Bloco novo começa com um documento em `docs/`
   descrevendo as decisões e o que fica de fora. O plano é revisado antes da
   implementação.
2. **Branch por bloco**: `feat/descricao-curta`, `fix/descricao-curta`,
   `docs/descricao-curta`. Sempre a partir da `main` atualizada.
3. **Commits em português, no imperativo, sem acentos no título** (o terminal do
   Windows corrompe acentos no log). Prefixo `feat:`, `fix:`, `docs:`,
   `refactor:`, `test:`. O corpo do commit pode ter acentos.
4. **Verificar no navegador antes de abrir o PR.** Subir o preview, exercitar a
   mudança, conferir console e layout em 360px. "Deve funcionar" não conta.
5. **Abrir PR** com o que mudou, por quê, e como verificar. Se houve desvio do
   plano, o desvio vai no corpo do PR — desvio escondido é dívida.
6. **Esperar o OK do Mário para fazer o merge.** O merge é feito pelo Claude,
   com `gh pr merge --merge --delete-branch`, só depois da aprovação explícita.
7. **Documentar o que ficou pendente** em `docs/pendencias.md`, em especial o
   que foi para a `main` sem verificação visual.

## Testes

`tests/` roda com `node tests/<arquivo>.mjs`, sem framework. O alvo são as
funções puras — cálculo, formatação de valores, regras de categoria. Interface
se verifica no navegador; lógica de dinheiro se verifica com teste.

Regra dura: **toda função que faz conta com dinheiro tem teste.** Erro de
centavo destrói a confiança no app inteiro.
