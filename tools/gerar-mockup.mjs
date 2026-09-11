import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const RAIZ = resolve('.');
const ASSETS = join(RAIZ, 'assets');

const mesAtual = '2026-09';

const demoState = {
  versao: 7,
  cartoes: [
    {
      id: 'cartao-1',
      nome: 'Nubank',
      limite: 350000,
      fechamento: 10,
      vencimento: 20,
      arquivado: false
    }
  ],
  categorias: [
    { id: 'cat-moradia', nome: 'Moradia' },
    { id: 'cat-alimentacao', nome: 'Alimentação' },
    { id: 'cat-contas', nome: 'Contas' },
    { id: 'cat-saude', nome: 'Saúde' },
    { id: 'cat-lazer', nome: 'Lazer' },
    { id: 'cat-transporte', nome: 'Transporte' }
  ],
  limites: {
    'cat-moradia': 200000,
    'cat-alimentacao': 120000,
    'cat-contas': 25000,
    'cat-saude': 25000,
    'cat-lazer': 30000,
    'cat-transporte': 20000
  },
  lancamentos: [
    // Entradas
    {
      id: 'l-salario',
      tipo: 'entrada',
      descricao: 'Salário Principal',
      fixo: true,
      dia: 5,
      inicio: '2026-01',
      fim: null,
      pulados: [],
      valores: [{ desde: '2026-01', valor: 520000 }],
      categoria: null,
      cartao: null
    },
    {
      id: 'l-freela',
      tipo: 'entrada',
      descricao: 'Freelance UI/UX',
      fixo: false,
      valor: 145000,
      data: `${mesAtual}-18`,
      categoria: null,
      cartao: null
    },

    // Despesas do mês
    {
      id: 'l-aluguel',
      tipo: 'saida',
      descricao: 'Aluguel & Condomínio',
      fixo: true,
      dia: 10,
      inicio: '2026-01',
      fim: null,
      pulados: [],
      valores: [{ desde: '2026-01', valor: 185000 }],
      categoria: 'cat-moradia',
      cartao: null
    },
    {
      id: 'l-mercado',
      tipo: 'saida',
      descricao: 'Supermercado Mensal',
      fixo: false,
      valor: 68000,
      data: `${mesAtual}-08`,
      categoria: 'cat-alimentacao',
      cartao: null
    },
    {
      id: 'l-internet',
      tipo: 'saida',
      descricao: 'Internet Fibra 600MB',
      fixo: true,
      dia: 15,
      inicio: '2026-01',
      fim: null,
      pulados: [],
      valores: [{ desde: '2026-01', valor: 11990 }],
      categoria: 'cat-contas',
      cartao: null
    },
    {
      id: 'l-academia',
      tipo: 'saida',
      descricao: 'Academia SmartFit',
      fixo: true,
      dia: 22,
      inicio: '2026-01',
      fim: null,
      pulados: [],
      valores: [{ desde: '2026-01', valor: 11000 }],
      categoria: 'cat-saude',
      cartao: null
    },
    {
      id: 'l-reserva',
      tipo: 'saida',
      descricao: 'Aporte Reserva Financeira',
      fixo: false,
      valor: 50000,
      data: `${mesAtual}-25`,
      categoria: null,
      cartao: null
    },

    // Compras no Cartão Nubank (ciclo fechando dia 10 e vencendo dia 20)
    {
      id: 'c-1',
      tipo: 'saida',
      descricao: 'Restaurante Outback',
      fixo: false,
      valor: 14850,
      data: `${mesAtual}-02`,
      criadoEm: `${mesAtual}-02T20:30:00`,
      categoria: 'cat-alimentacao',
      cartao: 'cartao-1'
    },
    {
      id: 'c-2',
      tipo: 'saida',
      descricao: 'Drogasil Medicamentos',
      fixo: false,
      valor: 6590,
      data: `${mesAtual}-04`,
      criadoEm: `${mesAtual}-04T15:15:00`,
      categoria: 'cat-saude',
      cartao: 'cartao-1'
    },
    {
      id: 'c-3',
      tipo: 'saida',
      descricao: 'Netflix & Spotify Duo',
      fixo: false,
      valor: 5590,
      data: `${mesAtual}-06`,
      criadoEm: `${mesAtual}-06T08:45:00`,
      categoria: 'cat-lazer',
      cartao: 'cartao-1'
    },
    {
      id: 'c-4',
      tipo: 'saida',
      descricao: 'Uber Viagens',
      fixo: false,
      valor: 4280,
      data: `${mesAtual}-08`,
      criadoEm: `${mesAtual}-08T18:20:00`,
      categoria: 'cat-transporte',
      cartao: 'cartao-1'
    },
    {
      id: 'c-5',
      tipo: 'saida',
      descricao: 'Livros de Design & Código',
      fixo: false,
      valor: 12000,
      data: `${mesAtual}-09`,
      criadoEm: `${mesAtual}-09T14:10:00`,
      categoria: null,
      cartao: 'cartao-1'
    }
  ],
  realizados: {
    [`l-salario|${mesAtual}`]: true,
    [`l-aluguel|${mesAtual}`]: true,
    [`l-mercado|${mesAtual}`]: true
  }
};

async function main() {
  console.log('Iniciando captura com Chrome headless...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Acessa e injeta os dados reais de simulação
  await page.goto('http://localhost:5000');
  await page.evaluate((dados) => {
    localStorage.setItem('zenny:v1', JSON.stringify(dados));
  }, demoState);

  // Recarrega para ler os dados injetados
  await page.reload();
  await page.waitForSelector('.lancamento', { timeout: 5000 });
  await page.waitForTimeout(500);

  // 1. Tela Inicial (Início)
  const pathInicio = join(ASSETS, 'print-inicio.png');
  await page.screenshot({ path: pathInicio });
  console.log('✓ Print Início salvo com dados:', pathInicio);

  // 2. Tela de Relatório
  await page.goto('http://localhost:5000/#/relatorio');
  await page.waitForSelector('.linha-categoria', { timeout: 5000 });
  await page.waitForTimeout(500);
  const pathRelatorio = join(ASSETS, 'print-relatorio.png');
  await page.screenshot({ path: pathRelatorio });
  console.log('✓ Print Relatório salvo com dados:', pathRelatorio);

  // 3. Tela de Detalhes do Cartão
  await page.goto('http://localhost:5000/#/cartoes');
  await page.waitForSelector('.cartao-toque', { timeout: 5000 });
  await page.click('.cartao-toque');
  await page.waitForSelector('.lancamento-detalhe', { timeout: 5000 });
  await page.waitForTimeout(500);
  const pathCartao = join(ASSETS, 'print-cartao.png');
  await page.screenshot({ path: pathCartao });
  console.log('✓ Print Detalhe do Cartão salvo com dados:', pathCartao);

  // Carrega as imagens em base64 para a montagem da vitrine
  const b64Inicio = 'data:image/png;base64,' + readFileSync(pathInicio).toString('base64');
  const b64Cartao = 'data:image/png;base64,' + readFileSync(pathCartao).toString('base64');
  const b64Relatorio = 'data:image/png;base64,' + readFileSync(pathRelatorio).toString('base64');

  // Monta a vitrine de apresentação promocional
  const mockupHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1280px;
      height: 720px;
      background: radial-gradient(circle at 50% 5%, #1d272f 0%, #111518 55%, #0a0c0e 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 26px 40px 0;
      position: relative;
    }

    /* Brilho verde característico da marca Zenny */
    .glow-bg {
      position: absolute;
      top: -160px;
      left: 50%;
      transform: translateX(-50%);
      width: 1000px;
      height: 480px;
      background: radial-gradient(ellipse at center, rgba(53, 179, 126, 0.25) 0%, rgba(53, 179, 126, 0) 70%);
      pointer-events: none;
      z-index: 0;
    }

    .header {
      text-align: center;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      background: rgba(53, 179, 126, 0.12);
      border: 1px solid rgba(53, 179, 126, 0.35);
      border-radius: 20px;
      color: #35b37e;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .title {
      font-size: 30px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .title span {
      color: #35b37e;
    }

    .subtitle {
      font-size: 14.5px;
      color: #9aa5b1;
      max-width: 600px;
      line-height: 1.4;
    }

    .showcase {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 32px;
      width: 100%;
      height: 540px;
      z-index: 1;
      position: relative;
      margin-top: 10px;
    }

    .phone-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .phone-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #829ab1;
      margin-bottom: 12px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      white-space: nowrap;
    }

    .phone-label.active {
      color: #35b37e;
      background: rgba(53, 179, 126, 0.12);
      border-color: rgba(53, 179, 126, 0.3);
    }

    /* Moldura física do smartphone */
    .phone-frame {
      width: 260px;
      height: 505px;
      background: #192025;
      border-radius: 38px;
      padding: 7px;
      border: 3.5px solid #2d3840;
      box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.9),
                  0 0 0 1px rgba(255, 255, 255, 0.07);
      position: relative;
      overflow: hidden;
    }

    .phone-screen {
      width: 100%;
      height: 100%;
      border-radius: 29px;
      overflow: hidden;
      background: #fbf9f5;
      position: relative;
    }

    .phone-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }

    /* Perspectiva sutil estilo vitrine moderna */
    .phone-left {
      transform: translateY(46px) rotate(-3.5deg);
      opacity: 0.95;
    }

    .phone-center {
      transform: translateY(20px) scale(1.03);
      z-index: 5;
    }

    .phone-center .phone-frame {
      border-color: rgba(53, 179, 126, 0.65);
      box-shadow: 0 35px 80px -10px rgba(0, 0, 0, 0.95),
                  0 0 50px rgba(53, 179, 126, 0.28);
    }

    .phone-right {
      transform: translateY(46px) rotate(3.5deg);
      opacity: 0.95;
    }
  </style>
</head>
<body>
  <div class="glow-bg"></div>

  <div class="header">
    <div class="badge">🌀 Cuidar do seu dinheiro com calma</div>
    <h1 class="title">Zenny <span>·</span> Simples, visual e direto ao ponto</h1>
    <p class="subtitle">Planejamento financeiro inteligente sem planilhas chatas e sem vocabulário de banco.</p>
  </div>

  <div class="showcase">
    <!-- Tela 1: Início -->
    <div class="phone-container phone-left">
      <div class="phone-label">1. Visão do Mês & Sobra</div>
      <div class="phone-frame">
        <div class="phone-screen">
          <img src="${b64Inicio}" alt="Tela de Início">
        </div>
      </div>
    </div>

    <!-- Tela 2: Detalhes do Cartão (Central) -->
    <div class="phone-container phone-center">
      <div class="phone-label active">✨ Fatura & Cartões Sem Medo</div>
      <div class="phone-frame">
        <div class="phone-screen">
          <img src="${b64Cartao}" alt="Fatura e Cartão">
        </div>
      </div>
    </div>

    <!-- Tela 3: Relatório -->
    <div class="phone-container phone-right">
      <div class="phone-label">3. Relatório por Categoria</div>
      <div class="phone-frame">
        <div class="phone-screen">
          <img src="${b64Relatorio}" alt="Relatório de Gastos">
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const mockupPage = await context.newPage();
  await mockupPage.setViewportSize({ width: 1280, height: 720 });
  await mockupPage.setContent(mockupHtml);
  await mockupPage.waitForTimeout(600);

  const pathMockup = join(ASSETS, 'preview.png');
  await mockupPage.screenshot({ path: pathMockup });
  console.log('✓ Mockup final salvo com sucesso em:', pathMockup);

  await browser.close();
}

main().catch(console.error);
