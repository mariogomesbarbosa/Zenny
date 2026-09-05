# Documentação — Zenny

Documentação de trabalho. O objetivo destes arquivos é permitir retomar o
projeto meses depois, ou em outra máquina, sem perder as decisões e — o que
importa mais — o *porquê* delas.

Regra do repositório: **bloco novo começa por um documento aqui**, com as
decisões e o que ficou de fora. Implementação sem plano escrito é como o
histórico se perde.

## Índice

| Documento | Para quê |
|---|---|
| [conceito.md](conceito.md) | A régua do projeto: problema, público, promessa, o que o Zenny se recusa a ser e o roteiro de blocos |
| [mescla-com-o-mvp.md](mescla-com-o-mvp.md) | O cruzamento com o MVP do Mário: por que o Zenny é um planejador e não um diário, o que atravessou, o que ficou de fora e as três tensões |
| [b0-esqueleto.md](b0-esqueleto.md) | O primeiro bloco: as 7 decisões da casca do app, o que ficou de fora e como foi verificado |
| [b1-o-mes.md](b1-o-mes.md) | O segundo bloco: as 9 decisões do mês e dos lançamentos, o modelo de dados e o que ficou de fora |
| [b2-fixos-e-realizado.md](b2-fixos-e-realizado.md) | Os fixos, o planejado × realizado e a volta da tela do MVP: as 9 decisões, e as 3 decisões do B1 que isto reverte |
| [b3-valor-com-data.md](b3-valor-com-data.md) | O valor do fixo passa a ter linha do tempo, para que editar um aumento não reescreva o passado |
| [b4-backup.md](b4-backup.md) | O plano do backup: as 10 decisões, o formato do arquivo, e por que este bloco absorveu o antigo B5 |
| [b5-categorias-e-limites.md](b5-categorias-e-limites.md) | Categorias sugeridas pela descrição e limites que avisam sem repreender: as 9 decisões, e a resolução da mescla que este bloco cumpre |
| [cache-e-deploy.md](cache-e-deploy.md) | Por que o código do app vem sempre da rede, e o defeito de versão misturada que isso evita |
| [tipos-sem-build.md](tipos-sem-build.md) | Por que o Drive não exigia migrar para Vite, e como o projeto ganhou verificação de tipos sem build: as 7 decisões e os 3 achados do conferidor |
| [agentes.md](agentes.md) | Os quatro agentes especializados, as fronteiras que eles não cruzam, e por que subagente não economiza por si |
| [pendencias.md](pendencias.md) | Ressalvas conhecidas e o que foi para a `main` sem verificação |

## Estado atual

Na `main`, do B0 ao B5: o esqueleto, o mês com entradas e saídas, os fixos com
planejado × realizado, o valor do fixo com data, o backup com a tela de
Ajustes, e as categorias com limites e a tela de Relatório.

Mais o layout do desktop alinhado, verificação de tipos sem build, e três
agentes especializados em `.claude/agents/` — ver [agentes.md](agentes.md).

`npm run conferir` roda o conferidor de tipos e os **330 testes**.

Em revisão: o **B6 — cartões de crédito**, com o plano e a implementação em
[b6-cartoes-de-credito.md](b6-cartoes-de-credito.md). A aba Metas virou
Cartões: a fatura passa a aparecer como despesa no dia do vencimento, e a
compra de um mês cai na fatura do mês seguinte — como no cartão de verdade.

Próximo no roteiro: **B7 — guardar para algo** (as metas), que trocou de lugar
com os cartões e ainda não tem tela.

Vale ler antes de seguir: a [pendência 3](pendencias.md) — o menu de
compartilhar do Android, que é o que faz a cópia sair do celular, ainda não foi
exercitado num aparelho real.
