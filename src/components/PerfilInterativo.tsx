"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { CrachaModal } from "@/components/CrachaModal";
import { corHabilidade, extrairHabilidades } from "@/lib/habilidades";
import { handleLinkedin, iniciais, urlGithub } from "@/lib/links";
import { dispararConfetes, tocarSomEstrela } from "@/lib/som";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  salaNome: string | null;
};

export function PerfilInterativo({ aluno, salaNome }: Props) {
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [estrelas, setEstrelas] = useState(aluno.estrelas);
  const [estrelado, setEstrelado] = useState(false);
  const [carregandoVoto, setCarregandoVoto] = useState(false);

  const github = urlGithub(aluno.github);
  const linkedinHandle = handleLinkedin(aluno.linkedin);
  const habilidades = extrairHabilidades(aluno.bio);

  const urlAtual =
    typeof window !== "undefined"
      ? window.location.href
      : `https://alunos-sesi.vercel.app/alunos/${aluno.slug}`;

  useEffect(() => {
    QRCode.toDataURL(urlAtual, {
      width: 180,
      margin: 1,
      color: {
        dark: "#0b1418",
        light: "#ffffff",
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error("Falha ao gerar QR Code do perfil:", err));
  }, [urlAtual]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlAtual);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {}
  }

  async function votarEstrela(ev: React.MouseEvent) {
    if (carregandoVoto) return;
    setCarregandoVoto(true);

    const proximoEstrelado = !estrelado;
    setEstrelado(proximoEstrelado);
    setEstrelas((prev) => Math.max(0, prev + (proximoEstrelado ? 1 : -1)));

    if (proximoEstrelado) {
      tocarSomEstrela();
      dispararConfetes(ev.clientX, ev.clientY);
    }

    try {
      const resp = await fetch("/api/estrela", {
        method: proximoEstrelado ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: aluno.id }),
      });
      const dados = (await resp.json()) as { estrelas?: number; votado?: boolean };
      if (resp.ok && typeof dados.estrelas === "number") {
        setEstrelas(dados.estrelas);
        setEstrelado(Boolean(dados.votado));
      }
    } catch {
      // Reverte em caso de erro
      setEstrelado(!proximoEstrelado);
      setEstrelas((prev) => Math.max(0, prev + (proximoEstrelado ? -1 : 1)));
    } finally {
      setCarregandoVoto(false);
    }
  }

  const textoWhatsApp = encodeURIComponent(
    `Confira o perfil de ${aluno.nome} da Escola SESI: ${urlAtual}`,
  );
  const linkWhatsApp = `https://api.whatsapp.com/send?text=${textoWhatsApp}`;

  return (
    <>
      <article
        className="perfil perfil-moderno"
        style={{ ["--sala" as string]: aluno.cor }}
      >
        <div className="perfil-topo">
          <div className="perfil-avatar-wrap">
            <span className="avatar perfil-avatar" aria-hidden="true">
              {iniciais(aluno.nome)}
            </span>
            <button
              type="button"
              className="botao-cracha-flutuante"
              onClick={() => setCrachaAberto(true)}
              title="Abrir Crachá Digital 3D"
            >
              📇 Crachá
            </button>
          </div>

          <div className="perfil-titulos">
            <h1>{aluno.nome}</h1>
            <div className="perfil-sub-linha">
              {salaNome ? (
                <span className="sala-tag">
                  <span className="ponto" style={{ background: aluno.cor }} />
                  {salaNome}
                </span>
              ) : null}
              {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
              {aluno.destaque ? (
                <span className="selo selo-adm">★ Destaque do ADM</span>
              ) : null}
            </div>
          </div>
        </div>

        {aluno.bio ? <p className="perfil-bio-destaque">{aluno.bio}</p> : null}

        {habilidades.length > 0 ? (
          <div className="perfil-habilidades">
            <span className="perfil-label-secao">Competências & Tecnologias:</span>
            <div className="tags-container">
              {habilidades.map((hab) => (
                <span
                  key={hab}
                  className="tag-habilidade"
                  style={{ ["--cor-tag" as string]: corHabilidade(hab) }}
                >
                  {hab}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="perfil-grade-acoes">
          <div className="perfil-links">
            {aluno.linkedin ? (
              <a
                className="pes pes-in botao-link-perfil"
                href={aluno.linkedin}
                target="_blank"
                rel="noreferrer noopener"
              >
                in · {linkedinHandle ?? "LinkedIn"}
              </a>
            ) : null}

            {github ? (
              <a
                className="pes pes-gh botao-link-perfil"
                href={github}
                target="_blank"
                rel="noreferrer noopener"
              >
                gh · {aluno.github}
              </a>
            ) : null}

            <button
              type="button"
              className="estrela botao-estrela-grande"
              aria-pressed={estrelado}
              disabled={carregandoVoto}
              onClick={votarEstrela}
              title="Dar estrela"
            >
              {estrelado ? "★" : "☆"} {estrelas} estrelas
            </button>
          </div>

          {/* Cartão de Compartilhamento & QR Code */}
          <div className="perfil-compartilhar-box">
            <div className="qrcode-bloco">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code de ${aluno.nome}`}
                  className="qrcode-img"
                />
              ) : (
                <div className="qrcode-placeholder" />
              )}
              <span className="qrcode-legenda">Escanear com celular</span>
            </div>

            <div className="botoes-compartilhar">
              <button
                type="button"
                className="botao botao-primario"
                onClick={() => setCrachaAberto(true)}
              >
                📇 Abrir Crachá 3D Holográfico
              </button>

              <button
                type="button"
                className="botao botao-fraco"
                onClick={copiarLink}
              >
                {copiado ? "✓ Link Copiado!" : "📋 Copiar Link do Perfil"}
              </button>

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noreferrer noopener"
                className="botao botao-fraco botao-whats"
              >
                💬 Compartilhar no WhatsApp
              </a>
            </div>
          </div>
        </div>

        {!aluno.linkedin && !github ? (
          <p style={{ marginTop: "1.5rem", color: "var(--faint)" }}>
            Este aluno ainda não cadastrou LinkedIn nem GitHub.
          </p>
        ) : null}

        <p style={{ marginTop: "2.5rem" }}>
          <Link href="/alunos" className="botao botao-fraco">
            ← Voltar para a turma
          </Link>
        </p>
      </article>

      {crachaAberto ? (
        <CrachaModal
          aluno={{ ...aluno, sala: salaNome, habilidades }}
          onClose={() => setCrachaAberto(false)}
        />
      ) : null}
    </>
  );
}
