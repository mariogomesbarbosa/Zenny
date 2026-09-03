# B0 — Esqueleto do app

O primeiro bloco. Não implementa nenhuma regra de negócio: entrega a casca em
que os blocos seguintes vão morar, e — o que importa mais neste momento — deixa
o app instalável num celular de verdade desde o começo, para que cada bloco
possa ser testado onde ele vai ser usado.

## O que entrou

- Navegação entre três telas (Início, Gastos, Metas) por hash, sem framework.
- Tema claro e escuro, seguindo o sistema por padrão e com alternância manual
  persistida.
- PWA: `manifest.webmanifest`, service worker e ícones — instala como app no
  Android e abre sem rede.
- Layout mobile first: base em 360px, barra inferior no celular, coluna à
  esquerda a partir de 768px.
- Estados vazios que dizem o que vai aparecer ali e em qual bloco.

## Decisões, e o porquê

**1. Arquivos separados (`index.html`, `styles.css`, `app.js`), divergindo do
Daysk.** O Daysk vive num único `index.html` de 10 mil linhas e a decisão foi
consciente lá. Aqui não: separar depois custa muito mais que começar separado, e
não há nada no projeto que ganhe com o arquivo único. O service worker resolve o
custo de rede da separação.

**2. Tipografia da pilha do sistema, sem Google Fonts.** O público-alvo está em
Android de entrada com dado móvel limitado. Uma fonte web custa uma requisição
bloqueante e um *flash* de texto na primeira pintura. Fonte bonita não vale o
preço quando a promessa do produto é "abre e usa".

**3. O `<main>` rola, não o `<body>`.** Com o body rolando, a barra inferior no
iOS aparece e some de forma imprevisível e a navegação "pula". Custo: um
`min-height: 0` que não é óbvio — está comentado no CSS.

**4. Grid no desktop, flex no celular.** A primeira versão usava flex com
`flex-wrap` nos dois. Não funciona: com quebra de linha, a altura da segunda
linha depende do conteúdo, e a coluna que rola perde a altura definida de que o
`overflow` precisa. O grid dá as duas dimensões explicitamente.

**5. Ícones gerados por script (`tools/gerar-icones.mjs`).** O manifest do
Android exige PNG — SVG não instala como WebAPK. A máquina não tem ImageMagick
nem Python, e depender de site de conversão significaria que ninguém mais
conseguiria regenerar. O script rasteriza com zlib, que já vem no Node. A marca
passa a viver num lugar só.

**6. O tema é aplicado antes da primeira pintura**, por um script inline no
`<head>`. Se esperar o `app.js`, quem usa tema escuro leva um flash branco na
cara toda vez que abre.

**7. Toda leitura e escrita no `localStorage` vai dentro de `try/catch`.** Em
aba anônima com cookies bloqueados ele lança exceção. Um app que quebra inteiro
porque não conseguiu salvar a preferência de tema seria um jeito bobo de perder
usuário.

## O que ficou de fora, de propósito

- Qualquer modelo de dados. Dinheiro entra no B1, junto com os testes.
- O botão de instalar o app (capturar o `beforeinstallprompt`). Vale, mas é
  assunto próprio e não bloqueia nada.
- Onboarding. A promessa é justamente não ter um.

## Como verificar

```bash
npx --yes http-server . -p 8142 -c-1
```

Verificado no navegador durante a implementação:

| O quê | Resultado |
|---|---|
| Layout em 360px | Sem rolagem horizontal; conteúdo com a largura exata da janela |
| Layout em 996px | Coluna de 200px à esquerda, conteúdo com 720px, itens de 44px |
| Navegação por hash | Troca a tela e move o `aria-current` |
| Hash inválido (`#/xpto`) | Cai em Início, sem erro |
| Alternância de tema | Fundo muda de `#14181c` para `#f6f4ef` e persiste |
| Service worker | Registrado e controlando a página |
| Botão flutuante | Mostra o aviso "Registrar gastos chega no B1." |
| Console | Nenhuma mensagem, em nenhum momento |

> Nota sobre o cache: `styles.css` e `app.js` são servidos pelo service worker
> com cache primeiro. Depois de editar um deles em desenvolvimento, recarregar
> não basta — é preciso limpar o cache (DevTools → Application → Clear storage)
> ou desregistrar o worker. É o preço da estratégia, e é deliberado.
