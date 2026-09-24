"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Roseta } from "@/components/Roseta";
import {
  IconeCracha,
  IconeDownload,
  IconeEscudo,
  IconeImprimir,
  IconeLinkExterno,
  IconeProjetos,
} from "@/components/Icones";
import type { AlunoNaTela } from "@/lib/tipos";
import { iniciais } from "@/lib/links";

type Props = {
  aluno: AlunoNaTela;
  onFechar: () => void;
};

export function CurriculoImpressao({ aluno, onFechar }: Props) {
  const [qrValidador, setQrValidador] = useState<string>("");

  const urlValidacao =
    typeof window !== "undefined"
      ? `${window.location.origin}/validar/${aluno.slug}`
      : `https://alunos-sesi.vercel.app/validar/${aluno.slug}`;

  useEffect(() => {
    QRCode.toDataURL(urlValidacao, {
      width: 140,
      margin: 1,
      color: { dark: "#0B0F17", light: "#ffffff" },
    })
      .then(setQrValidador)
      .catch(() => {});
  }, [urlValidacao]);

  const votos = aluno.habilidades_votos || {};
  const matricula = `SESI-SC-JVE-${aluno.slug.toUpperCase().slice(0, 8)}-${(aluno.estrelas + 26).toString().padStart(4, "0")}`;

  function handleImprimir() {
    window.print();
  }

  return (
    <div className="modal-backdrop curriculo-modal-backdrop" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="curriculo-dialog-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Barra de Ações Superior (Não sai na impressão) */}
        <div className="curriculo-top-bar nao-imprimir">
          <div className="curriculo-top-info">
            <span className="badge-curriculo-formato">FORMATO OFICIAL A4</span>
            <span className="curriculo-top-titulo">Mini-Currículo Acadêmico & Profissional</span>
          </div>
          <div className="curriculo-top-botoes">
            <button
              type="button"
              className="botao botao-primario btn-imprimir-curriculo"
              onClick={handleImprimir}
              title="Salvar como PDF ou Imprimir em A4"
            >
              <IconeImprimir tamanho={16} />
              <span>Salvar em PDF / Imprimir</span>
            </button>
            <button
              type="button"
              className="botao botao-fraco"
              onClick={onFechar}
              title="Fechar visualização"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Folha A4 Padrão Internacional */}
        <div className="curriculo-folha-a4" id="curriculo-folha-a4">
          {/* Cabeçalho Institucional Oficial SESI SC */}
          <header className="curriculo-cabecalho">
            <div className="curriculo-marcas">
              <Roseta tamanho={32} />
              <div className="curriculo-instituicao-textos">
                <span className="instituicao-nome">SISTEMA FIESC · ESCOLA SESI SENAI</span>
                <span className="instituicao-unidade">Unidade Joinville · Santa Catarina</span>
              </div>
            </div>
            <div className="curriculo-carimbo-oficial">
              <span className="carimbo-label">DOCUMENTO OFICIAL DO ESTUDANTE</span>
              <span className="carimbo-ano">Ano Letivo 2026</span>
            </div>
          </header>

          <hr className="curriculo-divisor-topo" />

          {/* Dados do Estudante & Contatos Rápidos */}
          <section className="curriculo-secao-identidade">
            <div className="curriculo-avatar-col">
              <span className="avatar curriculo-avatar">{iniciais(aluno.nome)}</span>
            </div>

            <div className="curriculo-dados-col">
              <h1 className="curriculo-nome">{aluno.nome}</h1>
              <p className="curriculo-subtitulo">
                Formação Técnica em Desenvolvimento de Sistemas / Ensino Médio SESI · Turma {aluno.sala || "DSM3"}
              </p>

              <div className="curriculo-contatos-grid">
                <div className="curriculo-contato-item">
                  <span className="contato-rotulo">Matrícula Escolar:</span>
                  <span className="contato-valor mono">{matricula}</span>
                </div>

                <div className="curriculo-contato-item">
                  <span className="contato-rotulo">Situação:</span>
                  <span className="contato-valor verde">Matrícula Ativa & Regular</span>
                </div>

                {aluno.linkedin ? (
                  <div className="curriculo-contato-item">
                    <span className="contato-rotulo">LinkedIn:</span>
                    <a href={aluno.linkedin} target="_blank" rel="noreferrer" className="contato-link">
                      {aluno.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}
                    </a>
                  </div>
                ) : null}

                {aluno.github ? (
                  <div className="curriculo-contato-item">
                    <span className="contato-rotulo">GitHub:</span>
                    <a
                      href={`https://github.com/${aluno.github.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="contato-link"
                    >
                      github.com/{aluno.github.replace(/^@/, "")}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* Resumo Profissional / Biografia */}
          {aluno.bio ? (
            <section className="curriculo-bloco">
              <h2 className="curriculo-secao-titulo">Resumo Profissional & Acadêmico</h2>
              <p className="curriculo-bio-texto">{aluno.bio}</p>
            </section>
          ) : null}

          {/* Competências Técnicas e Apoios de Colegas (Endorsements) */}
          {aluno.habilidades && aluno.habilidades.length > 0 ? (
            <section className="curriculo-bloco">
              <h2 className="curriculo-secao-titulo">Competências Técnicas & Tecnologias Dominadas</h2>
              <div className="curriculo-habilidades-grid">
                {aluno.habilidades.map((hab) => {
                  const apoios = votos[hab] || 0;
                  return (
                    <div key={hab} className="curriculo-hab-tag">
                      <span className="hab-nome">{hab}</span>
                      {apoios > 0 ? (
                        <span className="hab-apoios" title={`${apoios} apoios recebidos de colegas e professores`}>
                          +{apoios} apoios
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Portfólio de Projetos & Criações */}
          {aluno.projetos && aluno.projetos.length > 0 ? (
            <section className="curriculo-bloco">
              <h2 className="curriculo-secao-titulo">Projetos Técnicos & Inovações Desenvolvidas</h2>
              <div className="curriculo-projetos-lista">
                {aluno.projetos.map((proj) => (
                  <div key={proj.id} className="curriculo-projeto-item">
                    <div className="curriculo-proj-topo">
                      <div className="curriculo-proj-titulo-wrap">
                        <IconeProjetos tamanho={14} />
                        <h3 className="curriculo-proj-titulo">{proj.titulo}</h3>
                      </div>
                      {proj.link ? (
                        <span className="curriculo-proj-url">{proj.link}</span>
                      ) : null}
                    </div>
                    {proj.descricao ? (
                      <p className="curriculo-proj-desc">{proj.descricao}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Rodapé de Autenticação Digital & QR Code de Verificação */}
          <footer className="curriculo-rodape">
            <div className="curriculo-qrcode-bloco">
              {qrValidador ? (
                <img src={qrValidador} alt="QR Code de validação" className="curriculo-qrcode-img" />
              ) : null}
              <div className="curriculo-validacao-textos">
                <span className="val-titulo">Autenticidade Verificável por QR Code</span>
                <span className="val-desc">
                  Aponte a câmera para confirmar a matrícula e o histórico escolar oficial em:
                </span>
                <span className="val-url">{urlValidacao}</span>
              </div>
            </div>

            <div className="curriculo-selo-emissao">
              <div className="selo-emissao-badge">
                <IconeEscudo tamanho={16} />
                <span>Emitido pelo Portal Alunos SESI SC · Joinville</span>
              </div>
              <span className="selo-emissao-data">
                Documento gerado em {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
