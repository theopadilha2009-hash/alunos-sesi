"use client";

import type { ReactNode } from "react";
import { urlGithub } from "@/lib/links";

export function IconeLinkedIn({ tamanho = 16, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
    </svg>
  );
}

export function IconeGitHub({ tamanho = 16, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function IconeInstagram({ tamanho = 15, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

type BadgeProps = {
  url?: string | null;
  username?: string | null;
  nomeAluno?: string;
  className?: string;
};

export function BadgeLinkedIn({ url, nomeAluno, className = "" }: BadgeProps) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`badge-rede badge-linkedin ${className}`}
      aria-label={nomeAluno ? `LinkedIn de ${nomeAluno}` : "Perfil no LinkedIn"}
      title="Acessar LinkedIn"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="badge-rede-icone-wrap in-icone">
        <IconeLinkedIn tamanho={15} />
      </span>
      <span className="badge-rede-texto">LinkedIn</span>
    </a>
  );
}

export function BadgeGitHub({ username, nomeAluno, className = "" }: BadgeProps) {
  const url = username ? (username.startsWith("http") ? username : urlGithub(username)) : null;
  if (!url) return null;

  const handleLimpo = username?.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "") ?? "GitHub";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`badge-rede badge-github ${className}`}
      aria-label={nomeAluno ? `GitHub de ${nomeAluno}` : "Perfil no GitHub"}
      title={`Acessar GitHub (${handleLimpo})`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="badge-rede-icone-wrap gh-icone">
        <IconeGitHub tamanho={15} />
      </span>
      <span className="badge-rede-texto">GitHub</span>
    </a>
  );
}

export function BadgeInstagram({ username, nomeAluno, className = "" }: BadgeProps) {
  if (!username) return null;
  const limpo = username.replace(/^@/, "").replace(/^https?:\/\/instagram\.com\//, "");
  const url = `https://instagram.com/${limpo}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`badge-rede badge-instagram ${className}`}
      aria-label={nomeAluno ? `Instagram de ${nomeAluno}` : "Perfil no Instagram"}
      title={`Instagram @${limpo}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="badge-rede-icone-wrap ig-icone">
        <IconeInstagram tamanho={14} />
      </span>
      <span className="badge-rede-texto">@{limpo}</span>
    </a>
  );
}

export function GrupoRedes({
  linkedin,
  github,
  instagram,
  nomeAluno,
  className = "",
}: {
  linkedin?: string | null;
  github?: string | null;
  instagram?: string | null;
  nomeAluno?: string;
  className?: string;
}) {
  if (!linkedin && !github && !instagram) {
    return <span className="tabela-sem-dado">—</span>;
  }

  return (
    <div className={`grupo-redes-destacadas ${className}`} onClick={(e) => e.stopPropagation()}>
      <BadgeLinkedIn url={linkedin} nomeAluno={nomeAluno} />
      <BadgeGitHub username={github} nomeAluno={nomeAluno} />
      <BadgeInstagram username={instagram} nomeAluno={nomeAluno} />
    </div>
  );
}
