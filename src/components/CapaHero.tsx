"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Roseta } from "@/components/Roseta";

export function CapaHero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, mx: 50, my: 50, ativo: false });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -12;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 12;

    setTilt({
      rotX,
      rotY,
      mx: (x / rect.width) * 100,
      my: (y / rect.height) * 100,
      ativo: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rotX: 0, rotY: 0, mx: 50, my: 50, ativo: false });
  }

  return (
    <div className="wrap capa capa-moderna">
      <div className="capa-conteudo">
        <div className="capa-selo-topo">
          <span className="ponto-pulsante" />
          <span>REDE SESI TECH · CRACHÁS 3D & SPOTLIGHT</span>
        </div>

        <h1>
          Quem é quem,
          <br />
          <span className="vazado">e onde encontrar.</span>
        </h1>

        <p className="lede">
          O diretório inteligente da turma: LinkedIn, GitHub, competências e
          crachás holográficos interativos. Feito para conectar estudantes,
          equipes de robótica e projetos com quem está contratando.
        </p>

        <div className="capa-botoes">
          <Link href="/alunos" className="botao botao-primario-grande">
            Explorar a Vitrine →
          </Link>
          <Link href="/alunos" className="botao botao-fraco-grande">
            🔍 Buscar Aluno (⌘K)
          </Link>
        </div>

        <div className="capa-mini-metricas">
          <div className="mini-metrica-item">
            <b>100%</b>
            <span>Conectado</span>
          </div>
          <div className="mini-metrica-divisor" />
          <div className="mini-metrica-item">
            <b>3D Pass</b>
            <span>Crachá Digital</span>
          </div>
          <div className="mini-metrica-divisor" />
          <div className="mini-metrica-item">
            <b>Instantâneo</b>
            <span>QR Code ao Vivo</span>
          </div>
        </div>
      </div>

      <div className="capa-arte-interativa">
        <div
          ref={cardRef}
          className="capa-card-preview"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={
            {
              "--card-rot-x": `${tilt.rotX}deg`,
              "--card-rot-y": `${tilt.rotY}deg`,
              "--card-mx": `${tilt.mx}%`,
              "--card-my": `${tilt.my}%`,
            } as React.CSSProperties
          }
        >
          <div className="preview-brilho" />
          <div className="preview-topo">
            <Roseta tamanho={28} />
            <div className="preview-topo-texto">
              <span className="preview-pass">SESI STUDENT PASS</span>
              <span className="preview-edicao">EDIÇÃO 2026</span>
            </div>
            <span className="preview-chip" />
          </div>

          <div className="preview-aluno">
            <span className="avatar preview-avatar">TS</span>
            <div>
              <span className="preview-nome">Turma SESI</span>
              <span className="preview-sala">
                <span className="ponto" style={{ background: "var(--ciano)" }} />
                Robótica & Tecnologia
              </span>
            </div>
          </div>

          <div className="preview-habilidades">
            <span className="tag-habilidade" style={{ ["--cor-tag" as string]: "var(--ciano)" }}>
              Robótica FLL
            </span>
            <span className="tag-habilidade" style={{ ["--cor-tag" as string]: "var(--verde)" }}>
              Python
            </span>
            <span className="tag-habilidade" style={{ ["--cor-tag" as string]: "var(--amarelo)" }}>
              Hardware IoT
            </span>
          </div>

          <div className="preview-rodape">
            <div className="preview-codigo-barras">
              <span className="barra" />
              <span className="barra grossa" />
              <span className="barra" />
              <span className="barra grossa" />
              <span className="barra fina" />
              <span className="barra" />
            </div>
            <span className="preview-qr-badge">★ Interativo 3D</span>
          </div>
        </div>
      </div>
    </div>
  );
}
