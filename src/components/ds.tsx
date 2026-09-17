import Link from "next/link";
import type { ReactNode } from "react";
import { Roseta } from "@/components/Roseta";
import { TemaToggle } from "@/components/TemaToggle";

export function Topo({
  voltar,
}: {
  voltar?: { href: string; texto: string };
}) {
  return (
    <header>
      <div className="wrap topo">
        <Link href="/" className="marca">
          <Roseta tamanho={30} />
          <span>
            Alunos
            <small>Escola SESI</small>
          </span>
        </Link>
        <nav className="topo-nav">
          {voltar ? (
            <Link href={voltar.href} className="botao botao-fraco">
              {voltar.texto}
            </Link>
          ) : null}
          <TemaToggle />
        </nav>
      </div>
    </header>
  );
}

export function Rodape({ children }: { children: ReactNode }) {
  return (
    <footer className="rodape">
      <div className="wrap">
        <span>{children}</span>
        <span>Feito pela turma, para a turma.</span>
      </div>
    </footer>
  );
}

export function Vazio({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="vazio">
      <b>{titulo}</b>
      {children}
    </div>
  );
}
