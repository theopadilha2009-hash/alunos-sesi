"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/debug";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    logger.error("APP_ERROR", "Erro capturado pelo Error Boundary", error);
  }, [error]);

  return (
    <main
      className="wrap"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--raio)",
          padding: "2.5rem 2rem",
          maxWidth: "540px",
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--sombra)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Algo inesperado aconteceu
        </h2>
        <p style={{ color: "var(--dim)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
          Ocorreu uma falha temporária ao carregar esta página. Nossa equipe e os sistemas automáticos foram notificados.
        </p>

        {process.env.NODE_ENV === "development" && (
          <details
            style={{
              textAlign: "left",
              background: "var(--surface-2)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--raio-p)",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "var(--vermelho)",
              wordBreak: "break-all",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Detalhes do erro (dev)</summary>
            <p style={{ marginTop: "0.5rem" }}>{error.message}</p>
            {error.digest && <p style={{ color: "var(--faint)" }}>Digest: {error.digest}</p>}
          </details>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="botao botao-primario"
            onClick={() => reset()}
          >
            ↻ Tentar Novamente
          </button>
          <Link href="/" className="botao botao-fraco">
            ← Página Inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
