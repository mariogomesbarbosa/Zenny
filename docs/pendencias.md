# Pendências e ressalvas

Lista viva. Serve para que uma ressalva conhecida não seja redescoberta como bug
seis meses depois.

## Em aberto

| # | Ressalva | Por que ficou assim |
|---|---|---|
| 1 | O roteiro de blocos em [conceito.md](conceito.md#roteiro-proposto) ainda não foi aprovado | Foi proposto na criação do projeto; a ordem pode mudar |
| 2 | Não há licença declarada no repositório | Repositório público sem licença significa "todos os direitos reservados" na prática. Decisão pendente do Mário |
| 3 | Editar um lançamento fixo reescreve o passado — um aumento de salário muda os meses já fechados | Limitação herdada do modelo do MVP. Sem histórico por versão, e resolver isso custa complexidade real. Vira problema quando alguém comparar meses |
| 4 | O mapa de pagos cresce sem limpeza | Também herdado do MVP: excluir um fixo remove suas chaves, mas pular um mês e outros caminhos deixam restos. Não quebra nada, só cresce |
| 5 | O MVP original (`planejador-financeiro.html`, fora do repositório) tem um salário real embutido como dado semente | Por isso não foi commitado. Se for compartilhado, o dado vaza |

## Resolvidas

| Ressalva | Como se resolveu |
|---|---|
| Nenhum teste no repositório | O B1 trouxe `tests/nucleo.mjs`, com 55 casos sobre dinheiro e meses. A regra do `CLAUDE.md` — toda função que faz conta com dinheiro tem teste — passa a valer de fato |
