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

- **Sem build e sem dependências em runtime.** HTML, CSS e JavaScript puros,
  servidos como arquivos estáticos. Nada de framework, nada de transpilação,
  nada de npm no que o navegador baixa. O arquivo que o usuário recebe é o que
  está no repositório, byte por byte. Se uma biblioteca de runtime parecer
  necessária, isso é assunto de PR próprio com justificativa — não se resolve no
  meio de outro bloco.
- **Ferramenta de desenvolvimento é outra categoria.** `npm install` traz o
  conferidor de tipos, e só isso; `node_modules` não é servido e está no
  `.gitignore`. O contrato é simples: se aparece no navegador, não tem
  dependência; se ajuda a escrever, pode ter. Ver
  [docs/tipos-sem-build.md](docs/tipos-sem-build.md).
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

## Os agentes do projeto

Quatro agentes vivem em `.claude/agents/`, cada um com o contexto do Zenny e as
regras deste arquivo já carregados. **Eles são versionados de propósito**: sem
isso morreriam junto com a sessão que os criou.

| Agente | Cuida de | Modelo |
|---|---|---|
| `nucleo` | As funções puras: dinheiro, meses, estado, resumo, migração. Escreve a função **e** o teste | opus |
| `interface` | `index.html`, `styles.css` e o DOM em `app.js`. Mobile first em 360px | sonnet |
| `verificador` | Exercita no navegador de verdade e relata. Não corrige | sonnet |

O recorte é grande de propósito: subagente isola contexto e economiza quando o
escopo paga o próprio carregamento, e encarece quando se delega um ajuste de
três linhas. Para tarefa pequena, faça direto. O raciocínio está em
[docs/agentes.md](docs/agentes.md).

Duas fronteiras que não se cruzam: o `nucleo` nunca toca DOM, e a `interface`
nunca faz conta com dinheiro. Quando um deles precisar do outro lado, ele
**para e diz** — em vez de resolver no lugar errado.

## Fluxo de trabalho

Nada entra na `main` por commit direto. Cinco passos:

1. **Planejar antes de codar.** Bloco novo começa com um documento em `docs/`
   descrevendo as decisões e o que fica de fora. Ele entra no **mesmo PR** da
   implementação, como primeiro commit — não é etapa separada com aprovação
   própria. O que importa é que a decisão exista escrita antes do código, não
   que ela passe por um rito.
2. **Branch por bloco**, a partir da `main` atualizada: `feat/descricao-curta`,
   `fix/descricao-curta`, `docs/descricao-curta`.
3. **Commits em português, no imperativo, sem acentos no título** (o terminal do
   Windows corrompe acentos no log). Prefixo `feat:`, `fix:`, `docs:`,
   `refactor:`, `test:`. O corpo pode ter acentos, e é onde o porquê mora.
4. **Verificar antes do PR.** `npm run conferir` em silêncio, e o navegador
   exercitado — com o agente `verificador` quando o bloco for grande, direto
   quando for pequeno. "Deve funcionar" não conta. O que só um aparelho real
   prova não se declara verificado: vai para `docs/pendencias.md`, junto de
   qualquer outra ressalva que o bloco deixar.
5. **Abrir PR** com o que mudou, por quê, e como verificar. Desvio do plano vai
   no corpo — desvio escondido é dívida. O merge é feito pelo Claude depois do
   OK do Mário.

## Testes

`tests/` roda com `node tests/<arquivo>.mjs`, sem framework. O alvo são as
funções puras — cálculo, formatação de valores, regras de categoria. Interface
se verifica no navegador; lógica de dinheiro se verifica com teste.

Regra dura: **toda função que faz conta com dinheiro tem teste e tipo.** Erro de
centavo destrói a confiança no app inteiro.

`npm run conferir` roda o conferidor de tipos e os testes de uma vez. Ele tem
que ficar em silêncio antes de abrir PR. O conferidor não substitui o navegador:
interface se verifica olhando, como sempre.
