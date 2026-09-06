/* Empacota o Zenny num HTML único, para publicar como artefato de teste.
 *
 * O app de produção continua sendo três arquivos servidos como estáticos — esta
 * é uma FERRAMENTA de desenvolvimento, na mesma categoria do conferidor de
 * tipos e do gerador de ícones. Nada que ela produz volta para o repositório
 * servido: `zenny.html` é descartável, e está no .gitignore.
 *
 * Por que empacotar em vez de servir os três: o artefato é uma página só, e a
 * política de conteúdo dele bloqueia buscar CSS, JS e imagem de fora. Então
 * tudo vira embutido — inclusive o logo, que virou data: URI.
 *
 * A regra que este script não pode quebrar: o comportamento tem que ser o mesmo
 * do app servido. Ele só concatena e remove o que não existe no artefato (o
 * service worker, que precisa de escopo de origem própria). Nenhuma linha de
 * lógica é reescrita — se precisar reescrever, o problema é do app, não daqui.
 *
 * Uso:  node tools/gerar-artefato.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** @param {string} caminho @returns {string} */
const ler = (caminho) => readFileSync(new URL('../' + caminho, import.meta.url), 'utf8');

const html = ler('index.html');
const css = ler('styles.css');
const nucleo = ler('nucleo.js');
const app = ler('app.js');
const logo = ler('assets/logo.svg');

/* ---------- o corpo ---------- */

const corpo = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('<script type="module"'))
  /* O logo vira data: URI. `assets/logo.svg` seria uma busca externa, que a
     política do artefato bloqueia — e sem erro visível: a imagem simplesmente
     não aparece. */
  .replace(
    'src="assets/logo.svg"',
    'src="data:image/svg+xml;base64,' + Buffer.from(logo, 'utf8').toString('base64') + '"'
  )
  .trim();

/* ---------- o script ---------- */

/* Os dois módulos viram um só. `export` sai porque um <script type="module">
   embutido não é importável por caminho — as declarações passam a ser irmãs no
   mesmo escopo, e os nomes que o app.js usava do núcleo continuam valendo.

   A âncora é `\nexport ` (início de linha): sem ela, a palavra dentro de um
   comentário ou de uma string também seria apagada. */
const nucleoEmbutido = nucleo.replaceAll('\nexport ', '\n');

const app_ = app
  // O bloco de import inteiro, do `import {` até o `';` que fecha o from.
  .replace(/^import \{[\s\S]*?\} from '\.\/nucleo\.js';\n/m, '')
  /* O service worker precisa de escopo de origem própria e de um arquivo servido
     — nenhum dos dois existe aqui. Sem cortar, o registro falha e suja o console
     com um erro que não é do app. O `.catch` do próprio código já o tornaria
     inofensivo; o corte é para o console ficar limpo de verdade. */
  .replace(
    /\/\* ---------- Service worker ---------- \*\/[\s\S]*?\n\}\n/,
    '/* O service worker fica de fora do artefato: ver tools/gerar-artefato.mjs. */\n'
  );

/* ---------- o bootstrap do tema ---------- */

/* Vem do index.html em vez de ser reescrito aqui: duas cópias da mesma regra
   divergiriam, e esta decide se a tela pisca branca antes da primeira pintura. */
const bootstrap = html.slice(html.indexOf('<script>'), html.indexOf('</script>') + '</script>'.length);

/* ---------- a montagem ---------- */

/* Sem <!DOCTYPE>, <html>, <head> nem <body>: o artefato embrulha isto num
   esqueleto próprio, e repetir as tags produziria HTML aninhado inválido. */
const saida = `<title>Zenny</title>
<style>
${css}
</style>

${bootstrap}

${corpo}

<script type="module">
${nucleoEmbutido}
${app_}
</script>
`;

writeFileSync(new URL('../zenny.html', import.meta.url), saida);

const kb = (Buffer.byteLength(saida, 'utf8') / 1024).toFixed(0);
console.log(`zenny.html gerado — ${kb} KB`);
