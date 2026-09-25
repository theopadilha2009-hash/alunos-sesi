"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Roseta } from "@/components/Roseta";
import { BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import { IconeCopiar, IconeDownload, IconeEstrela, IconeLinkExterno } from "@/components/Icones";
import { baixarCrachaPng } from "@/lib/exportar-cracha";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  onClose: () => void;
};

export function CrachaModal({ aluno, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const urlPerfil =
    typeof window !== "undefined"
      ? `${window.location.origin}/alunos/${aluno.slug}`
      : `https://alunos-sesi.vercel.app/alunos/${aluno.slug}`;

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        // qrcode só entra no bundle quando o crachá abre de fato
        const { toDataURL } = await import("qrcode");
        const dataUrl = await toDataURL(urlPerfil, {
          width: 240,
          margin: 1,
          color: {
            dark: "#0b1418",
            light: "#ffffff",
          },
        });
        if (vivo) setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error("Falha ao gerar QR code:", err);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [urlPerfil]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // O diálogo se declara `aria-modal`, então o foco tem que entrar nele ao
  // abrir e voltar para quem abriu ao fechar. Sem isso o Tab segue percorrendo
  // a página atrás do overlay e o leitor de tela nunca anuncia que abriu algo.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    dialogoRef.current?.focus();
    return () => anterior?.focus();
  }, []);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPerfil);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {}
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

  const matricula = `SESI-${aluno.slug.toUpperCase().slice(0, 10)}-${aluno.estrelas.toString().padStart(2, "0")}`;

  return (
    <div
      ref={dialogoRef}
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Crachá Digital de ${aluno.nome}`}
      tabIndex={-1}
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

        {/* Card do Crachá: Leve, nítido, sem bola holográfica pesada e com contraste impecável */}
        <div
          ref={cardRef}
          className="cracha-card cracha-card-leve"
          style={{ ["--sala-cor" as string]: aluno.cor }}
        >
          {/* Abertura do Passante de Cordão */}
          <div className="cracha-furo" aria-hidden="true" />

          <header className="cracha-cabecalho">
            <div className="cracha-marca">
              <Roseta tamanho={26} />
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
                  <IconeEstrela preenchida tamanho={11} /> {aluno.estrelas}
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
                {aluno.destaque ? <span className="selo selo-adm">Destaque</span> : null}
              </div>

              {aluno.bio ? <p className="cracha-bio">{aluno.bio}</p> : null}

              {aluno.habilidades && aluno.habilidades.length > 0 ? (
                <div className="cracha-habilidades">
                  {aluno.habilidades.slice(0, 3).map((hab) => (
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

        {/* Ações Coesas e Organizadas em Dois Níveis Elegantes */}
        <div className="cracha-acoes-deck">
          <div className="cracha-acoes-principais">
            <button
              type="button"
              className="btn-cracha-acao btn-cracha-download"
              onClick={handleBaixarCracha}
              disabled={baixando}
              title="Baixar imagem em alta resolução (PNG) para impressão ou crachá físico"
            >
              <IconeDownload tamanho={16} />
              <span>{baixando ? "Gerando PNG..." : "Baixar Crachá (PNG)"}</span>
            </button>

            <button
              type="button"
              className="btn-cracha-acao btn-cracha-copiar"
              onClick={copiarLink}
              title="Copiar link do portfólio"
            >
              <IconeCopiar tamanho={15} />
              <span>{copiado ? "Link Copiado!" : "Copiar Link"}</span>
            </button>

            <Link
              href={`/alunos/${aluno.slug}`}
              className="btn-cracha-acao btn-cracha-link"
              onClick={onClose}
              title="Acessar página pública do estudante"
            >
              <IconeLinkExterno tamanho={14} />
              <span>Ver Página</span>
            </Link>
          </div>

          {(aluno.linkedin || aluno.github || aluno.instagram) ? (
            <div className="cracha-acoes-redes">
              <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
              <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
              <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
