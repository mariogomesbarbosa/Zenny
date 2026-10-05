# Compras parceladas no cartão de crédito

> Plano do bloco. Escrito antes do código, como manda o `CLAUDE.md`. O que está
> aqui foi decidido; o que fica de fora está na última seção, com o porquê.

## O problema

Parcelar compras no cartão de crédito é comum na rotina dos jovens adultos no
Brasil. No entanto, hoje o Zenny só permite lançamentos de cartão de uma só vez
(avulsos) ou fixos infinitos todo mês.

Quando alguém compra algo de R$ 300,00 parcelado em 3x no cartão:
1. Ter que anotar manualmente 3 vezes em meses separados é uma fricção que faz a
   pessoa desistir de registrar.
2. Lançar R$ 300,00 tudo de uma vez distorce a fatura daquele mês e esconde o
   impacto nos meses seguintes.
3. Lançar como "fixo" cria uma assinatura infinita sem término previsto,
   obrigando o usuário a lembrar de apagar no mês certo.

## A decisão central

**O formulário de compras de cartão ganha um seletor de parcelas (de 1x até 24x).**
Ao salvar uma compra em N parcelas (N > 1), o Zenny gera automaticamente N
lançamentos avulsos: o primeiro no mês vigente e os demais nos meses
subsequentes, distribuindo o valor igualmente no centavo.

### 1. Modelo de dados simples e retrocompatível

Cada parcela é um `Lancamento` do tipo `Avulso`, sem necessidade de migração
traumática de banco ou tipos incompatíveis. Os lançamentos ganham uma propriedade
opcional `parcelamento`:

```typescript
type Parcelamento = {
  id: string;      // Identificador único do grupo de parcelas
  parcela: number; // 1, 2, ..., total
  total: number;   // Quantidade total de parcelas
};
```

E a descrição recebe o sufixo amigável `(1/N)`, `(2/N)`:
- `"Notebook (1/10)"`, `"Notebook (2/10)"`, etc.
- Isso garante que a identificação seja óbvia e legível mesmo em versões antigas,
  backups, buscas ou faturas.

### 2. A regra do centavo invariante

Qualquer divisão de dinheiro com resto (ex: R$ 100,00 em 3x = R$ 33,333...) não
pode perder nem criar centavos.
A soma das N parcelas deve ser **estritamente igual** ao valor total digitado.

O resto da divisão em centavos é adicionado na(s) primeira(s) parcela(s):
- `10000 centavos / 3 = 3333 centavos`, resto `1 centavo`.
- Parcela 1: R$ 33,34 (3334 centavos).
- Parcela 2: R$ 33,33 (3333 centavos).
- Parcela 3: R$ 33,33 (3333 centavos).
- Soma: 33,34 + 33,33 + 33,33 = 100,00.

Essa função pura vive em `nucleo.js` (`calcularParcelas(valorTotal, totalParcelas)`)
com 100% de testes unitários.

### 3. Distribuição de datas e faturas

Se a data inicial é `AAAA-MM-DD`, a parcela `i` (de `1` a `N`) tem data no mês
deslocado em `i - 1` meses.
- O dia é preservado, respeitando o número de dias do mês (clamped por `diasNoMes`,
  de modo que dia 31 em novembro vire 30, e em fevereiro vire 28/29).
- A função de fatura existente (`faturaDaCompra(cartao, data)`) se encarrega de
  posicionar cada parcela na fatura respectiva.

### 4. Exclusão de parcelas

Ao excluir uma compra que possui parcelamento (`alvo.parcelamento` presente), o
Zenny abre um diálogo oferecendo 3 escolhas claras:
1. **Excluir só esta parcela**: remove apenas a parcela selecionada (as demais
   continuam existindo no estado).
2. **Excluir desta em diante**: remove a parcela atual e todas as seguintes da
   mesma compra (`parcela >= alvo.parcela`). Útil para quando adiantou parcelas
   ou cancelou o restante.
3. **Excluir todas as parcelas**: remove todas as parcelas do grupo.
4. **Cancelar**: não altera nada.

Qualquer exclusão realizada gera aviso na tela com opção de **Desfazer** em 1
toque, restaurando o estado anterior por completo.

## O que fica de fora

- **Juros e taxas de parcelamento**: compras com juros não entram neste bloco. O
  usuário informa o valor total final da compra já com eventuais juros da loja.
- **Edição em lote de parcelas existentes**: ao editar uma parcela já criada, a
  pessoa altera apenas aquela parcela (descrição, categoria ou valor daquele mês).
  Recalcular ou recriar parcelas em lote em cascata geraria risco de sobrescrever
  modificações feitas em meses já conferidos.
