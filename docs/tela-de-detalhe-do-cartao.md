# Tela de detalhe do cartão de crédito e categorização

Documento de decisão técnica para os ajustes da tela de Cartão de Crédito e o detalhamento dos lançamentos com suporte a categorias.

## O problema que o ajuste resolve

1. **A fatura era um modal flutuante de tamanho reduzido (`<dialog>`).** Em telas de celular, listar compras em um diálogo pop-up/bottom-sheet limitava o espaço e a navegação, além de esconder ações importantes e complicar o fluxo de voltar.
2. **Falta de visibilidade das categorias e da data nos lançamentos do cartão.** As compras listadas dentro da fatura mostravam apenas a descrição, o valor e o botão de exclusão. Elas não mostravam a data de ocorrência nem a etiqueta de categoria (que as despesas normais já possuem).
3. **Alimentação do Relatório.** Sem a exibição e a gestão direta das categorias nas compras do cartão, o usuário não conseguia revisar nem ajustar facilmente a categoria das compras para o relatório de gastos por categoria ("Para onde o dinheiro foi").

## As decisões

### 1. Detalhamento em tela cheia (`tela-cartao-detalhe`)
- O toque no card do cartão na lista (`tela-cartoes`) agora navega para uma tela dedicada em tela cheia (`tela-cartao-detalhe`).
- A tela possui um botão de voltar no topo ("← Voltar"), permitindo retornar rapidamente à lista de cartões.
- A barra de navegação inferior mantém o indicador de aba ativa em "Cartões".

### 2. Card do Cartão na lista principal
- Exibe o nome do cartão, o valor da fatura do mês visível, os dados do ciclo ("fecha dia XX · vence dia YY"), a barra de progresso do limite (se configurado) e o texto informativo do uso do limite (ex: "R$ X de R$ Y").
- Mantém o botão de edição (ícone de lápis) para alterar nome, limite, fechamento ou vencimento.

### 3. Informações e Lançamentos na Tela de Detalhe
- **Resumo superior**: Nome do cartão, situação do vencimento ("Vence dia XX de [mês]"), total da fatura atual, barra de progresso e botões para "Anotar uma compra", "Marcar como paga" e o campo de ajuste do total da fatura.
- **Lista de lançamentos**: Cada item exibe a data (ex: `15/09`), descrição, valor formatado, o botão/etiqueta de categoria (`etiqueta-categoria`) e o botão de exclusão.
- **Interação com a categoria**: O toque na tag de categoria abre o diálogo de seleção/criação de categoria (`dialogo-categoria`), permitindo alterar ou definir a categoria da compra do cartão naquele instante.
- **População do Relatório**: As compras categorizadas mantêm o vínculo com o mês de ocorrência e alimentam a função `gastosPorCategoria` no Relatório.
