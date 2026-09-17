import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FormAluno } from "@/components/adm/FormAluno";
import { ImportarLista } from "@/components/adm/ImportarLista";
import { PainelAlunos } from "@/components/adm/PainelAlunos";
import { Rodape, Topo } from "@/components/ds";
import { listarAlunos, listarSalas } from "@/lib/dados";
import { corDaSala } from "@/lib/cores";
import { ordenarAlunos } from "@/lib/ranking";
import { COOKIE_ADM, crachaValido } from "@/lib/sessao";
import type { AlunoNaTela } from "@/lib/tipos";

export const metadata: Metadata = {
  title: "Painel · Alunos SESI",
  robots: { index: false, follow: false },
};

export default async function AdmPage() {
  const jar = await cookies();
  if (!crachaValido(jar.get(COOKIE_ADM)?.value)) notFound();

  const [alunos, salas] = await Promise.all([listarAlunos(), listarSalas()]);
  const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));

  const naTela: AlunoNaTela[] = ordenarAlunos(
    alunos.map((a) => {
      const sala = a.sala_id ? (nomePorId.get(a.sala_id) ?? null) : null;
      return { ...a, sala, cor: corDaSala(sala ?? "") };
    }),
  );

  return (
    <>
      <Topo voltar={{ href: "/alunos", texto: "Ver a vitrine →" }} />

      <main className="wrap">
        <h1
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            letterSpacing: "-0.04em",
            paddingTop: "1.5rem",
          }}
        >
          Painel do ADM
        </h1>
        <p style={{ color: "var(--dim)", marginTop: "0.4rem" }}>
          {alunos.length} aluno{alunos.length === 1 ? "" : "s"} em {salas.length}{" "}
          sala{salas.length === 1 ? "" : "s"}.
        </p>

        <div className="painel">
          <ImportarLista />
          <FormAluno salas={salas.map((s) => s.nome)} />

          <section className="bloco">
            <header>
              <h2>Alunos</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--faint)" }}>
                fixar põe no topo · destaque dá a estrela do ADM
              </span>
            </header>
            <PainelAlunos alunos={naTela} />
          </section>
        </div>
      </main>

      <Rodape>
        Esta página não é linkada em lugar nenhum e não é indexada.
      </Rodape>
    </>
  );
}
