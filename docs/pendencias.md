# Pendências e ressalvas

Lista viva. Serve para que uma ressalva conhecida não seja redescoberta como bug
seis meses depois.

## Em aberto

| # | Ressalva | Por que ficou assim |
|---|---|---|
| 1 | O roteiro de blocos em [conceito.md](conceito.md#roteiro-proposto) ainda não foi aprovado | Foi proposto na criação do projeto; a ordem pode mudar |
| 2 | Nenhum teste ainda — `tests/` não existe | Não há função de cálculo no B0. Passa a valer no B1, quando entra dinheiro no modelo |
| 3 | Não há licença declarada no repositório | Repositório público sem licença significa "todos os direitos reservados" na prática. Decisão pendente do Mário |
| 4 | Editar um lançamento fixo reescreve o passado — um aumento de salário muda os meses já fechados | Limitação herdada do modelo do MVP. Sem histórico por versão, e resolver isso custa complexidade real. Vira problema quando alguém comparar meses |
| 5 | O mapa de pagos cresce sem limpeza | Também herdado do MVP: excluir um fixo remove suas chaves, mas pular um mês e outros caminhos deixam restos. Não quebra nada, só cresce |
| 6 | O MVP original (`planejador-financeiro.html`, fora do repositório) tem um salário real embutido como dado semente | Por isso não foi commitado. Se for compartilhado, o dado vaza |

## Resolvidas

Nada ainda.
