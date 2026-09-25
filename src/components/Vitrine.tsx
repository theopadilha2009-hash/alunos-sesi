"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CartaoAluno } from "@/components/CartaoAluno";
import { CommandBar } from "@/components/CommandBar";
import { CrachaModal } from "@/components/CrachaModal";
import { TabelaAlunos } from "@/components/TabelaAlunos";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import { corHabilidade } from "@/lib/habilidades";
import { ordenarAlunos, rankingSalas } from "@/lib/ranking";
import { dispararConfetes, tocarSomEstrela } from "@/lib/som";
import type { Aluno, AlunoNaTela, RetratoSala, Sala } from "@/lib/tipos";

type Props = {
  alunos: Aluno[];
  salas: Sala[];
  retrato: RetratoSala[];
  meusVotos: string[];
};

type TipoVisualizacao = "grade" | "tabela";
type TipoOrdenacao = "estrelas" | "nome" | "conectados";

export function Vitrine({ alunos, salas, retrato, meusVotos }: Props) {
  const [query, setQuery] = useState("");
  const [sala, setSala] = useState<string>(TODAS);
  const [habilidadeFiltro, setHabilidadeFiltro] = useState<string>("Todas");
  const [visualizacao, setVisualizacao] = useState<TipoVisualizacao>("grade");
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>("estrelas");

  const [lista, setLista] = useState(alunos);
  const [meus, setMeus] = useState<string[]>(meusVotos);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  // Modais de Crachá 3D e Command Palette
  const [alunoCracha, setAlunoCracha] = useState<AlunoNaTela | null>(null);
  const [cmdAberto, setCmdAberto] = useState(false);

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdAberto((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const naTela: AlunoNaTela[] = useMemo(() => {
    const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));
    return lista.map((a) => {
      const nome = a.sala_id ? (nomePorId.get(a.sala_id) ?? null) : null;
      return {
        ...a,
        sala: nome,
        cor: corDaSala(nome ?? ""),
        habilidades: a.habilidades ?? [],
      };
    });
  }, [lista, salas]);

  // Lista com filtros aplicados
  const visiveis = useMemo(() => {
    const filtrados = filtrarAlunos(
      naTela.map((a) => ({ ...a, salaId: a.sala_id })),
      { sala, query, estrelados: meus, habilidade: habilidadeFiltro },
    );

    if (ordenacao === "nome") {
      return [...filtrados].sort((a, b) => a.nome.localeCompare(b.nome));
    }
    if (ordenacao === "conectados") {
      return [...filtrados].sort((a, b) => {
        const conexoesA = (a.linkedin ? 1 : 0) + (a.github ? 1 : 0);
        const conexoesB = (b.linkedin ? 1 : 0) + (b.github ? 1 : 0);
        if (conexoesB !== conexoesA) return conexoesB - conexoesA;
        return b.estrelas - a.estrelas;
      });
    }

    return ordenarAlunos(filtrados);
  }, [naTela, sala, query, meus, habilidadeFiltro, ordenacao]);

  // Contagem por sala
  const contagemPorSala = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of naTela) {
      if (a.sala_id) mapa.set(a.sala_id, (mapa.get(a.sala_id) ?? 0) + 1);
    }
    return mapa;
  }, [naTela]);

  // Habilidades mais frequentes na turma
  const habilidadesDisponiveis = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const a of naTela) {
      if (a.habilidades) {
        for (const h of a.habilidades) {
          contagem.set(h, (contagem.get(h) ?? 0) + 1);
        }
      }
    }
    return Array.from(contagem.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, count]) => ({ nome, count }));
  }, [naTela]);

  // Top 3 Hall da Fama (Alunos mais estrelados)
  const hallDaFama = useMemo(() => {
    const comEstrelas = naTela.filter((a) => a.estrelas > 0);
    return [...comEstrelas].sort((a, b) => b.estrelas - a.estrelas).slice(0, 3);
  }, [naTela]);

  const salasRanqueadas = useMemo(() => rankingSalas(retrato), [retrato]);

  const total = naTela.length;
  const comLinkedin = naTela.filter((a) => a.linkedin).length;
  const comGithub = naTela.filter((a) => a.github).length;
  const totalEstrelas = naTela.reduce((acc, a) => acc + (a.estrelas || 0), 0);

  const percentual = (n: number) =>
    total === 0 ? 0 : Math.round((100 * n) / total);

  async function estrelar(id: string, ev?: React.MouseEvent) {
    if (ocupado) return;
    const jaTem = meus.includes(id);
    setOcupado(id);
    setRecado(null);

    // Efeito áudio e confete festivo quando dá estrela
    if (!jaTem) {
      tocarSomEstrela();
      if (ev) {
        dispararConfetes(ev.clientX, ev.clientY);
      } else {
        dispararConfetes();
      }
    }

    // Otimista
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
      {/* Retrato / Métricas da Turma com Progresso Visual */}
      <section className="retrato" aria-label="Retrato da turma">
        <div className="numero card-metrica">
          <b>{total}</b>
          <span>alunos na rede</span>
          <div className="metrica-barra" style={{ width: "100%", background: "var(--accent)" }} />
        </div>
        <div className="numero card-metrica">
          <b>{salas.length}</b>
          <span>salas ativas</span>
          <div className="metrica-barra" style={{ width: "100%", background: "var(--verde)" }} />
        </div>
        <div className="numero card-metrica">
          <b>{percentual(comLinkedin)}%</b>
          <span>com LinkedIn</span>
          <div
            className="metrica-barra"
            style={{ width: `${percentual(comLinkedin)}%`, background: "var(--azul-claro)" }}
          />
        </div>
        <div className="numero card-metrica">
          <b>{percentual(comGithub)}%</b>
          <span>com GitHub</span>
          <div
            className="metrica-barra"
            style={{ width: `${percentual(comGithub)}%`, background: "var(--amarelo)" }}
          />
        </div>
        <div className="numero card-metrica">
          <b style={{ color: "var(--amarelo)" }}>★ {totalEstrelas}</b>
          <span>estrelas trocadas</span>
          <div className="metrica-barra" style={{ width: "100%", background: "var(--amarelo)" }} />
        </div>
      </section>

      {/* Hall da Fama / Destaques da Turma (se houver alunos estrelados) */}
      {hallDaFama.length > 0 && query === "" && sala === TODAS ? (
        <section className="hall-da-fama" aria-label="Hall da Fama">
          <div className="hall-cabecalho">
            <span className="eyebrow">Destaques da Turma</span>
            <h2>🏆 Hall da Fama</h2>
            <p className="hall-sub">
              Os alunos que mais receberam estrelas e reconhecimento dos colegas.
            </p>
          </div>

          <div className="hall-podio">
            {hallDaFama.map((aluno, idx) => {
              const medalha = idx === 0 ? "🥇 1º Lugar" : idx === 1 ? "🥈 2º Lugar" : "🥉 3º Lugar";
              const classeMedalha = idx === 0 ? "podio-ouro" : idx === 1 ? "podio-prata" : "podio-bronze";

              return (
                <div
                  key={aluno.id}
                  className={`hall-card ${classeMedalha}`}
                  style={{ ["--sala-cor" as string]: aluno.cor }}
                >
                  <span className="hall-medalha">{medalha}</span>
                  <div className="hall-avatar-wrap">
                    <Avatar
                      nome={aluno.nome}
                      foto={aluno.foto_url}
                      className="hall-avatar"
                    />
                  </div>
                  <h3 className="hall-nome">{aluno.nome}</h3>
                  {aluno.sala ? (
                    <span className="hall-sala" style={{ color: aluno.cor }}>
                      {aluno.sala}
                    </span>
                  ) : null}
                  <div className="hall-pes">
                    <span className="hall-estrelas">★ {aluno.estrelas} estrelas</span>
                    <button
                      type="button"
                      className="mini botao-cracha-acao"
                      onClick={() => setAlunoCracha(aluno)}
                    >
                      📇 Crachá 3D
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Barra de Controles: Busca, Spotlight Trigger, Ordenação e Visualização */}
      <div className="controles">
        <label className="busca-campo" style={{ flex: "1 1 18rem" }}>
          <span className="sr-only">Buscar aluno</span>
          <input
            type="search"
            className="busca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome, sala, @github ou habilidade..."
            style={{ width: "100%" }}
          />
        </label>

        {/* Botão de Atalho para o Command Bar (Cmd+K) */}
        <button
          type="button"
          className="botao-cmd-trigger"
          onClick={() => setCmdAberto(true)}
          title="Abrir Command Palette (⌘K)"
          aria-label="Abrir busca por comando"
        >
          <span className="cmd-lupa">🔍</span>
          <span className="cmd-label">Comandos</span>
          <kbd className="cmd-kbd">⌘K</kbd>
        </button>

        {/* Seletor de Ordenação */}
        <div className="seletor-ordenacao">
          <label htmlFor="select-ordem" className="sr-only">
            Ordenar alunos
          </label>
          <select
            id="select-ordem"
            className="select-custom"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as TipoOrdenacao)}
          >
            <option value="estrelas">★ Mais Estrelados</option>
            <option value="nome">🔤 Ordem Alfabética (A-Z)</option>
            <option value="conectados">🌐 Mais Conectados</option>
          </select>
        </div>

        {/* Alternador de Modo de Visualização: Grade vs Tabela */}
        <div className="modo-visualizacao" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            className={`btn-modo ${visualizacao === "grade" ? "btn-modo-ativo" : ""}`}
            onClick={() => setVisualizacao("grade")}
            title="Visualização em Cards 3D"
            aria-pressed={visualizacao === "grade"}
          >
            🎴 Cards
          </button>
          <button
            type="button"
            className={`btn-modo ${visualizacao === "tabela" ? "btn-modo-ativo" : ""}`}
            onClick={() => setVisualizacao("tabela")}
            title="Visualização em Tabela Tática"
            aria-pressed={visualizacao === "tabela"}
          >
            📊 Tabela
          </button>
        </div>

        <p className="conta" aria-live="polite">
          {visiveis.length} de {total}
        </p>
      </div>

      {/* Trilho de Filtro por Salas */}
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

      {/* Trilho de Habilidades & Tecnologias */}
      {habilidadesDisponiveis.length > 0 ? (
        <div className="trilho-habilidades" role="group" aria-label="Filtrar por habilidade">
          <span className="trilho-label">Competências:</span>
          <button
            type="button"
            className={`tag-filtro ${habilidadeFiltro === "Todas" ? "tag-filtro-ativo" : ""}`}
            onClick={() => setHabilidadeFiltro("Todas")}
          >
            Todas
          </button>
          {habilidadesDisponiveis.map((hab) => (
            <button
              key={hab.nome}
              type="button"
              className={`tag-filtro ${habilidadeFiltro === hab.nome ? "tag-filtro-ativo" : ""}`}
              style={{ ["--cor-filtro" as string]: corHabilidade(hab.nome) }}
              onClick={() =>
                setHabilidadeFiltro((atual) => (atual === hab.nome ? "Todas" : hab.nome))
              }
            >
              {hab.nome} <span className="n">{hab.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {recado ? (
        <p className="recado recado-erro" role="status">
          {recado}
        </p>
      ) : null}

      {/* Conteúdo: Grade de Cards ou Tabela Tática */}
      {total === 0 ? (
        <div className="vazio">
          <b>A turma ainda está vazia.</b>
          Os alunos aparecem aqui assim que o ADM cadastrar a lista.
        </div>
      ) : visiveis.length === 0 ? (
        <div className="vazio">
          <b>Nenhum aluno encontrado com esses filtros.</b>
          Tente outra sala, outra habilidade ou limpe a busca.
        </div>
      ) : visualizacao === "grade" ? (
        <ul className="grade">
          {visiveis.map((a) => (
            <CartaoAluno
              key={a.id}
              aluno={a}
              estrelado={meus.includes(a.id)}
              ocupado={ocupado === a.id}
              onEstrelar={estrelar}
              onAbrirCracha={setAlunoCracha}
            />
          ))}
        </ul>
      ) : (
        <TabelaAlunos
          alunos={visiveis}
          meusVotos={meus}
          ocupado={ocupado}
          onEstrelar={estrelar}
          onAbrirCracha={setAlunoCracha}
        />
      )}

      {/* Ranking das Salas */}
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

      {/* Modal do Crachá Holográfico 3D */}
      {alunoCracha ? (
        <CrachaModal
          aluno={alunoCracha}
          onClose={() => setAlunoCracha(null)}
        />
      ) : null}

      {/* Modal do Command Palette (Spotlight ⌘K) */}
      <CommandBar
        aberto={cmdAberto}
        onFechar={() => setCmdAberto(false)}
        alunos={naTela}
        salas={salas}
        onSelecionarSala={(salaId) => {
          setSala(salaId);
        }}
        onAbrirCracha={(aluno) => {
          setAlunoCracha(aluno);
        }}
      />
    </>
  );
}
