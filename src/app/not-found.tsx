import Link from "next/link";
import { Topo, Rodape } from "@/components/ds";

export default function NotFound() {
  return (
    <>
      <Topo voltar={{ href: "/", texto: "← Início" }} />
      <main
        className="wrap"
        style={{
          minHeight: "65vh",
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
            padding: "3rem 2rem",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "var(--sombra)",
          }}
        >
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent)", marginBottom: "0.5rem" }}>
            404
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Página ou Estudante não encontrado
          </h2>
          <p style={{ color: "var(--dim)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.75rem" }}>
            O perfil ou recurso que você tentou acessar não existe, foi removido ou o link está incorreto.
          </p>

          <Link href="/" className="botao botao-primario">
            Explorar Alunos & Portfólios
          </Link>
        </div>
      </main>
      <Rodape>Escola SESI · Formando desenvolvedores para o futuro.</Rodape>
    </>
  );
}
