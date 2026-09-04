# Os agentes do projeto

Quatro agentes especializados, em `.claude/agents/`, e o porquê deste recorte.

## O pedido, e a correção que ele precisou

O Mário pediu agentes separados por competência, com dois objetivos: **gastar
menos** e ter **código mais assertivo**. Mais um agente juiz, para garantir que
o código siga os padrões.

O segundo objetivo é direto. O primeiro precisou de uma correção antes de virar
desenho, porque **subagente não economiza por si**:

- **Economiza** quando isola contexto — o agente de interface não carrega as
  setecentas linhas do `nucleo.js` — e quando roda em modelo menor onde cabe.
- **Gasta mais** quando a tarefa é pequena: cada subagente recarrega o
  `CLAUDE.md` e o contexto do projeto do zero. Delegar um ajuste de três linhas
  custa mais que fazer direto.

Daí o desenho: **poucos agentes, com escopo grande**. Uma fábrica de
micro-agentes encareceria exatamente o que se queria baratear.

## Os quatro

| Agente | Fronteira | Modelo | Por que este modelo |
|---|---|---|---|
| `nucleo` | Funções puras. Nunca toca DOM | opus | É dinheiro. Um erro de centavo destrói a confiança no app inteiro, e economizar aqui é economizar no lugar errado |
| `interface` | Tela. Nunca faz conta com dinheiro | sonnet | Aplicar regras claras de layout e linguagem, com o conceito na mão |
| `verificador` | Exercita e relata. Nunca corrige | sonnet | Roda roteiro e lê saída, mas precisa interpretar captura de tela — abaixo disso a leitura visual falha |
| `juiz` | Revisa e relata. Nunca altera código | opus | Tem que pegar o que passou pelos outros três. Um revisor fraco é pior que revisor nenhum, porque dá falsa segurança |

## Decisões, e o porquê

**1. As duas fronteiras não se cruzam.** O `nucleo` não conhece navegador; a
`interface` não soma dinheiro. Quando um precisa do outro lado, ele **para e
diz** em vez de resolver no lugar errado. É o que mantém o núcleo testável por
`node` e impede que uma conta apareça num manipulador de clique, onde nenhum
teste a alcança.

**2. O `juiz` aponta, não bloqueia.** O Mário escolheu assim, e a escolha se
sustenta: um revisor automático que reprova acaba contornado na primeira pressa,
e aí não revisa nada. Em troca, ele tem obrigação de **classificar** cada achado
— viola regra escrita, contraria decisão registrada, defeito, ou opinião dele.
Sem essa separação os achados viram ruído, e ruído é ignorado.

**3. O `verificador` não corrige.** Quem verifica e conserta na mesma passada
tende a declarar consertado sem re-verificar. Separar as duas coisas custa uma
ida e volta e paga em confiança.

**4. Nenhum deles declara verificado o que só um aparelho prova.** Compartilhar
arquivo no Android, PWA instalado, comportamento offline: isso não existe num
Chromium de container. O `verificador` tem instrução explícita de dizer o que
ficou fora do alcance dele, e apontar para `pendencias.md`. É o oposto de
inflar o relatório.

**5. Eles são versionados.** `.claude/` estava inteiro no `.gitignore`, o que
faria os agentes morrerem junto com a sessão que os criou. Agora o `.gitignore`
separa o que é da máquina (`settings.local.json`) do que é do projeto
(`agents/`). Um agente que carrega o contexto do Zenny e as regras do
`CLAUDE.md` **é** do projeto.

**6. O fluxo ficou no `CLAUDE.md`.** Os agentes entraram como passos 4 e 5 do
ciclo obrigatório, não como sugestão. Assim valem para toda sessão futura, sem
depender de alguém lembrar de pedir.

## O que ficou de fora

- **Um agente de microcopy.** As regras de linguagem são fortes o bastante para
  merecer um — mas cabem na `interface`, e um agente a mais é um carregamento a
  mais para escrever três frases. Se a interface começar a errar o tom, ele se
  justifica.
- **Um agente de documentação.** Mesmo raciocínio: escrever o documento de bloco
  exige justamente o contexto que quem planejou já tem. Delegar significaria
  recarregar tudo para escrever prosa.
- **Reprovação automática.** Ver decisão 2.
- **Agente de PWA e service worker.** `sw.js` muda uma vez por bloco, e a regra
  dele — subir a versão do cache — cabe numa linha da `interface`.
- **Orquestração automática.** Nada aqui decide sozinho chamar dois agentes em
  paralelo. Quem conduz a sessão escolhe, porque só ali se sabe se a tarefa
  paga o carregamento.

## Uma característica operacional que custou uma tentativa

**Agentes são carregados no início da sessão.** Criar um arquivo em
`.claude/agents/` no meio de uma sessão não o disponibiliza nela — a tentativa
de invocar o `juiz` para revisar o próprio PR que o criou falhou com "agent type
not found".

Consequência prática: depois de criar ou editar um agente, a sessão precisa ser
reiniciada para usá-lo. Vale para o Mário no PC e para qualquer sessão de nuvem.

Por isso o PR que introduziu os agentes não passou pelo `juiz`, e as checagens
que ele faria foram feitas à mão — fronteiras conferidas por `grep`,
`.gitignore` por `git check-ignore`, numeração do fluxo por leitura. Está
registrado como pendência.

## Como saber se valeu

O sinal de que o recorte está certo é chato de medir e fácil de sentir: as
tarefas caem num agente só, sem precisar de dois. Se você se vê chamando
`nucleo` e `interface` para a mesma coisa toda vez, a fronteira está no lugar
errado — e o certo é mudá-la, não conviver.

O sinal de que o `juiz` funciona é ele reprovar algo que teria passado. Se ele
nunca discordar, ou está redundante ou está com medo.
