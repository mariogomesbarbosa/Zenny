# B4 — Backup, e a casa que ele precisava

Dá ao usuário uma rede de segurança para o trabalho que ele já investiu, e cria
a tela de Ajustes que o roteiro previa para o B5.

## Por que agora

Depois do B2 o app passou a valer a pena: os fixos são cadastrados uma vez e o
mês seguinte nasce montado. Isso é exatamente o que transforma um app
descartável em um app que a pessoa mantém — e é também o que ela perde inteiro
ao trocar de celular, limpar os dados do navegador ou desinstalar o PWA.

O `localStorage` não avisa antes de sumir. Não há tela de erro, não há
recuperação, não há suporte para chamar. Um app que pede investimento e não
oferece cópia está pedindo confiança que não pode honrar.

## A tensão do roteiro, e como ela se resolveu

O roteiro punha o backup no B4 e as configurações no B5, admitindo que o B5 "só
ganha razão de existir quando o backup precisa de casa". Na hora de planejar, a
dependência se mostrou invertida: **o backup não tem onde morar sem a tela**.

O Mário resolveu fundindo os dois. Este bloco entrega backup, apagar tudo e a
tela de Ajustes de uma vez. O B5 deixa de existir como bloco separado, e o
roteiro do [conceito.md](conceito.md#roteiro-proposto) foi atualizado.

Isso encurta o roteiro em um bloco em vez de inchá-lo: o B5 nunca teve conteúdo
próprio — era a moldura de coisas que pertencem a outros blocos.

## Decisões, e o porquê

**1. Ajustes é uma aba na navegação de baixo, com ícone de engrenagem.** A
recomendação de quem escreve isto era uma engrenagem no cabeçalho, para não
gastar um terço da navegação principal com algo que se usa uma vez por mês. O
Mário escolheu a aba, e a escolha se defende melhor: **um backup que não é
encontrado não é backup**. Num app de duas telas, um ícone novo no cabeçalho, ao
lado do sol/lua, é fácil de nunca ser visto — e a única pessoa que precisa achar
os Ajustes é justamente a que nunca procurou por eles. Em 360px, três itens
ficam com 120px cada: confortável.

**2. Restaurar substitui tudo.** O arquivo vira o estado inteiro; o que estava no
aparelho sai. Mesclar por id não perderia nada, mas cria a pergunta "qual valor
vence?" no pior momento possível — quando a pessoa está com medo de perder
dados. Substituir é a única regra que cabe numa frase, e caber numa frase é
requisito neste app.

**3. Substituir só é aceitável porque tem duas redes.** Antes de aplicar, a
confirmação diz o que vem no arquivo ("14 lançamentos, de set/2026 a mar/2027")
e o que será substituído. Depois de aplicar, o aviso de desfazer que o app já
tem permite voltar. As duas já existem no código: `instantaneo()`, `restaurar()`
e `avisar(texto, acaoDeDesfazer)` foram escritos no B1 e no B2 para a exclusão
de lançamentos, e servem aqui sem modificação.

**4. O arquivo sai por compartilhar, com download de reserva.** No Android, um
arquivo baixado vai para a pasta Downloads, que é onde arquivos vão morrer. O
menu de compartilhar deixa a pessoa mandar o backup para o Drive, o WhatsApp
dela mesma ou o e-mail — lugares onde ela realmente vai reencontrar. Onde
`navigator.canShare` recusar arquivos, cai para download automático, sem avisar
nem pedir nada.

**5. O lembrete mora só dentro dos Ajustes.** A tela mostra "Último backup: há 47
dias" em texto neutro. Nada de faixa no Início, nada de interrupção. Este seria
o primeiro ponto do app a tomar a iniciativa de cutucar o usuário, e o conceito é
explícito: o tom é de aliado, não de fiscal. O custo é alcance — quem nunca abrir
os Ajustes nunca verá o aviso —, e é um custo aceito de olhos abertos.

**6. Apagar tudo confirma e oferece a cópia.** O diálogo diz o que será apagado
("14 lançamentos") e põe "Guardar uma cópia antes" ao lado de "Apagar". A
fricção certa não é dificultar o gesto, é resolver o arrependimento antes que ele
aconteça. Exigir que a pessoa digite APAGAR eliminaria o toque acidental, mas é
gesto de ferramenta de desenvolvedor e destoa de um app que promete não
intimidar. O desfazer também cobre esta ação, de graça.

**7. O tema fica nos dois lugares.** Continua a um toque no cabeçalho — trocar
tema é coisa de impulso, à noite, e enterrar em duas telas seria regressão de uso
diário — e aparece também nos Ajustes, onde a pessoa vai procurar. O risco de
dois controles para o mesmo estado é dessincronia, e ele se paga com uma função
só: `aplicarTema()` redesenha os dois, e nenhum outro lugar escreve o tema.

**8. O tema não entra no arquivo de backup.** Backup carrega dado do usuário, não
preferência do aparelho. Restaurar no tablet não deve trocar o tema do tablet.
Pela mesma razão, `apagar tudo` limpa os lançamentos e a data do último backup,
mas preserva o tema.

**9. A data do último backup vive fora do estado.** Chave própria no
`localStorage` (`zenny-backup`), como o tema. Se ela morasse dentro do estado,
entraria no próprio arquivo — e restaurar num celular novo faria ele herdar a
data de backup do celular velho, afirmando uma cópia que aquele aparelho nunca
teve. Fora do estado, um aparelho novo diz "nunca", que é a verdade.

**10. O que for descartado na leitura é dito em voz alta.** `normalizarEstado`
descarta lançamento inválido em silêncio, e no uso normal isso está certo — o
usuário não tem como consertar, e perder a tela é pior que perder um lançamento
torto. Num backup o silêncio se inverte: a pessoa vê "restaurado" e acredita que
está tudo lá. Então `lerBackup` compara o que entrou com o que sobreviveu, e a
confirmação avisa quando a conta não fecha.

## O formato do arquivo

```json
{
  "app": "zenny",
  "versao": 3,
  "exportadoEm": "2026-09-03T18:47:00.000Z",
  "estado": { "versao": 3, "lancamentos": [], "realizados": {} }
}
```

O envelope existe para o arquivo se identificar. Um JSON cru do estado, achado na
pasta de Downloads seis meses depois, não diz de onde veio nem de quando é — e o
app, ao receber um JSON qualquer, não teria como saber se aquilo é um backup do
Zenny ou outra coisa.

Na leitura, porém, o app é tolerante: aceita o envelope **e** o estado cru. Ser
estrito na escrita e liberal na leitura custa três linhas e evita que uma pessoa
que editou o arquivo à mão fique trancada para fora dos próprios dados.

Nome: `zenny-2026-09-03.json`, com a data **local** — o arquivo é lido por
humanos, e um backup feito às 21h no Brasil não pode aparecer com a data de
amanhã.

## O que vai para o núcleo

Tudo que decide algo é função pura em `nucleo.js`, e portanto testável:

| Função | O que faz |
|---|---|
| `montarBackup(estado, agora)` | Monta o envelope |
| `lerBackup(texto)` | Analisa o JSON, aceita envelope ou estado cru, normaliza, e devolve `{ ok, estado, resumo, descartados, erro }` |
| `resumirEstado(estado)` | `{ total, fixos, avulsos, primeiroMes, ultimoMes }` para a confirmação |
| `nomeDoArquivo(agora)` | `zenny-AAAA-MM-DD.json` |
| `diasEntre(a, b)` | Dias inteiros entre duas datas, para o "há X dias" |

`diasEntre` merece atenção: dividir a diferença de milissegundos por 86.400.000
erra na virada do horário de verão e em fusos com offset quebrado. A comparação
tem que ser por dia local. É o tipo de bug que só aparece uma vez por ano e não
se reproduz.

O `app.js` fica com o que não é decisão: montar o Blob, chamar
`navigator.share`, abrir o seletor de arquivo, desenhar.

## Sobre as palavras da tela

Nenhuma pessoa de 22 anos pensa "exportar dados" ou "importar backup". Ela pensa
em não perder o que fez.

| Não | Sim |
|---|---|
| Exportar dados | Guardar uma cópia |
| Importar backup | Trazer de volta |
| Restaurar estado | Trazer de volta |
| Limpar dados | Apagar tudo |
| Nenhum backup encontrado | Você ainda não guardou nenhuma cópia |

"Apagar tudo" fica sendo a única palavra dura da tela, e é de propósito: a ação é
dura.

## O que ficou de fora

- **Frequência de backup configurável.** Foi pedido e recusado no próprio
  planejamento, porque a palavra "frequência" promete o que a plataforma não
  entrega: **um PWA sem servidor não consegue salvar um arquivo sozinho.** O app
  só executa enquanto está aberto; `navigator.share` exige gesto do usuário e
  não pode ser disparado por temporizador; download automático é bloqueado pelo
  navegador; a Periodic Background Sync só existe em navegadores Chromium, só
  com o PWA instalado, não garante horário e serve para buscar dados da rede, não
  para gravar arquivo; e a File System Access API, que permitiria escrever num
  arquivo escolhido, [não é exposta no Chrome para Android](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
  — justamente o aparelho do público-alvo. Uma frequência só poderia controlar
  o texto do lembrete, e chamar isso de "backup automático" seria mentir para o
  usuário sobre a proteção que ele tem.

- **Backup em nuvem, no modelo do WhatsApp.** É para onde isto deve caminhar, e
  é a resposta certa para o problema que a frequência tentava resolver: a cópia
  vai sozinha para o Google Drive da pessoa, e trocar de celular deixa de ser um
  evento. O caminho existe sem servidor próprio — OAuth do Google no próprio
  navegador, gravando na `appDataFolder` do Drive, uma área que só o Zenny
  enxerga e que não polui os arquivos dela. O dado continua sendo do usuário e
  não passa por servidor nosso.

  Três coisas fazem disto bloco próprio: traz a primeira dependência externa do
  projeto (o script de identidade do Google), que o `CLAUDE.md` manda tratar em
  PR separado com justificativa; exige um login, que o conceito só admite como
  opcional; e exige registrar o app no console do Google, com política de
  privacidade publicada.

  Mesmo depois disso, o backup manual deste bloco continua valendo: é ele que
  funciona sem conta, sem rede e sem Google.

- **Senha ou criptografia.** O arquivo tem quanto a pessoa ganha e o que ela
  paga. É dado sensível, e a resposta honesta hoje é a tela dizer isso em uma
  linha, para ela escolher onde guardar. Criptografar exigiria a pessoa lembrar
  de mais uma senha — e uma senha esquecida transforma o backup em nada.
- **Mesclar dois backups.** Ver decisão 2.
- **Exportar planilha (CSV).** É outra necessidade, de outro público. O backup
  serve para voltar ao app; planilha serve para sair dele.
- **Histórico de cópias dentro do app.** Guardar backups no próprio aparelho não
  protege do caso que importa, que é perder o aparelho.
- **Restaurar só os fixos.** Escolher pedaços é a complexidade que a decisão 2
  recusou.

## Como verificar

No navegador, em 360px, e no celular de verdade:

1. Com lançamentos cadastrados, Ajustes → Guardar uma cópia. No desktop, baixa o
   arquivo; no Android, abre o menu de compartilhar.
2. Abrir o arquivo baixado: envelope com `app`, `versao`, `exportadoEm`, `estado`.
3. Apagar tudo, confirmar, e depois trazer o arquivo de volta. Os lançamentos, os
   fixos e as marcações de realizado voltam iguais — inclusive a linha do tempo de
   valores do B3.
4. Trazer de volta com lançamentos na tela: a confirmação diz o que vem e o que
   sai; o desfazer devolve o estado anterior.
5. Trazer um arquivo corrompido, um JSON que não é do Zenny, e um arquivo com um
   lançamento torto de propósito: o app recusa com mensagem clara nos dois
   primeiros, e avisa quantos foram descartados no terceiro.
6. "Último backup" mostra "há X dias" corretamente, e "nunca" em aparelho novo.
7. Trocar o tema pelo cabeçalho e pelos Ajustes: os dois controles ficam em
   sincronia.
8. Console limpo em todos os passos.
