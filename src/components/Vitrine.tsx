"use client";

import { useMemo, useState } from "react";
import { CartaoAluno } from "@/components/CartaoAluno";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import { ordenarAlunos, rankingSalas } from "@/lib/ranking";
import type { Aluno, AlunoNaTela, RetratoSala, Sala } from "@/lib/tipos";

type Props = {
  alunos: Aluno[];
  salas: Sala[];
  retrato: RetratoSala[];
  meusVotos: string[];
};

export function Vitrine({ alunos, salas, retrato, meusVotos }: Props) {
  const [query, setQuery] = useState("");
  const [sala, setSala] = useState<string>(TODAS);
  const [lista, setLista] = useState(alunos);
  const [meus, setMeus] = useState<string[]>(meusVotos);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const naTela: AlunoNaTela[] = useMemo(() => {
    const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));
    return lista.map((a) => {
      const nome = a.sala_id ? (nomePorId.get(a.sala_id) ?? null) : null;
      return { ...a, sala: nome, cor: corDaSala(nome ?? "") };
    });
  }, [lista, salas]);

  const visiveis = useMemo(() => {
    const filtrados = filtrarAlunos(
      naTela.map((a) => ({ ...a, salaId: a.sala_id })),
      { sala, query, estrelados: meus },
    );
    return ordenarAlunos(filtrados);
  }, [naTela, sala, query, meus]);

  const contagemPorSala = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of naTela) {
      if (a.sala_id) mapa.set(a.sala_id, (mapa.get(a.sala_id) ?? 0) + 1);
    }
    return mapa;
  }, [naTela]);

  const salasRanqueadas = useMemo(() => rankingSalas(retrato), [retrato]);

  const total = naTela.length;
  const comLinkedin = naTela.filter((a) => a.linkedin).length;
  const comGithub = naTela.filter((a) => a.github).length;
  const percentual = (n: number) =>
    total === 0 ? 0 : Math.round((100 * n) / total);

  async function estrelar(id: string) {
    if (ocupado) return;
    const jaTem = meus.includes(id);
    setOcupado(id);
    setRecado(null);

    // Otimista: a estrela acende na hora e o número anda junto. Se o
    // servidor discordar, o catch desfaz exatamente este passo.
    setMeus((p) => (jaTem ? p.filter((x) => x !== id) : [...p, id]));
    setLista((p) =>
      p.map((a) =>
        a.id === id
          ? { ...a, estrelas: Math.max(0, a.estrelas + (jaTem ? -1 : 1)) }
          : a,
      ),
    );

    try {
      const resposta = await fetch("/api/estrela", {
        method: jaTem ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: id }),
      });
      const dados = (await resposta.json()) as {
        estrelas?: number;
        votado?: boolean;
        erro?: string;
      };
      if (!resposta.ok) throw new Error(dados.erro ?? "não deu para votar");

      setLista((p) =>
        p.map((a) =>
          a.id === id ? { ...a, estrelas: dados.estrelas ?? a.estrelas } : a,
        ),
      );
      setMeus((p) =>
        dados.votado
          ? p.includes(id)
            ? p
            : [...p, id]
          : p.filter((x) => x !== id),
      );
    } catch (erro) {
      setMeus((p) => (jaTem ? [...p, id] : p.filter((x) => x !== id)));
      setLista((p) =>
        p.map((a) =>
          a.id === id
            ? { ...a, estrelas: Math.max(0, a.estrelas + (jaTem ? 1 : -1)) }
            : a,
        ),
      );
      setRecado(
        erro instanceof Error ? erro.message : "não deu para votar agora",
      );
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <section className="retrato" aria-label="Retrato da turma">
        <div className="numero">
          <b>{total}</b>
          <span>alunos</span>
        </div>
        <div className="numero">
          <b>{salas.length}</b>
          <span>salas</span>
        </div>
        <div className="numero">
          <b>{percentual(comLinkedin)}%</b>
          <span>com LinkedIn</span>
        </div>
        <div className="numero">
          <b>{percentual(comGithub)}%</b>
          <span>com GitHub</span>
        </div>
      </section>

      <div className="controles">
        <label className="busca-campo" style={{ flex: "1 1 16rem" }}>
          <span className="sr-only">Buscar aluno</span>
          <input
            type="search"
            className="busca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, sala ou @ do GitHub…"
            style={{ width: "100%" }}
          />
        </label>
        <p className="conta" aria-live="polite">
          {visiveis.length} de {total}
        </p>
      </div>

      <div className="trilho" role="group" aria-label="Filtrar por sala">
        <button
          type="button"
          className="ficha"
          aria-pressed={sala === TODAS}
          onClick={() => setSala(TODAS)}
        >
          Todas <span className="n">{total}</span>
        </button>

        <button
          type="button"
          className="ficha"
          style={{ ["--sala" as string]: "var(--amarelo)" }}
          aria-pressed={sala === ESTRELADOS}
          onClick={() => setSala(ESTRELADOS)}
        >
          <span className="ponto" />
          Meus estrelados <span className="n">{meus.length}</span>
        </button>

        {salas.map((s) => (
          <button
            key={s.id}
            type="button"
            className="ficha"
            style={{ ["--sala" as string]: corDaSala(s.nome) }}
            aria-pressed={sala === s.id}
            onClick={() => setSala(s.id)}
          >
            <span className="ponto" />
            {s.nome} <span className="n">{contagemPorSala.get(s.id) ?? 0}</span>
          </button>
        ))}
      </div>

      {recado ? (
        <p className="recado recado-erro" role="status">
          {recado}
        </p>
      ) : null}

      {total === 0 ? (
        <div className="vazio">
          <b>A turma ainda está vazia.</b>
          Os alunos aparecem aqui assim que o ADM cadastrar a lista.
        </div>
      ) : visiveis.length === 0 ? (
        <div className="vazio">
          <b>Ninguém com esse filtro.</b>
          Tente outra sala ou limpe a busca.
        </div>
      ) : (
        <ul className="grade">
          {visiveis.map((a) => (
            <CartaoAluno
              key={a.id}
              aluno={a}
              estrelado={meus.includes(a.id)}
              ocupado={ocupado === a.id}
              onEstrelar={estrelar}
            />
          ))}
        </ul>
      )}

      {salasRanqueadas.some((s) => s.alunos > 0) ? (
        <section aria-labelledby="ranking-salas" style={{ marginBottom: "3rem" }}>
          <h2 id="ranking-salas" className="eyebrow" style={{ marginBottom: "0.9rem" }}>
            Ranking das salas
          </h2>
          <ul className="lista-adm">
            {salasRanqueadas
              .filter((s) => s.alunos > 0)
              .map((s, i) => (
                <li
                  key={s.id}
                  className="linha-adm"
                  style={{ ["--sala" as string]: corDaSala(s.nome) }}
                >
                  <span className="avatar" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="nome">{s.nome}</span>
                  <span className="meta">
                    {s.alunos} alunos · {s.completude}% dos links preenchidos
                  </span>
                  <span className="acoes">
                    <span className="estrela" aria-hidden="true">
                      ★ {s.estrelas}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
