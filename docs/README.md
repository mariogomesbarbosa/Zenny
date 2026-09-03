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
| [pendencias.md](pendencias.md) | Ressalvas conhecidas e o que foi para a `main` sem verificação |

## Estado atual

O B0 (esqueleto) e o B1 (o mês, entradas e saídas avulsas) estão implementados.
O app já é útil: dá para navegar por mês, adicionar, editar e excluir
lançamentos, e ver quanto sobra. Os dados ficam no aparelho, em centavos.

Próximo: B2, os lançamentos fixos. O roteiro está em
[conceito.md](conceito.md#roteiro-proposto).
