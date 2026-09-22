"use client";

import { useEffect } from "react";
import { logger } from "@/lib/debug";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("GLOBAL_ERROR", "Erro fatal no nível do layout raiz", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#0a0f14",
          color: "#f2f5f7",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "#101a22",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "14px",
            padding: "2.5rem",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>Falha Crítica no Sistema</h2>
          <p style={{ color: "rgba(242,245,247,0.7)", marginBottom: "2rem", lineHeight: 1.5 }}>
            Ocorreu uma falha inesperada na interface. Por favor, tente recarregar o aplicativo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#3fc2bc",
              color: "#04211f",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Recarregar Aplicativo
          </button>
        </div>
      </body>
    </html>
  );
}
