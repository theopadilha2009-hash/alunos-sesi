"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Roseta } from "@/components/Roseta";
import { BadgeEmail, BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import { Avatar } from "@/components/Avatar";
import { LinhaCargos } from "@/components/CargosBadges";
import { IconeCopiar, IconeDownload, IconeEstrela, IconeLinkExterno } from "@/components/Icones";
import { copiarTexto } from "@/lib/clipboard";
import { baixarCrachaPng } from "@/lib/exportar-cracha";
import { useTravaDeFoco } from "@/lib/foco";
import { corHabilidade } from "@/lib/habilidades";
import { matriculaDe } from "@/lib/identidade";
import type { AlunoNaTela, UsuarioSessao } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  /**
   * Papel de login de quem é o dono do crachá, quando quem abre o crachá é o
   * próprio aluno no painel.
   *
   * Vem por prop, e nunca de `aluno`: o papel mora em `public.usuarios` — a
   * tabela de LOGIN, ligada a `alunos` por `aluno_id`. `AlunoNaTela` descreve
   * `public.alunos`, que não tem essa coluna. O cast que morava aqui
   * (`(aluno as unknown as { role?: string }).role`) lia `undefined` sempre e
   * existia só para calar o `tsc` — o compilador estava certo.
   *
   * Crachá aberto sobre outra pessoa (vitrine, perfil público) não recebe
   * isto: o papel dela não é conhecido ali, e buscá-lo publicaria quem é ADM.
   */
  role?: UsuarioSessao["role"] | null;
  onClose: () => void;
};

export function CrachaModal({ aluno, role, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(dialogoRef);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [erroCopiar, setErroCopiar] = useState(false);
  const [baixando, setBaixando] = useState(false);

  // Efeito 3D de Inspeção Interativa com Mouse (Estilo Carta Colecionável Holográfica)
  const [rotacao, setRotacao] = useState({ x: 0, y: 0 });
  const [brilhoPos, setBrilhoPos] = useState({ x: 50, y: 50 });
  const [estaInspecionando, setEstaInspecionando] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centroX = rect.width / 2;
    const centroY = rect.height / 2;

    const rotX = -((y - centroY) / centroY) * 14;
    const rotY = ((x - centroX) / centroX) * 14;

    setRotacao({ x: rotX, y: rotY });
    setBrilhoPos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  }

  function handleMouseEnter() {
    setEstaInspecionando(true);
  }

  function handleMouseLeave() {
    setEstaInspecionando(false);
    setRotacao({ x: 0, y: 0 });
    setBrilhoPos({ x: 50, y: 50 });
  }

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
    if (await copiarTexto(urlPerfil)) {
      setErroCopiar(false);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
      return;
    }
    setCopiado(false);
    setErroCopiar(true);
    setTimeout(() => setErroCopiar(false), 4000);
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

  const matricula = matriculaDe(aluno);

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

        {/* Card do Crachá: Iluminado, nítido e interativo em 3D como carta colecionável */}
        <div
          ref={cardRef}
          className={`cracha-card cracha-card-leve ${estaInspecionando ? "cracha-inspecionando" : ""}`}
          style={{
            ["--sala-cor" as string]: aluno.cor,
            ["--glare-x" as string]: `${brilhoPos.x}%`,
            ["--glare-y" as string]: `${brilhoPos.y}%`,
            transform: estaInspecionando
              ? `perspective(1000px) rotateX(${rotacao.x.toFixed(2)}deg) rotateY(${rotacao.y.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`
              : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Camada Holográfica de Brilho Dinâmico estilo Carta Rara */}
          <div className="cracha-holografico-glare" aria-hidden="true" />

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
              <Avatar nome={aluno.nome} foto={aluno.foto_url} className="cracha-avatar" />
              {aluno.estrelas > 0 ? (
                <span className="cracha-estrela-badge" title="Estrelas recebidas">
                  <IconeEstrela preenchida tamanho={11} /> {aluno.estrelas}
                </span>
              ) : null}
            </div>

            <div className="cracha-dados">
              <h3 className="cracha-nome">{aluno.nome}</h3>
              <div className="cracha-linha-sala">
                <LinhaCargos
                  aluno={aluno}
                  role={role}
                  agruparExtras
                  tamanho="pequeno"
                />
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
              <span>{erroCopiar ? "Não deu para copiar" : copiado ? "Link Copiado!" : "Copiar Link"}</span>
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

          {(aluno.linkedin || aluno.github || aluno.instagram || aluno.email) ? (
            <div className="cracha-acoes-redes">
              <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
              <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
              <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />
              <BadgeEmail email={aluno.email} nomeAluno={aluno.nome} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
