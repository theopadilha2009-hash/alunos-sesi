"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Roseta } from "@/components/Roseta";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { baixarCrachaPng } from "@/lib/exportar-cracha";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais, urlGithub } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  onClose: () => void;
};

export function CrachaModal({ aluno, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [rotacao, setRotacao] = useState({ x: 0, y: 0, brilhoX: 50, brilhoY: 50 });

  const urlPerfil =
    typeof window !== "undefined"
      ? `${window.location.origin}/alunos/${aluno.slug}`
      : `https://alunos-sesi.vercel.app/alunos/${aluno.slug}`;

  useEffect(() => {
    QRCode.toDataURL(urlPerfil, {
      width: 220,
      margin: 1,
      color: {
        dark: "#0b1418",
        light: "#ffffff",
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error("Falha ao gerar QR code:", err));
  }, [urlPerfil]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -14;
      const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 14;
      setRotacao({ x: rotX, y: rotY, brilhoX: percentX, brilhoY: percentY });
    });
  }

  function handleMouseLeave() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRotacao({ x: 0, y: 0, brilhoX: 50, brilhoY: 50 });
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPerfil);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      // Fallback silencioso
    }
  }

  async function compartilhar() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${aluno.nome} · Alunos SESI`,
          text: `Confira o perfil de ${aluno.nome} no diretório de Alunos SESI!`,
          url: urlPerfil,
        });
        return;
      } catch {
        // Usuário cancelou
      }
    }
    copiarLink();
  }

  async function handleBaixarCracha() {
    if (baixando) return;
    setBaixando(true);
    try {
      await baixarCrachaPng(aluno, qrCodeDataUrl);
    } catch (err) {
      console.error("Erro ao gerar imagem do crachá:", err);
    } finally {
      setBaixando(false);
    }
  }

  const githubUrl = urlGithub(aluno.github);
  const matricula = `SESI-${aluno.slug.toUpperCase().slice(0, 10)}-${aluno.estrelas.toString().padStart(2, "0")}`;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Crachá Digital de ${aluno.nome}`}
    >
      <div className="cracha-container" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="cracha-fechar"
          onClick={onClose}
          aria-label="Fechar crachá"
          title="Fechar (ESC)"
        >
          ✕
        </button>

        <div className="cracha-cordao-presilha" aria-hidden="true">
          <div className="cracha-fita" />
          <div className="cracha-gancho" />
        </div>

        <div
          ref={cardRef}
          className="cracha-card"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={
            {
              "--rot-x": `${rotacao.x}deg`,
              "--rot-y": `${rotacao.y}deg`,
              "--brilho-x": `${rotacao.brilhoX}%`,
              "--brilho-y": `${rotacao.brilhoY}%`,
              "--sala-cor": aluno.cor,
            } as React.CSSProperties
          }
        >
          {/* Efeito Holográfico Metalizado */}
          <div className="cracha-holograma" aria-hidden="true" />

          {/* Abertura do Passante de Cordão */}
          <div className="cracha-furo" aria-hidden="true" />

          <header className="cracha-cabecalho">
            <div className="cracha-marca">
              <Roseta tamanho={24} />
              <div>
                <span className="cracha-logo-texto">ESCOLA SESI</span>
                <span className="cracha-sub">STUDENT PASS · 2026</span>
              </div>
            </div>
            <div className="cracha-chip" aria-hidden="true">
              <span className="chip-linha" />
              <span className="chip-linha" />
              <span className="chip-linha" />
            </div>
          </header>

          <div className="cracha-corpo">
            <div className="cracha-foto-wrapper">
              <span className="cracha-avatar" aria-hidden="true">
                {iniciais(aluno.nome)}
              </span>
              {aluno.estrelas > 0 ? (
                <span className="cracha-estrela-badge" title="Estrelas recebidas">
                  ★ {aluno.estrelas}
                </span>
              ) : null}
            </div>

            <div className="cracha-dados">
              <h3 className="cracha-nome">{aluno.nome}</h3>
              <div className="cracha-linha-sala">
                {aluno.sala ? (
                  <span className="cracha-sala-pill" style={{ borderColor: aluno.cor }}>
                    <span className="ponto" style={{ background: aluno.cor }} />
                    {aluno.sala}
                  </span>
                ) : null}
                {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
                {aluno.destaque ? <span className="selo selo-adm">★ Destaque</span> : null}
              </div>

              {aluno.bio ? <p className="cracha-bio">{aluno.bio}</p> : null}

              {aluno.habilidades && aluno.habilidades.length > 0 ? (
                <div className="cracha-habilidades">
                  {aluno.habilidades.map((hab) => (
                    <span
                      key={hab}
                      className="tag-habilidade"
                      style={{ ["--cor-tag" as string]: corHabilidade(hab) }}
                    >
                      {hab}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="cracha-rodape">
            <div className="cracha-qrcode-area">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code para o perfil de ${aluno.nome}`}
                  className="cracha-qrcode"
                />
              ) : (
                <div className="cracha-qrcode-placeholder" />
              )}
              <span className="cracha-qr-dica">Aponte a câmera</span>
            </div>

            <div className="cracha-matricula-area">
              <div className="cracha-codigo-barras" aria-hidden="true">
                <span className="barra" />
                <span className="barra grossa" />
                <span className="barra" />
                <span className="barra fina" />
                <span className="barra grossa" />
                <span className="barra" />
                <span className="barra fina" />
                <span className="barra grossa" />
                <span className="barra" />
                <span className="barra" />
                <span className="barra grossa" />
              </div>
              <span className="cracha-matricula-texto">{matricula}</span>
            </div>
          </div>
        </div>

        {/* Ações do Crachá */}
        <div className="cracha-acoes">
          <button
            type="button"
            className="botao botao-primario"
            onClick={handleBaixarCracha}
            disabled={baixando}
            title="Baixar imagem em alta resolução (PNG) para impressão ou crachá físico"
          >
            {baixando ? "⏳ Gerando PNG..." : "📥 Baixar Crachá (PNG)"}
          </button>

          <button
            type="button"
            className="botao botao-fraco"
            onClick={copiarLink}
          >
            {copiado ? "✓ Link Copiado!" : "📋 Copiar Link"}
          </button>

          <button
            type="button"
            className="botao botao-fraco"
            onClick={compartilhar}
          >
            ↗ Compartilhar
          </button>

          <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
          <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />

          <Link
            href={`/alunos/${aluno.slug}`}
            className="botao botao-fraco"
            onClick={onClose}
          >
            Ver Página →
          </Link>
        </div>
      </div>
    </div>
  );
}
