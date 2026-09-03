# Pendências e ressalvas

Lista viva. Serve para que uma ressalva conhecida não seja redescoberta como bug
seis meses depois.

## Em aberto

| # | Ressalva | Por que ficou assim |
|---|---|---|
| 1 | Não há licença declarada no repositório | Repositório público sem licença significa "todos os direitos reservados" na prática. Decisão pendente do Mário |
| 2 | Editar um lançamento fixo reescreve o passado — um aumento de salário muda os meses já fechados | Limitação herdada do modelo do MVP. Sem histórico por versão, e resolver isso custa complexidade real. Vira problema quando alguém comparar meses |
| 3 | O MVP original (`planejador-financeiro.html`, fora do repositório) tem um salário real embutido como dado semente | Por isso não foi commitado. Se for compartilhado, o dado vaza |

## Resolvidas

| Ressalva | Como se resolveu |
|---|---|
| O mapa de pagos crescia sem limpeza (herdado do MVP) | O `normalizarEstado` do B2 descarta, na leitura, toda marcação que aponta para um lançamento inexistente |
| O roteiro de blocos não estava aprovado | Aprovado na prática: o Mário mandou seguir com a implementação, e depois redirecionou o B2 a partir do MVP |
| Nenhum teste no repositório | O B1 trouxe `tests/nucleo.mjs`, com 55 casos sobre dinheiro e meses. A regra do `CLAUDE.md` — toda função que faz conta com dinheiro tem teste — passa a valer de fato |
