# Backup no Google Drive

A cópia na nuvem no modelo do WhatsApp: os dados do usuário protegidos sem
servidor, sem mensalidade e sem quebrar a promessa de privacidade.

## Por que agora

Depois que o B4 entregou o backup manual e a tela de Ajustes, o app passou a ter
sua primeira rede de segurança. Mas o próprio documento do B4
([b4-backup.md](b4-backup.md#o-que-ficou-de-fora)) já apontava para onde isso
deveria caminhar: o backup em nuvem é "a resposta certa para o problema que a
frequência tentava resolver".

O backup manual funciona perfeitamente para quem é disciplinado, mas falha no
mundo real. O usuário perde os dados justamente nos momentos em que menos
espera: quando o celular cai na água, quando é furtado, quando troca de
aparelho ou quando o navegador decide limpar o `localStorage` sem avisar. Para
o arquivo manual salvar o dia, a pessoa precisaria ter lembrado de entrar nos
Ajustes, tocado em "Guardar uma cópia", enviado o arquivo para algum lugar e
ainda se lembrar de onde o guardou meses depois. No WhatsApp ninguém pensa em
salvar arquivo: a conversa está lá porque a cópia foi para a nuvem.

O backup no Google Drive dá exatamente essa resposta: trocar de celular deixa
de ser um evento com perda de dados. E a forma de fazer isso no Zenny respeita a
essência do projeto: sem servidor próprio, sem custos de infraestrutura, sem
mensalidade e sem violar a privacidade financeira de ninguém.

## Decisões, e o porquê

**1. Google Identity Services (GIS) via `<script>`, sem build e sem backend.**
O documento [tipos-sem-build.md](tipos-sem-build.md) já havia confirmado que
essa premissa se sustenta por completo: não precisamos de Node, Express nem
bundlers para conversar com o Google. Usamos a biblioteca oficial do Google
Identity Services (GIS) carregada via tag `<script>`, operando o fluxo OAuth 2.0
no navegador (token client com pop-up). O navegador negocia a autorização
diretamente com o Google, recebe o token de acesso em memória e faz requisições
à Drive API v3 via `fetch()`. Sem servidor intermediário, eliminamos custo de
hospedagem, responsabilidade de guarda de credenciais e risco de vazamento. O
dado vai do aparelho direto para a conta da pessoa.

**2. Acesso estrito à `appDataFolder`.**
Em vez de pedir permissão para o Drive inteiro (`drive` ou `drive.file`), o app
solicita unicamente o escopo `https://www.googleapis.com/auth/drive.appdata`.
Essa é uma pasta especial e oculta que o Google reserva exclusivamente para
cada aplicativo. O Zenny não tem permissão para listar, abrir, ler nem tocar em
nenhum arquivo pessoal do usuário — fotos, documentos de texto, planilhas e
pastas continuam 100% invisíveis para o app. Essa é a permissão mínima
necessária e honra o princípio fundamental do Zenny: o que é do usuário é do
usuário.

**3. Token apenas em memória, sem sessão persistente.**
O token de acesso retornado pelo Google não é gravado em `localStorage`,
`sessionStorage` nem em cookies. Ele existe unicamente na memória volátil da
execução JavaScript. Se a aba for fechada ou o app recarregado, o token
desaparece. Se expirar (a vida útil padrão do Google é de cerca de 1 hora), uma
nova autorização rápida com um toque renova o acesso. Guardar token em
armazenamento local criaria superfície de ataque desnecessária para scripts
maliciosos em navegadores ou em aparelhos compartilhados. Manter em memória é
mais seguro, limpo e não deixa resíduos.

**4. Arquivo único `zenny-backup.json`, sobrescrito a cada salvamento.**
Na pasta `appDataFolder`, o Zenny mantém um único arquivo com o nome fixo
`zenny-backup.json`. Se ele já existir, é atualizado; se não existir, é criado.
Não há versionamento nem acúmulo de arquivos datados no Drive. Manter um
arquivo único evita esgotar cotas, elimina a dúvida de "qual cópia devo
restaurar?" e simplifica a vida de quem está com pressa. Para quem faz questão
de guardar o histórico mês a mês ou congelar versões, o backup manual em
arquivo (`zenny-AAAA-MM-DD.json`) continua cumprindo exatamente esse papel.

**5. O login é 100% opcional.**
O Zenny continua funcionando perfeitamente sem nenhuma conta do Google. Quem
não quer vincular sua conta, quem prefere usar o app sem internet ou quem não
usa serviços Google tem exatamente a mesma experiência de planejamento
financeiro. O backup manual em arquivo continua no mesmo lugar, com a mesma
força. Nenhuma tela ou cálculo do app exige login para funcionar.

**6. Primeira dependência externa do projeto, justificada.**
O [CLAUDE.md](../CLAUDE.md) estabelece a regra: sem build e sem dependências de
runtime, exigindo justificativa e PR próprio para qualquer exceção. O script do
Google Identity Services (`https://accounts.google.com/gsi/client`) é a
primeira dependência externa baixada pelo navegador. A justificativa é
impositiva: não existe protocolo de autenticação com o Google Drive sem o código
criptográfico assinado pelos servidores do Google. O carregamento é controlado e
assíncrono, mantendo o funcionamento offline do restante do PWA via Service
Worker.

**7. Palavras humanas, no mesmo tom do backup manual.**
O B4 baniu termos técnicos de sistema de arquivos e TI da interface. O backup no
Drive segue a mesma cartilha: nada de "OAuth2", "Access Token", "Sync", "Commit
upstream" ou "Payload JSON".

| Não | Sim |
|---|---|
| Autenticar com Google OAuth | Conectar ao Google Drive |
| Desautenticar / Revogar token | Desconectar |
| Sincronizar na nuvem / Upload | Salvar no Drive |
| Restaurar da nuvem / Pull | Trazer do Drive |
| Token expirado | Conexão expirada. Toque para reconectar |
| Requisição 200 OK | Cópia salva no Drive agora |

**8. Política de privacidade pública (`privacy.html`).**
O Google exige uma URL pública de Política de Privacidade para habilitar a tela
de consentimento OAuth do projeto no Google Cloud Console. Criada em
`privacy.html` e servida pelo GitHub Pages junto do app
(`https://mariogomesbarbosa.github.io/Zenny/privacy.html`), ela usa a mesma
identidade visual do Zenny e explica em português claro que os dados ficam no
aparelho, que o app só enxerga a pasta oculta `appDataFolder` e que nenhum dado
passa por computadores nossos.

## O formato e a integração com o Drive

O arquivo salvo no Drive reaproveita o mesmo envelope que o B4 definiu em
`montarBackup(estado, agora)`:

```json
{
  "app": "zenny",
  "versao": 6,
  "exportadoEm": "2026-09-11T19:00:00.000Z",
  "estado": { ... }
}
```

Isso significa que a cópia em nuvem e a cópia manual compartilham a mesma
estrutura. A função `lerBackup()` do `nucleo.js`, que já normaliza o estado,
valida o schema e calcula o resumo para a confirmação de substituição, é usada
sem qualquer adaptação.

O fluxo de comunicação com a Drive API v3 usa apenas duas operações via `fetch`:
1. **Localizar ou ler:** `GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='zenny-backup.json'`
   para obter o ID do arquivo existente, e `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media`
   para trazer o conteúdo JSON ao restaurar.
2. **Gravar:** `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
   (quando o arquivo ainda não existe) ou `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media`
   (quando já existe, sobrescrevendo o conteúdo).

## O que ficou de fora

- **Backup automático ou periódico em segundo plano.** Continua recusado pelas
  mesmas razões técnicas documentadas no B4: em um PWA estático no navegador,
  não há execução garantida em segundo plano sem servidor. Além disso, salvar no
  Drive deve ser um ato deliberado e transparente para o usuário.
- **Criptografia com senha adicional.** O Google Drive já cifra os dados em
  trânsito e em repouso nos servidores do Google, e a conta do usuário costuma
  possuir autenticação de dois fatores. Criar uma senha à parte para o arquivo
  traria o risco de esquecimento — e senha esquecida em finanças pessoais
  significa dados perdidos para sempre.
- **Múltiplas versões de backup no Drive.** Ter várias versões exigiria tela de
  gestão de histórico, escolha de datas e resolução de conflitos. Um arquivo
  único com a fotografia mais recente resolve a dor de trocar de aparelho com
  zero complicação.
- **Fila offline para sincronização posterior.** Backup em nuvem pressupõe
  internet por definição. Se o usuário tentar salvar ou trazer dados sem rede, o
  app avisa de forma simples e imediata. O backup manual para arquivo local
  continua atendendo a necessidade quando não há conexão.

## Como verificar

No navegador e no celular, conectado à internet:

1. **Ajustes sem conexão:** Abrir Ajustes. A seção do Google Drive exibe
   "Conectar ao Google Drive" e status indicando que não há conta conectada.
2. **Autorização via Google:** Tocar em "Conectar ao Google Drive". A janela
   pop-up oficial do Google abre, solicita login/seleção de conta e informa o
   escopo restrito à pasta do aplicativo.
3. **Estado conectado:** Após autorizar, a janela fecha e a tela de Ajustes
   passa a exibir os botões "Salvar no Drive", "Trazer do Drive" e "Desconectar",
   junto com o e-mail ou indicador de conexão ativa.
4. **Salvar no Drive:** Com lançamentos cadastrados, tocar em "Salvar no Drive".
   O app processa o envio e atualiza a mensagem para "Cópia salva no Drive
   agora" (ou data correspondente).
5. **Trazer do Drive:** Em outro navegador ou após limpar o app com "Apagar
   tudo", conectar ao Drive e tocar em "Trazer do Drive". O diálogo de
   confirmação surge com o resumo exato dos lançamentos salvos. Ao confirmar, o
   app restaura tudo perfeitamente.
6. **Desfazer restauração:** Imediatamente após restaurar do Drive, acionar o
   "Desfazer" no aviso inferior. O estado anterior é restabelecido sem perda.
7. **Desconectar:** Tocar em "Desconectar". O token é removido da memória, o
   cartão volta ao estado desconectado e os dados locais no aparelho permanecem
   intactos.
8. **Comportamento sem rede:** Com o Wi-Fi e dados móveis desligados, tentar
   "Salvar no Drive". O app exibe mensagem clara informando que não foi possível
   conectar, sem travar nem corromper o estado local.
9. **Coexistência com backup manual:** Realizar um backup manual ("Guardar uma
   cópia") antes e depois de interagir com o Drive. Ambos os fluxos funcionam de
   forma independente e sem atritos.
10. **Console limpo:** Durante todas as operações (autorizar, salvar, restaurar,
    desconectar), o console de desenvolvimento não apresenta erros nem avisos
    não tratados.
