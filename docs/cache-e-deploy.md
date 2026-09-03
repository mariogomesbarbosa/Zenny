# Cache e deploy: por que o código do app vem sempre da rede

Documento curto sobre uma decisão que não é óbvia e que, errada, produz o pior
tipo de defeito: o que só acontece com quem já usou o app, some sozinho, e
desaparece justamente quando alguém vai investigar.

## O defeito

A primeira versão do `sw.js` servia o documento pela rede e **todo o resto** pelo
cache, revalidando em segundo plano. A justificativa estava escrita lá e parecia
sólida: ícones e código são imutáveis na prática, e é onde está o peso.

A armadilha é a sequência do deploy:

1. O usuário tem a versão antiga instalada, com o service worker antigo ativo.
2. Sai um deploy que muda `index.html` e `app.js` juntos.
3. O usuário abre o app. O documento vem da rede, então é o **novo**. Mas quem
   controla essa carga ainda é o service worker **antigo**, que serve `app.js`
   do cache — o **velho**.
4. Resultado: HTML novo rodando com JavaScript velho, por uma visita.

O service worker novo instala em paralelo, assume, e na abertura seguinte tudo
volta ao lugar. Ou seja: o defeito se apaga sozinho antes de ser reproduzido.

Isso apareceu de verdade neste projeto, na publicação do PR #4. O sintoma foi
brando — o site ainda dizia "Entradas" depois do deploy que trocou para
"Receitas" — porque só o HTML tinha mudado. Se `app.js` tivesse mudado junto,
o app teria rodado numa mistura de duas versões.

## As saídas que não servem

**Versionar o nome dos arquivos** (`app.a1b2.js`) é a solução da indústria e
exige build, que este projeto proíbe. Fazer à mão, a cada deploy, é pior: passa
a depender de disciplina humana, e disciplina humana falha em silêncio.

**Pendurar `?v=N` nas URLs** parece barato até você contar os lugares: o
`index.html` referencia `styles.css` e `app.js`, o `app.js` importa `nucleo.js`,
e o `sw.js` guarda a lista. São quatro pontos para manter em sincronia, e o dia
em que alguém esquecer um deles é o dia em que o defeito volta — calado.

Nos dois casos a correção **depende de alguém lembrar de alguma coisa**. É
exatamente o tipo de solução que o resto deste projeto recusa: o argumento a
favor dos lançamentos fixos é que o app não pode cobrar disciplina do usuário, e
o mesmo vale para quem mantém o código.

## A regra que ficou

Duas categorias, decididas pelo caminho do arquivo:

| O quê | Estratégia | Por quê |
|---|---|---|
| Código do app: documento, `styles.css`, `app.js`, `nucleo.js`, `manifest.webmanifest` | Rede primeiro, cache como rede de segurança | Garante que HTML e JavaScript venham sempre do mesmo deploy, sem depender de ninguém bumpar versão |
| O resto: ícones, a marca | Cache primeiro, revalidando em segundo plano | São imutáveis na prática e é onde está o peso |

O custo é de cinco arquivos pequenos por abertura com rede. O ganho é nunca
servir uma mistura de duas versões.

**O escopo é derivado da localização do próprio service worker**, não fixado:
em produção o app vive em `/Zenny/` (GitHub Pages) e em desenvolvimento na raiz.
Um caminho fixo faria a regra valer só em um dos dois — e falhar no outro sem
avisar.

## O prazo, e por que ele existe

Rede primeiro, sozinho, é hostil em conexão ruim: a tela fica em branco enquanto
o navegador espera um servidor que talvez nunca responda. O público-alvo está em
dado móvel limitado, então há um **prazo de 3 segundos**: passado ele, o cache
atende.

O relógio **não cancela a requisição**. Se a rede responder depois, a resposta
ainda atualiza o cache — o usuário já recebeu a versão guardada, e a próxima
abertura pega a nova. Cancelar economizaria bytes e adiaria a atualização para
sempre em quem vive em rede ruim, que é justamente quem menos pode pagar por
isso.

## O que foi verificado

Com o service worker instalado e `VERSAO` **intocada** — o cenário exato do
defeito:

| Teste | Resultado |
|---|---|
| Alterar `styles.css` e `app.js` no disco e recarregar **uma vez** | As duas versões novas chegaram |
| Derrubar o servidor e recarregar | O app abriu completo, com os dados, em 14ms |
| Instalação limpa | Cache `zenny-v4` com os nove arquivos do shell, e o cache antigo apagado |

**O caminho do prazo de 3 segundos não foi exercitado.** Os testes cobrem a rede
respondendo e a rede recusando a conexão, que falha rápido; simular uma rede que
aceita e depois pendura exigiria um servidor de teste próprio. A lógica está
escrita e revisada, mas não foi observada rodando — está registrado em
[pendencias.md](pendencias.md).
