/**
 * Gera os ícones do PWA a partir do wordmark oficial (`logo-sesi-icone.png`).
 *
 * O manifest declarava os wordmarks (165x64 e 264x64) como 192 e 512 — o
 * Chrome confia no `sizes` e o ícone instalava espremido. Este script compõe
 * a MESMA arte sobre um quadrado: nada de marca nova, só a existente
 * centralizada nas proporções que o ícone pede.
 *
 * Três saídas em `public/`:
 *   pwa-192.png         quadrado 192, wordmark a 78% da largura
 *   pwa-512.png         quadrado 512, wordmark a 78% da largura
 *   pwa-maskable-512.png 512, wordmark a 60% — a safe zone do maskable é o
 *                       círculo de 80% de diâmetro; um retângulo centrado a
 *                       60% da largura inteiro cabe nele.
 *
 * Regenerar: `node scripts/gerar-icones.mjs` (roda do root, usa `sharp`).
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const FONTE = "public/logo-sesi-icone.png";
const FUNDO = { r: 255, g: 255, b: 255, alpha: 1 };

async function gerar(tamanho, larguraArte, destino) {
  const fonte = await readFile(FONTE);
  const arte = await sharp(fonte)
    .resize({ width: larguraArte })
    .png()
    .toBuffer();
  const metadados = await sharp(arte).metadata();
  const esquerda = Math.round((tamanho - larguraArte) / 2);
  const topo = Math.round((tamanho - metadados.height) / 2);

  await writeFile(
    destino,
    await sharp({
      create: { width: tamanho, height: tamanho, channels: 4, background: FUNDO },
    })
      .composite([{ input: arte, left: esquerda, top: topo }])
      .png()
      .toBuffer(),
  );
  console.log(`ok: ${destino} (${tamanho}x${tamanho}, arte ${larguraArte}px)`);
}

await gerar(192, 150, "public/pwa-192.png");
await gerar(512, 400, "public/pwa-512.png");
await gerar(512, 307, "public/pwa-maskable-512.png");
