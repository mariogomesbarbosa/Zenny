<p align="center">
  <img src="assets/logo.svg" alt="Zenny" width="96" />
</p>

<h1 align="center">Zenny</h1>

<p align="center">
  <strong>Cuidar do seu dinheiro sem medo e sem complicação</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em_constru%C3%A7%C3%A3o-blue?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Tecnologias-HTML5_|_CSS3_|_JS-14181C?style=for-the-badge" alt="Tecnologias">
  <img src="https://img.shields.io/badge/Mobile-First-35B37E?style=for-the-badge" alt="Mobile First">
</p>

---

## 📌 Sobre o Zenny

**Zenny** é um app de finanças pessoais para quem nunca conseguiu manter um.
*Zen* + *money*: a proposta é calma com dinheiro.

O público é o jovem adulto no primeiro ou segundo emprego — que não deixa de
cuidar das contas por falta de aplicativo, mas por medo de descobrir, por
cansaço de cadastrar coisas antes de ver qualquer valor, e por não aguentar
vocabulário de banco. O Zenny ataca esses três problemas, nesta ordem.

A promessa é simples: **em 30 segundos de uso você sabe mais sobre seu dinheiro
do que sabia antes de abrir o app.** Sem cadastro, sem configuração, sem
tutorial.

---

## ✨ O que ele faz de diferente

- 🎯 **Valor antes de configuração** — abre útil. Registrar o primeiro gasto não
  exige criar conta, categoria nem saldo inicial.
- 👆 **Três toques** — valor, categoria, pronto. O resto tem padrão inteligente.
- 🗣️ **Linguagem de gente** — "o que sobrou", não "saldo disponível".
- 📚 **Educação no contexto** — a explicação nasce onde a dúvida aparece, não
  numa aba de artigos que ninguém lê.
- 🤝 **Sem culpa** — estourar um limite gera informação, não bronca.
- 📱 **Mobile first e instalável** — funciona como app no celular, e abre sem
  internet.
- 🔒 **Seus dados são seus** — ficam no aparelho. Sem login obrigatório.

E o que ele deliberadamente **não** faz: sincronizar com banco, recomendar
investimento, comparar você com outras pessoas, ou gerar relatório de doze
colunas. O porquê de cada recusa está em
[docs/conceito.md](docs/conceito.md#o-que-o-zenny-n%C3%A3o-vai-ser).

---

## 🛠️ Tecnologia

HTML, CSS e JavaScript puros. Sem build, sem framework, sem dependência de
runtime — o app é um punhado de arquivos estáticos. PWA com `manifest` e service
worker, para instalar de verdade no Android e abrir offline. Dados em
`localStorage`.

Para rodar localmente, qualquer servidor estático serve:

```bash
npx --yes http-server . -p 8142 -c-1
```

---

## 📖 Documentação

| Documento | Para quê |
|---|---|
| [CLAUDE.md](CLAUDE.md) | O contrato de trabalho: princípios, regras técnicas e o fluxo de PR |
| [docs/conceito.md](docs/conceito.md) | A régua do projeto: problema, público, promessa, não-objetivos e roteiro |
| [docs/pendencias.md](docs/pendencias.md) | Ressalvas conhecidas |

---

<p align="center">
  <sub>Feito com calma. 🌀</sub>
</p>
