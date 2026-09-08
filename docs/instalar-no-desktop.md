# Instalar no desktop

O Zenny instalava no Chrome do Android e não oferecia instalação no Chrome do
desktop. O Daysk, escrito com as mesmas regras e hospedado na mesma conta do
GitHub Pages, oferecia. Este documento registra o que a investigação achou —
porque o achado não era o que se esperava — e as quatro decisões que saíram
dela.

## O que não era

Antes de mexer em qualquer coisa, o que o GitHub Pages serve de verdade foi
conferido contra a lista de requisitos do Chrome:

| Requisito | Como estava |
|---|---|
| `manifest.webmanifest` acessível | 200, `application/manifest+json` |
| `display` em `standalone`, `fullscreen` ou `minimal-ui` | `standalone` |
| `start_url` e `scope` válidos | `./` nos dois |
| Ícone 192×192 e 512×512 com `purpose: any` | 200, dimensões conferidas nos bytes do PNG |
| Service worker com handler de `fetch` | registrado no `load`, handler em `sw.js` |

Nada faltava. E comparado linha por linha com o manifest do Daysk, o do Zenny
divergia em exatamente dois campos: `id` e `orientation`.

## O achado: os dois apps diziam ser o mesmo app

Os dois manifests declaravam `"id": "./"`.

O `id` tem uma armadilha na especificação: ele **não** é resolvido contra a URL
do manifest, e sim contra a **origem**. Então `"./"` não significa "esta pasta":

- Zenny: `"./"` → `https://mariogomesbarbosa.github.io/`
- Daysk: `"./"` → `https://mariogomesbarbosa.github.io/`

Como os dois moram na mesma origem do GitHub Pages, os dois estavam dizendo ao
navegador que **são o mesmo app**. É o tipo de defeito que não aparece em
teste: cada aparelho decide pelo que foi instalado primeiro, e o repositório
parece correto lido sozinho — a colisão só existe porque há um vizinho.

O `id` é a identidade permanente do app instalado. Mudá-lo depois de alguém ter
instalado faz o navegador tratar o resultado como um app **novo**, e o antigo
fica na tela inicial apontando para lugar nenhum. Aqui o custo é aceitável: o
único aparelho com o Zenny instalado é o celular do Mário, e o conserto é
desinstalar e instalar de novo. Ver a ressalva em
[pendencias.md](pendencias.md).

## As decisões

**1. `id` passa a ser `/Zenny/`, escrito por extenso.** Caminho absoluto, sem
`./`, exatamente porque a forma relativa é a que engana. O Daysk merece o mesmo
conserto, e é PR do outro repositório.

**2. `orientation` sai do manifest.** Travar em retrato não descreve este app:
ele tem layout de desktop desde o alinhamento do B0, e a janela do desktop não
tem orientação para travar. Não há indício de que o campo bloqueasse a
instalação — ele sai por descrever errado, não por castigo. Efeito colateral no
celular: o app instalado passa a acompanhar a rotação do aparelho, e em paisagem
cai no layout largo, que já existe e já foi verificado.

**3. O botão de instalar mora em Ajustes, e só aparece quando dá para
instalar.** É o item que o [B0](b0-esqueleto.md#o-que-ficou-de-fora) deixou de
propósito para "assunto próprio" — este assunto. O navegador avisa que o app
cumpre os requisitos pelo evento `beforeinstallprompt`; sem evento na mão, não
há botão. Um "Instalar" que não instala — porque o Firefox não instala, porque o
app já está instalado, porque falta um requisito — é pior que ausência: ensina
que o app é quebrado.

Isso dá ao botão um segundo uso, o de diagnóstico. Se ele aparece, o app é
instalável e o que faltava era o caminho. Se não aparece, o problema é anterior
e está no manifest ou no service worker.

**4. Nada de instrução manual para quem o navegador não oferece.** Safari e
Firefox no desktop não instalam PWA, e cada um tem seu próprio caminho de
"adicionar à tela". Escrever esse passo a passo significaria mantê-lo correto
para quatro navegadores que mudam de menu sem avisar. Quem não recebe o botão
não perde nada: o app funciona igual na aba.

## O que ficou de fora

- **`screenshots` no manifest.** Com elas, o Chrome do desktop troca o diálogo
  seco de instalação por um com prévia do app. Não é requisito — o Daysk
  instala sem elas — e exige captura real de tela em duas proporções, que o
  repositório não tem como gerar sem navegador de verdade nem dependência de
  peso. Vai para [pendencias.md](pendencias.md).
- **Instalar o app de dentro do onboarding.** Não há onboarding, de propósito.
- **Conserto do `id` do Daysk.** Mesmo defeito, outro repositório.

## Como verificar

```bash
npx --yes http-server . -p 8142 -c-1
```

O `beforeinstallprompt` exige origem segura: `localhost` conta, e é por isso que
a verificação local prova o caminho.

1. Abrir `http://localhost:8142/` no Chrome, ir em **Ajustes**. O cartão
   "Instalar o Zenny" tem que estar lá.
2. Clicar. O diálogo de instalação do Chrome aparece. Cancelar: o cartão
   desaparece — o convite serve uma vez só — e volta ao recarregar a página.
3. Instalar. A janela do app abre sem barra de endereço, e o cartão não volta:
   com o app instalado, o navegador não emite mais o evento.
4. Em produção, com o `id` novo, o ícone de instalar do Chrome volta a aparecer
   na barra de endereço da aba do Zenny mesmo com o Daysk instalado.
