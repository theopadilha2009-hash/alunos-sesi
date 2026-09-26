import Link from "next/link";
import { alternar, aprovarAluno, removerAluno } from "@/app/adm/acoes";
import { corDaSala } from "@/lib/cores";
import type { AlunoNaTela } from "@/lib/tipos";

/**
 * A lista de alunos com as ações do ADM.
 *
 * Componente de servidor: cada botão é um `<form>` apontando para uma Server
 * Action, então não precisa de estado no cliente nem de JS para funcionar.
 */
export function PainelAlunos({ alunos }: { alunos: AlunoNaTela[] }) {
  if (alunos.length === 0) {
    return (
      <div className="corpo">
        <p style={{ margin: 0, color: "var(--dim)" }}>
          Nenhum aluno ainda. Cole a lista da turma acima.
        </p>
      </div>
    );
  }

  return (
    <div className="corpo">
      <ul className="lista-adm">
        {alunos.map((a) => (
          <li
            key={a.id}
            className="linha-adm"
            data-fixado={a.fixado ? "" : undefined}
            style={{ ["--sala" as string]: corDaSala(a.sala ?? "") }}
          >
            <span className="nome">
              <Link href={`/alunos/${a.slug}`}>{a.nome}</Link>
            </span>
            <span className="meta">
              {a.sala ?? "sem sala"} · ★ {a.estrelas}
              {a.linkedin ? " · in" : ""}
              {a.github ? " · gh" : ""}
              {a.aprovado ? "" : " · aguardando aprovação"}
            </span>

            <span className="acoes">
              <form action={aprovarAluno}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className={`mini${a.aprovado ? "" : " botao-aprovar"}`}
                  aria-pressed={a.aprovado}
                  title={
                    a.aprovado
                      ? "Tira o perfil da vitrine até aprovar de novo"
                      : "Libera o perfil na vitrine"
                  }
                >
                  {a.aprovado ? "Aprovado" : "Aprovar"}
                </button>
              </form>

              <form action={alternar}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="campo" value="fixado" />
                <button
                  type="submit"
                  className="mini"
                  aria-pressed={a.fixado}
                  title="Põe no topo da vitrine"
                >
                  {a.fixado ? "Fixado" : "Fixar"}
                </button>
              </form>

              <form action={alternar}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="campo" value="destaque" />
                <button
                  type="submit"
                  className="mini"
                  aria-pressed={a.destaque}
                  title="Marca como destaque"
                >
                  {a.destaque ? "★ Destaque" : "☆ Destacar"}
                </button>
              </form>

              <form action={removerAluno}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="mini botao-perigo"
                  title="Remove o aluno"
                >
                  Remover
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
