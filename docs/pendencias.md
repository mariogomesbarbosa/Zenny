# Pendências e ressalvas

Lista viva. Serve para que uma ressalva conhecida não seja redescoberta como bug
seis meses depois.

## Em aberto

| # | Ressalva | Por que ficou assim |
|---|---|---|
| 1 | O prazo de 3 segundos do service worker não foi exercitado | Os testes cobrem a rede respondendo e a rede recusando conexão (que falha rápido). Simular uma rede que aceita e depois pendura exigiria um servidor de teste próprio. Ver [cache-e-deploy.md](cache-e-deploy.md) |
| 2 | O MVP original (`planejador-financeiro.html`, fora do repositório) tem um salário real embutido como dado semente | Por isso não foi commitado. Se for compartilhado, o dado vaza |
| 3 | **O menu de compartilhar do Android nunca foi exercitado.** O B4 foi verificado em Chromium de desktop, onde `navigator.canShare` recusa arquivos — então todo teste passou pelo caminho de reserva, o download | Só o aparelho real prova esse caminho. É o que mais importa no bloco, porque é o que faz a cópia sair do celular. **Verificar antes de confiar no backup** |
| 4 | O arquivo de backup não é criptografado, e carrega quanto a pessoa ganha | Decisão consciente (ver [b4-backup.md](b4-backup.md#o-que-ficou-de-fora)): senha esquecida transforma backup em nada. A tela avisa em uma linha, para a pessoa escolher onde guardar. É a decisão do bloco com maior chance de merecer revisão |
| 5 | `Blob.text()` e o construtor `File` são usados sem alternativa antiga | O `File` está protegido por `try`, e cai no download. O `.text()` não tem reserva: em navegador anterior a 2019 o "Trazer de volta" falharia calado. O Chrome do Android se atualiza sozinho, então o risco é pequeno — mas é risco |
| ~~6~~ | ~~O PR que criou os agentes não passou pelo `juiz`~~ | **Resolvida.** O `juiz` revisou o PR #11 depois do merge, e achou cinco coisas que a passada manual não viu. Duas viraram decisão pendente do Mário: "lançamento" na tela e as cores literais fora do `:root` — ver as pendências abaixo |
| 7 | As verificações de navegador (46 do B4, 24 de layout) vivem fora do repositório | Rodam com Playwright, que seria a primeira dependência de peso do projeto. Hoje só quem tem a sessão aberta as reproduz. Se virarem hábito, merecem PR próprio para entrar em `tests/` |
| 9 | **`ocultarCategoria` existe no núcleo, tem teste, e não tem tela.** A decisão 4 do B5 — "categoria criada pelo usuário não se apaga, se esconde" — chegou pela metade: a pessoa cria categorias e a lista só cresce | Apontado pelo `juiz` na revisão do B5 e não resolvido no bloco. A função está pronta; falta o caminho na interface, provavelmente na própria folha de escolha |
| 10 | A barra de cada linha do Relatório é proporcional ao **maior gasto do mês**, e a legenda ao lado fala do **limite** — duas escalas na mesma linha | É o desenho que o plano decidiu, e é consistente com as barras do painel. Mas uma barra cheia num gasto que não estourou o limite pode confundir. Só o uso real diz se incomoda |
| 11 | Mudar a descrição de um registro não faz o app sugerir a categoria de novo | O contrário — sugerir sempre — ressuscitaria a categoria que a pessoa tirou de propósito, que é pior. Enquanto o dado não distinguir categoria *sugerida* de categoria *escolhida*, uma das duas pontas fica errada |
| 8 | O `sw.js` fica fora da conferência de tipos | Service worker roda no escopo `WebWorker`, cujos tipos conflitam com os do DOM. Conferir os dois exigiria um segundo `tsconfig`. Ver [tipos-sem-build.md](tipos-sem-build.md) |
| 12 | A compra cai na fatura do mês seguinte por regra fixa, sem data de fechamento | Fechamento seria um terceiro campo na criação do cartão, contra o princípio dos dois campos, e a regra M+1 acerta na esmagadora maioria dos casos. A conta mora sozinha em `mesDaFatura`, então trocá-la depois é mexer num lugar só — e nada do que o B6 grava precisa migrar |
| 13 | Compra parcelada não existe | Decisão do Mário: bloco próprio. É a dor mais real do cartão depois da fatura, e cada pergunta que ela abre — juros? antecipar? o que acontece ao apagar a terceira de seis? — merece plano em vez de improviso |
| 14 | Cartão arquivado não tem como voltar | `arquivarCartao` esconde da lista e para de gerar fatura, mas não há tela para desarquivar. Mesma lacuna da pendência 9, e a mesma resposta: enquanto ninguém arquivar por engano, ela é barata |

## Resolvidas

| Ressalva | Como se resolveu |
|---|---|
| Editar um lançamento fixo reescrevia o passado | O B3 trocou o valor único do fixo por uma linha do tempo de valores. Registrar um aumento passa a preservar os meses já fechados, e há teste de regressão para isso |
| O mapa de pagos crescia sem limpeza (herdado do MVP) | O `normalizarEstado` do B2 descarta, na leitura, toda marcação que aponta para um lançamento inexistente |
| O roteiro de blocos não estava aprovado | Aprovado na prática: o Mário mandou seguir com a implementação, e depois redirecionou o B2 a partir do MVP |
| Repositório público sem licença | Licença MIT adicionada: qualquer um pode usar, modificar e distribuir, inclusive em produto fechado, desde que o aviso de copyright viaje junto |
| Nenhum teste no repositório | O B1 trouxe `tests/nucleo.mjs`, com 55 casos sobre dinheiro e meses. A regra do `CLAUDE.md` — toda função que faz conta com dinheiro tem teste — passa a valer de fato |
