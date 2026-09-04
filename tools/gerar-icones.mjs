/* Gerador dos icones do PWA.
 *
 * Por que um script e nao PNGs commitados a mao: o manifest do Android exige
 * PNG (SVG nao serve para instalar como WebAPK), e a maquina de desenvolvimento
 * nao tem ImageMagick nem Python. Em vez de depender de ferramenta externa ou
 * de um site de conversao, os icones sao rasterizados aqui — com zlib, que ja
 * vem no Node. Assim a marca vive em um lugar so: este arquivo.
 *
 * Se a marca mudar, mude aqui e rode:  node tools/gerar-icones.mjs
 *
 * A marca e o enso: circulo aberto do zen, que tambem le como moeda. A abertura
 * fica no quadrante superior direito.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'assets', 'icons');

const TINTA = [0x14, 0x18, 0x1c];
const VERDE = [0x35, 0xb3, 0x7e];

/* ---------- PNG ---------- */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** @param {Buffer} buf @returns {number} */
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {string} tipo @param {Buffer} dados @returns {Buffer} */
function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

/* Codifica RGBA (8 bits por canal, sem filtro) em PNG. */
/**
 * @param {number} largura
 * @param {number} altura
 * @param {Buffer} rgba
 * @returns {Buffer}
 */
function png(largura, altura, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;   // profundidade de bits
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compressao deflate
  ihdr[11] = 0;  // filtro adaptativo
  ihdr[12] = 0;  // sem entrelacamento

  // Cada linha do PNG e prefixada pelo byte de filtro (0 = nenhum).
  const bruto = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y++) {
    const origem = y * largura * 4;
    const destino = y * (1 + largura * 4);
    bruto[destino] = 0;
    rgba.copy(bruto, destino + 1, origem, origem + largura * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- Desenho ---------- */

/* Cobertura de um ponto pelo retangulo de cantos arredondados. */
/**
 * @param {number} x
 * @param {number} y
 * @param {number} lado
 * @param {number} raio
 * @returns {boolean}
 */
function dentroDoQuadrado(x, y, lado, raio) {
  if (raio <= 0) return x >= 0 && y >= 0 && x <= lado && y <= lado;
  const cx = Math.min(Math.max(x, raio), lado - raio);
  const cy = Math.min(Math.max(y, raio), lado - raio);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= raio * raio;
}

/* O anel aberto, com as pontas arredondadas. O vao vai de 315 a 360 graus,
   medidos no sentido horario da tela a partir das 3 horas. */
/**
 * @param {number} x
 * @param {number} y
 * @param {number} cx
 * @param {number} cy
 * @param {number} raio
 * @param {number} espessura
 * @returns {boolean}
 */
function dentroDoAnel(x, y, cx, cy, raio, espessura) {
  const dx = x - cx;
  const dy = y - cy;
  const meia = espessura / 2;
  const distancia = Math.hypot(dx, dy);

  if (Math.abs(distancia - raio) <= meia) {
    let angulo = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angulo < 0) angulo += 360;
    if (angulo < 315) return true;
  }

  // Pontas arredondadas: um disco em cada extremidade do arco.
  for (const graus of [315, 0]) {
    const rad = (graus * Math.PI) / 180;
    const px = cx + raio * Math.cos(rad);
    const py = cy + raio * Math.sin(rad);
    if (Math.hypot(x - px, y - py) <= meia) return true;
  }

  return false;
}

/* Rasteriza com supersampling 4x4 — sem isso o anel fica serrilhado. */
/**
 * @param {number} lado
 * @param {{ raioDoCanto: number, raioDoAnel: number, espessura: number }} proporcoes
 * @returns {Buffer}
 */
function desenhar(lado, { raioDoCanto, raioDoAnel, espessura }) {
  const AMOSTRAS = 4;
  const rgba = Buffer.alloc(lado * lado * 4);
  const centro = lado / 2;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let fundo = 0;
      let marca = 0;

      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const px = x + (sx + 0.5) / AMOSTRAS;
          const py = y + (sy + 0.5) / AMOSTRAS;
          if (!dentroDoQuadrado(px, py, lado, raioDoCanto)) continue;
          fundo++;
          if (dentroDoAnel(px, py, centro, centro, raioDoAnel, espessura)) marca++;
        }
      }

      const total = AMOSTRAS * AMOSTRAS;
      const alfa = fundo / total;
      const proporcaoDaMarca = fundo > 0 ? marca / fundo : 0;
      const i = (y * lado + x) * 4;

      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(
          TINTA[c] * (1 - proporcaoDaMarca) + VERDE[c] * proporcaoDaMarca
        );
      }
      rgba[i + 3] = Math.round(alfa * 255);
    }
  }

  return png(lado, lado, rgba);
}

/* ---------- Saida ----------
 *
 * O maskable e diferente dos outros de proposito: o Android recorta o icone na
 * forma do launcher, e so o circulo central de 80% e area segura. Por isso ele
 * vai sem cantos arredondados (fundo sangrando) e com o anel menor.
 */
const ICONES = [
  { arquivo: 'icon-192.png', lado: 192, cantoRel: 22 / 96, anelRel: 28 / 96, espessuraRel: 8 / 96 },
  { arquivo: 'icon-512.png', lado: 512, cantoRel: 22 / 96, anelRel: 28 / 96, espessuraRel: 8 / 96 },
  { arquivo: 'icon-maskable-512.png', lado: 512, cantoRel: 0, anelRel: 0.22, espessuraRel: 0.063 },
  { arquivo: 'apple-touch-icon.png', lado: 180, cantoRel: 0, anelRel: 28 / 96, espessuraRel: 8 / 96 },
];

mkdirSync(DESTINO, { recursive: true });

for (const { arquivo, lado, cantoRel, anelRel, espessuraRel } of ICONES) {
  const buffer = desenhar(lado, {
    raioDoCanto: lado * cantoRel,
    raioDoAnel: lado * anelRel,
    espessura: lado * espessuraRel,
  });
  writeFileSync(join(DESTINO, arquivo), buffer);
  console.log(`${arquivo.padEnd(24)} ${lado}x${lado}  ${(buffer.length / 1024).toFixed(1)} kB`);
}
