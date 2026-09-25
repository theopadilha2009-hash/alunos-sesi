"use client";

import { iniciais } from "./links";
import type { AlunoNaTela } from "./tipos";

/**
 * Carrega a foto do aluno para o canvas; `null` se ela não vier.
 *
 * O crachá não pode deixar de baixar por causa de um anexo: sem foto ele sai com
 * as iniciais, que é o que ele desenhava antes de existir upload.
 */
function carregarImagem(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Gera um PNG em alta resolução (2x Retina) do crachá do aluno usando Canvas nativo.
 * Sem dependências externas pesadas, 100% rápido e confiável no cliente.
 */
export async function baixarCrachaPng(
  aluno: AlunoNaTela,
  qrCodeDataUrl: string,
): Promise<void> {
  const largura = 720;
  const altura = 1040;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Fundo do Crachá com Cantos Arredondados
  const raio = 36;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(raio, 0);
  ctx.lineTo(largura - raio, 0);
  ctx.quadraticCurveTo(largura, 0, largura, raio);
  ctx.lineTo(largura, altura - raio);
  ctx.quadraticCurveTo(largura, altura, largura - raio, altura);
  ctx.lineTo(raio, altura);
  ctx.quadraticCurveTo(0, altura, 0, altura - raio);
  ctx.lineTo(0, raio);
  ctx.quadraticCurveTo(0, 0, raio, 0);
  ctx.closePath();
  ctx.clip();

  // Gradiente de Fundo
  const gradFundo = ctx.createLinearGradient(0, 0, largura, altura);
  gradFundo.addColorStop(0, "#101a22");
  gradFundo.addColorStop(0.5, "#0d141b");
  gradFundo.addColorStop(1, "#070b0e");
  ctx.fillStyle = gradFundo;
  ctx.fillRect(0, 0, largura, altura);

  // Efeito de Brilho Superior
  const gradBrilho = ctx.createRadialGradient(largura / 2, 80, 10, largura / 2, 80, 360);
  gradBrilho.addColorStop(0, "rgba(63, 194, 188, 0.2)");
  gradBrilho.addColorStop(0.6, "rgba(14, 65, 148, 0.08)");
  gradBrilho.addColorStop(1, "transparent");
  ctx.fillStyle = gradBrilho;
  ctx.fillRect(0, 0, largura, altura);

  // 2. Furo do Passante do Cordão
  ctx.fillStyle = "#050709";
  ctx.beginPath();
  ctx.roundRect((largura - 120) / 2, 28, 120, 22, 11);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Topo institucional (Logo SESI + STUDENT PASS)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ESCOLA SESI", 56, 120);

  ctx.fillStyle = "#3fc2bc";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("STUDENT PASS · 2026", 56, 142);

  // Chip Dourado
  ctx.save();
  const gradChip = ctx.createLinearGradient(largura - 120, 100, largura - 60, 145);
  gradChip.addColorStop(0, "#d4af37");
  gradChip.addColorStop(0.5, "#f3e5ab");
  gradChip.addColorStop(1, "#aa771c");
  ctx.fillStyle = gradChip;
  ctx.beginPath();
  ctx.roundRect(largura - 120, 100, 64, 46, 8);
  ctx.fill();
  ctx.restore();

  // Linha divisória
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(56, 175);
  ctx.lineTo(largura - 56, 175);
  ctx.stroke();

  // 4. Avatar do Aluno
  const avatarRaio = 70;
  const avatarX = largura / 2;
  const avatarY = 275;
  // 140px de diâmetro no PNG, que sai em 2x: é para cá que o `FOTO_LADO` de
  // 256px de limites.ts existe.
  const foto = aluno.foto_url ? await carregarImagem(aluno.foto_url) : null;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRaio, 0, Math.PI * 2);
  ctx.fillStyle = aluno.cor ? `${aluno.cor}33` : "#16232d";
  ctx.fill();
  ctx.strokeStyle = aluno.cor || "#3fc2bc";
  ctx.lineWidth = 4;
  ctx.stroke();

  if (foto) {
    ctx.save();
    // Recorte circular: o mesmo desenho do `Avatar` na tela, onde o CSS usa
    // `object-fit: cover` dentro de um círculo. Aqui o clip faz o papel do CSS.
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRaio, 0, Math.PI * 2);
    ctx.clip();
    const lado = Math.min(foto.width, foto.height);
    ctx.drawImage(
      foto,
      (foto.width - lado) / 2,
      (foto.height - lado) / 2,
      lado,
      lado,
      avatarX - avatarRaio,
      avatarY - avatarRaio,
      avatarRaio * 2,
      avatarRaio * 2,
    );
    ctx.restore();
  } else {
    // Iniciais
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iniciais(aluno.nome), avatarX, avatarY);
  }
  ctx.restore();

  // Estrelas
  if (aluno.estrelas > 0) {
    ctx.save();
    ctx.fillStyle = "#f3b544";
    ctx.beginPath();
    ctx.roundRect(avatarX - 45, avatarY + 54, 90, 26, 13);
    ctx.fill();
    ctx.fillStyle = "#0a0f14";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`★ ${aluno.estrelas} votos`, avatarX, avatarY + 67);
    ctx.restore();
  }

  // 5. Nome do Estudante
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(aluno.nome, largura / 2, 420);

  // 6. Sala Pill
  if (aluno.sala) {
    ctx.save();
    const textoSala = aluno.sala.toUpperCase();
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    const larguraPill = ctx.measureText(textoSala).width + 36;
    ctx.strokeStyle = aluno.cor || "#3fc2bc";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect((largura - larguraPill) / 2, 440, larguraPill, 30, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = aluno.cor || "#3fc2bc";
    ctx.textAlign = "center";
    ctx.fillText(textoSala, largura / 2, 460);
    ctx.restore();
  }

  // 7. Bio resumida
  if (aluno.bio) {
    ctx.fillStyle = "rgba(242, 245, 247, 0.7)";
    ctx.font = "16px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    const bioCurta = aluno.bio.length > 90 ? `${aluno.bio.slice(0, 87)}...` : aluno.bio;
    ctx.fillText(bioCurta, largura / 2, 510);
  }

  // Linha divisória inferior
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(56, 550);
  ctx.lineTo(largura - 56, 550);
  ctx.stroke();

  // 8. QR Code e Código de Barras
  const qrTamanho = 180;
  const qrX = 80;
  const qrY = 585;

  if (qrCodeDataUrl) {
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = qrCodeDataUrl;
      });
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrX - 10, qrY - 10, qrTamanho + 20, qrTamanho + 20, 12);
      ctx.fill();
      ctx.drawImage(img, qrX, qrY, qrTamanho, qrTamanho);
    } catch {}
  }

  // Código de Barras Estilizado
  const barX = 330;
  const barY = 620;
  const barLarguraTotal = 330;
  const barAltura = 60;

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  const barras = [4, 8, 3, 10, 4, 12, 5, 8, 4, 14, 3, 7, 9, 4, 11, 6, 8, 4, 12, 5, 9, 3, 7];
  let deslocamento = 0;
  for (const b of barras) {
    if (deslocamento + b > barLarguraTotal) break;
    ctx.fillRect(barX + deslocamento, barY, b - 1, barAltura);
    deslocamento += b + 4;
  }

  // Matrícula do Aluno
  const matricula = `SESI-${aluno.slug.toUpperCase().slice(0, 12)}-${(aluno.estrelas || 0).toString().padStart(2, "0")}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.fillText(matricula, barX, barY + barAltura + 28);

  ctx.fillStyle = "#3fc2bc";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("APONTE A CÂMERA PARA O PORTFÓLIO", barX, barY + barAltura + 55);

  // Rodapé do Card
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Serviço Social da Indústria · SESI Departamento Regional", largura / 2, altura - 30);

  // Borda Final Iluminada do Card
  ctx.strokeStyle = aluno.cor || "#3fc2bc";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Exportar e Baixar como PNG
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `cracha-sesi-${aluno.slug}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
