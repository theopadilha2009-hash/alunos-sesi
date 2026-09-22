"use client";

import { useMemo, useState } from "react";
import { logoutAction } from "@/app/acoes-crm";
import { CartaoAluno } from "@/components/CartaoAluno";
import { CommandBar } from "@/components/CommandBar";
import { CrachaModal } from "@/components/CrachaModal";
import { ModalEditarPerfil } from "@/components/crm/ModalEditarPerfil";
import { ModalPerfilBreve } from "@/components/crm/ModalPerfilBreve";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { Roseta } from "@/components/Roseta";
import { TabelaAlunos } from "@/components/TabelaAlunos";
import { TemaToggle } from "@/components/TemaToggle";
import { TopProjetosTurma } from "@/components/TopProjetosTurma";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import { corHabilidade, extrairHabilidades } from "@/lib/habilidades";
import { iniciais } from "@/lib/links";
import { ordenarAlunos, rankingSalas } from "@/lib/ranking";
import { dispararConfetes, tocarSomEstrela } from "@/lib/som";
import type { Aluno, AlunoNaTela, RetratoSala, Sala, UsuarioSessao } from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunosIniciais: Aluno[];
  salas: Sala[];
  retrato: RetratoSala[];
  meusVotos: string[];
};

type AbaAtiva = "portfolio" | "projetos" | "tabelas" | "adm";

export function CrmApp({
  usuario,
  alunosIniciais,
  salas,
  retrato,
  meusVotos,
}: Props) {
  const [aba, setAba] = useState<AbaAtiva>("portfolio");
  const [query, setQuery] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState<string>(TODAS);
  const [habilidadeFiltro, setHabilidadeFiltro] = useState<string>("Todas");

  const [lista, setLista] = useState<Aluno[]>(alunosIniciais);
  const [meus, setMeus] = useState<string[]>(meusVotos);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Modais
  const [modalEditarPerfilAberto, setModalEditarPerfilAberto] = useState(false);
  const [alunoBreveSelecionado, setAlunoBreveSelecionado] = useState<AlunoNaTela | null>(null);
  const [alunoCracha, setAlunoCracha] = useState<AlunoNaTela | null>(null);
  const [cmdAberto, setCmdAberto] = useState(false);

  // Mapeia alunos para a visualização na tela
  const naTela: AlunoNaTela[] = useMemo(() => {
    const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));
    return lista.map((a) => {
      const nomeSala = a.sala_id ? (nomePorId.get(a.sala_id) ?? null) : null;
      return {
        ...a,
        sala: nomeSala,
        cor: corDaSala(nomeSala ?? ""),
        habilidades: extrairHabilidades(a.bio),
      };
    });
  }, [lista, salas]);

  // Aluno correspondente ao usuário logado
  const meuAlunoNaTela = useMemo(() => {
    if (usuario.alunoId) {
      return naTela.find((a) => a.id === usuario.alunoId) ?? null;
    }
    return naTela.find((a) => a.slug === "telor-de-espadilha") ?? null;
  }, [naTela, usuario.alunoId]);

  // Filtro de alunos visíveis no Portfólio
  const visiveis = useMemo(() => {
    const filtrados = filtrarAlunos(
      naTela.map((a) => ({ ...a, salaId: a.sala_id })),
      { sala: salaSelecionada, query, estrelados: meus, habilidade: habilidadeFiltro },
    );
    return ordenarAlunos(filtrados);
  }, [naTela, salaSelecionada, query, meus, habilidadeFiltro]);

  // Top 10 competências técnicas mais frequentes para o filtro interativo
  const todasHabilidadesUnicas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const a of naTela) {
      for (const h of a.habilidades ?? []) {
        contagem.set(h, (contagem.get(h) ?? 0) + 1);
      }
    }
    const ordenadas = Array.from(contagem.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => h)
      .slice(0, 10);
    return ["Todas", ...ordenadas];
  }, [naTela]);

  const [modoVisualizacao, setModoVisualizacao] = useState<"tabela" | "cards">("tabela");

  // Agrupamento por sala para o Portfólio (organizado por sala na mesma ordem oficial)
  const gruposSalas = useMemo(() => {
    if (salaSelecionada === ESTRELADOS) {
      return [
        {
          id: ESTRELADOS,
          nome: "Meus Alunos Estrelados",
          cor: "var(--amarelo)",
          alunos: visiveis,
        },
      ];
    }

    if (salaSelecionada !== TODAS) {
      const salaObj = salas.find((s) => s.id === salaSelecionada);
      const nome = salaObj?.nome ?? "Sala Selecionada";
      return [
        {
          id: salaSelecionada,
          nome,
          cor: corDaSala(nome),
          alunos: visiveis,
        },
      ];
    }

    // Quando "Todas as Salas": agrupa na ordem de salas
    const map = new Map<string, AlunoNaTela[]>();
    for (const a of visiveis) {
      const sId = a.sala_id ?? "sem-sala";
      if (!map.has(sId)) map.set(sId, []);
      map.get(sId)!.push(a);
    }

    const resultado: Array<{ id: string; nome: string; cor: string; alunos: AlunoNaTela[] }> = [];

    for (const s of salas) {
      const alunosDaSala = map.get(s.id);
      if (alunosDaSala && alunosDaSala.length > 0) {
        resultado.push({
          id: s.id,
          nome: s.nome,
          cor: corDaSala(s.nome),
          alunos: alunosDaSala,
        });
      }
    }

    const semSala = map.get("sem-sala");
    if (semSala && semSala.length > 0) {
      resultado.push({
        id: "sem-sala",
        nome: "Outros Estudantes",
        cor: "var(--dim)",
        alunos: semSala,
      });
    }

    return resultado;
  }, [visiveis, salas, salaSelecionada]);

  // Todas as criações/projetos reunidos de todos os estudantes
  const todasCriacoes = useMemo(() => {
    const listaProjetos: Array<{
      alunoNome: string;
      alunoSala: string | null;
      alunoAvatar: string;
      alunoObjeto: AlunoNaTela;
      titulo: string;
      descricao: string;
      link?: string;
      imagem?: string;
    }> = [];

    for (const a of naTela) {
      if (a.projetos && Array.isArray(a.projetos)) {
        for (const p of a.projetos) {
          listaProjetos.push({
            alunoNome: a.nome,
            alunoSala: a.sala,
            alunoAvatar: iniciais(a.nome),
            alunoObjeto: a,
            titulo: p.titulo,
            descricao: p.descricao,
            link: p.link,
            imagem: p.imagem,
          });
        }
      }
    }
    return listaProjetos;
  }, [naTela]);

  async function estrelar(id: string, ev?: React.MouseEvent) {
    if (ocupado) return;
    const jaTem = meus.includes(id);
    setOcupado(id);

    if (!jaTem) {
      tocarSomEstrela();
      if (ev) dispararConfetes(ev.clientX, ev.clientY);
      else dispararConfetes();
    }

    setMeus((p) => (jaTem ? p.filter((x) => x !== id) : [...p, id]));
    setLista((p) =>
      p.map((a) =>
        a.id === id
          ? { ...a, estrelas: Math.max(0, a.estrelas + (jaTem ? -1 : 1)) }
          : a,
      ),
    );

    try {
      const resp = await fetch("/api/estrela", {
        method: jaTem ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: id }),
      });
      const dados = (await resp.json()) as { estrelas?: number; votado?: boolean };
      if (resp.ok && typeof dados.estrelas === "number") {
        setLista((p) =>
          p.map((a) => (a.id === id ? { ...a, estrelas: dados.estrelas ?? a.estrelas } : a)),
        );
      }
    } catch {} finally {
      setOcupado(null);
    }
  }

  const nomeExibicao = meuAlunoNaTela?.nome ?? usuario.nome ?? "Telor de Espadilha";
  const salaExibicao = meuAlunoNaTela?.sala ?? usuario.sala ?? "DSM3";
  const ehSuperAdm = usuario.role === "super_adm" || usuario.username === "theo1234";

  return (
    <div className="crm-layout">
      {/* ── BARRA LATERAL (SIDEBAR À ESQUERDA) ───────────────────────────── */}
      <aside className="crm-sidebar">
        {/* Topo da Sidebar: Marca & Workspace */}
        <div className="sidebar-topo">
          <div className="sidebar-marca">
            <Roseta tamanho={28} />
            <div>
              <span className="sidebar-titulo">ALUNOS SESI</span>
              <span className="sidebar-sub">WORKSPACE CRM</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-busca-btn"
            onClick={() => setCmdAberto(true)}
            title="Buscar com Command Palette (⌘K)"
          >
            <span>🔍 Buscar...</span>
            <kbd className="sidebar-kbd">⌘K</kbd>
          </button>
        </div>

        {/* Abas Principais de Navegação */}
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${aba === "portfolio" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("portfolio")}
          >
            <span className="nav-icone">📁</span>
            <span className="nav-label">Portfólio</span>
            <span className="nav-badge">{naTela.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "projetos" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("projetos")}
          >
            <span className="nav-icone">🚀</span>
            <span className="nav-label">Projetos & Criações</span>
            <span className="nav-badge">{todasCriacoes.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "tabelas" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("tabelas")}
          >
            <span className="nav-icone">📊</span>
            <span className="nav-label">Tabelas & Alunos</span>
          </button>

          {ehSuperAdm ? (
            <button
              type="button"
              className={`nav-item ${aba === "adm" ? "nav-item-ativo" : ""}`}
              onClick={() => setAba("adm")}
            >
              <span className="nav-icone">🔒</span>
              <span className="nav-label">Painel ADM</span>
              <span className="nav-badge-adm">Super</span>
            </button>
          ) : null}
        </nav>

        {/* Canto Inferior Esquerdo: Perfil do Usuário Logado */}
        <div className="sidebar-rodape">
          <div
            className="card-usuario-logado"
            onClick={() => setModalEditarPerfilAberto(true)}
            role="button"
            tabIndex={0}
            title="Clique para editar e personalizar seu perfil"
          >
            <div className="user-avatar-wrap">
              <span className="avatar user-avatar">{iniciais(nomeExibicao)}</span>
              <span className="user-online-dot" />
            </div>

            <div className="user-info">
              <span className="user-nome">{nomeExibicao}</span>
              <span className="user-sala">
                <span className="ponto" style={{ background: "var(--ciano)" }} />
                {salaExibicao} {ehSuperAdm ? "· Super ADM" : ""}
              </span>
            </div>

            <span className="user-editar-btn" aria-hidden="true" title="Editar Perfil">
              ✏️
            </span>
          </div>

          {meuAlunoNaTela ? (
            <button
              type="button"
              className="btn-cracha-sidebar-rapido"
              onClick={() => setAlunoCracha(meuAlunoNaTela)}
              title="Visualizar e baixar meu crachá digital"
            >
              📇 Meu Crachá Digital (PNG)
            </button>
          ) : null}

          <form action={logoutAction} className="form-logout">
            <button
              type="submit"
              className="btn-logout"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              Sair ⎋
            </button>
          </form>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (ÁREA CENTRAL) ────────────────────────────── */}
      <main className="crm-main">
        {/* Topo do Header Central */}
        <header className="crm-header">
          <div>
            <span className="eyebrow">
              {aba === "portfolio"
                ? "Vitrine Profissional"
                : aba === "projetos"
                  ? "Criações da Escola"
                  : aba === "tabelas"
                    ? "Gestão Tabular"
                    : "Administração"}
            </span>
            <h1 className="crm-header-titulo">
              {aba === "portfolio"
                ? "Portfólio da Turma"
                : aba === "projetos"
                  ? "Criações & Projetos SESI"
                  : aba === "tabelas"
                    ? "Tabela de Alunos & Salas"
                    : "Painel do Administrador"}
            </h1>
          </div>

          <div className="crm-header-acoes">
            <TemaToggle />
            <button
              type="button"
              className="botao botao-primario"
              onClick={() => setModalEditarPerfilAberto(true)}
            >
              ✏️ Editar Meu Perfil
            </button>
          </div>
        </header>

        {/* ── ABA 1: PORTFÓLIO (Aba Principal) ──────────────────────────── */}
        {aba === "portfolio" ? (
          <div className="crm-secao-conteudo">
            {/* Controles de Busca e Filtro de Salas */}
            <div className="controles">
              <label className="busca-campo" style={{ flex: "1 1 18rem" }}>
                <span className="sr-only">Buscar estudante ou criação</span>
                <input
                  type="search"
                  className="busca"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar estudante, sala, @github, competência..."
                />
              </label>

              <p className="conta" aria-live="polite">
                {visiveis.length} de {naTela.length} estudantes
              </p>
            </div>

            {/* Trilho de Salas */}
            <div className="trilho" role="group" aria-label="Filtrar por sala">
              <button
                type="button"
                className="ficha"
                aria-pressed={salaSelecionada === TODAS}
                onClick={() => setSalaSelecionada(TODAS)}
              >
                Todas as Salas <span className="n">{naTela.length}</span>
              </button>

              <button
                type="button"
                className="ficha"
                style={{ ["--sala" as string]: "var(--amarelo)" }}
                aria-pressed={salaSelecionada === ESTRELADOS}
                onClick={() => setSalaSelecionada(ESTRELADOS)}
              >
                <span className="ponto" />
                Meus Estrelados <span className="n">{meus.length}</span>
              </button>

              {salas.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ficha"
                  style={{ ["--sala" as string]: corDaSala(s.nome) }}
                  aria-pressed={salaSelecionada === s.id}
                  onClick={() => setSalaSelecionada(s.id)}
                >
                  <span className="ponto" />
                  {s.nome}
                </button>
              ))}
            </div>

            {/* Barra de Filtro Rápido por Competência Técnica */}
            <div className="trilho-habilidades" role="group" aria-label="Filtrar por competência técnica">
              <span className="label-habilidades">Competência:</span>
              <div className="chips-habilidades-wrap">
                {todasHabilidadesUnicas.map((hab) => (
                  <button
                    key={hab}
                    type="button"
                    className={`chip-hab ${habilidadeFiltro === hab ? "chip-hab-ativo" : ""}`}
                    onClick={() => setHabilidadeFiltro(habilidadeFiltro === hab ? "Todas" : hab)}
                  >
                    {hab !== "Todas" ? (
                      <span className="ponto-hab" style={{ background: corHabilidade(hab) }} />
                    ) : null}
                    {hab}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 3 Projetos da Turma no Topo do Portfólio */}
            <TopProjetosTurma
              alunos={naTela}
              onAbrirPerfil={setAlunoBreveSelecionado}
              onAbrirCracha={setAlunoCracha}
            />

            {/* ── ORGANIZADO POR SALA COM OS ALUNOS CORRESPONDENTES ─── */}
            <div className="portfolio-salas-container">
              <div className="portfolio-barra-visualizacao">
                <div className="portfolio-barra-titulos">
                  <h3 className="portfolio-secao-titulo">
                    🏛️ Salas & Estudantes SESI
                  </h3>
                  <span className="portfolio-secao-sub">
                    Estudantes agrupados por sala com LinkedIn e GitHub em destaque
                  </span>
                </div>

                <div className="modo-visualizacao">
                  <button
                    type="button"
                    className="btn-modo btn-imprimir-catalogo"
                    onClick={() => window.print()}
                    title="Imprimir ou salvar PDF da turma formatado para apresentação institucional"
                  >
                    🖨️ Imprimir Catálogo (PDF)
                  </button>
                  <button
                    type="button"
                    className={`btn-modo ${modoVisualizacao === "tabela" ? "btn-modo-ativo" : ""}`}
                    onClick={() => setModoVisualizacao("tabela")}
                    title="Formato Tabela com Redes Destacadas (Recomendado)"
                  >
                    📊 Tabela por Sala
                  </button>
                  <button
                    type="button"
                    className={`btn-modo ${modoVisualizacao === "cards" ? "btn-modo-ativo" : ""}`}
                    onClick={() => setModoVisualizacao("cards")}
                    title="Formato Cards"
                  >
                    🗂️ Cards
                  </button>
                </div>
              </div>

              {gruposSalas.length === 0 ? (
                <div className="vazio">
                  <b>Nenhum estudante encontrado</b>
                  <p>Tente ajustar a busca ou escolher outra sala no seletor acima.</p>
                </div>
              ) : (
                gruposSalas.map((grupo) => (
                  <section
                    key={grupo.id}
                    className="secao-sala-bloco"
                    style={{ ["--sala-cor" as string]: grupo.cor }}
                  >
                    {/* Cabeçalho da Sala com Badge e Contagem */}
                    <header className="secao-sala-cabecalho">
                      <div className="secao-sala-titulo-wrap">
                        <span className="ponto-grande" style={{ background: grupo.cor }} />
                        <h4 className="secao-sala-nome">{grupo.nome}</h4>
                        <span className="secao-sala-badge" style={{ borderColor: grupo.cor }}>
                          {grupo.alunos.length} {grupo.alunos.length === 1 ? "aluno" : "alunos"}
                        </span>
                      </div>
                      <span className="secao-sala-hint">
                        {grupo.alunos.filter((a) => a.linkedin || a.github).length} com redes ativas
                      </span>
                    </header>

                    {modoVisualizacao === "tabela" ? (
                      /* Formato da Imagem 4 dentro de cada sala com redes em destaque */
                      <TabelaAlunos
                        alunos={grupo.alunos}
                        meusVotos={meus}
                        ocupado={ocupado}
                        onEstrelar={estrelar}
                        onAbrirCracha={setAlunoCracha}
                        onSelecionarAluno={setAlunoBreveSelecionado}
                        ocultarColunaSala={true}
                      />
                    ) : (
                      /* Formato alternativo em Cards com redes oficiais */
                      <div className="grade-portfolio">
                        {grupo.alunos.map((aluno) => {
                          const estrelado = meus.includes(aluno.id);
                          return (
                            <article
                              key={aluno.id}
                              className="card-portfolio-estudante"
                              style={{ ["--sala-cor" as string]: aluno.cor }}
                              onClick={() => setAlunoBreveSelecionado(aluno)}
                            >
                              <header className="card-port-topo">
                                <span className="avatar card-port-avatar">
                                  {iniciais(aluno.nome)}
                                </span>
                                <div className="card-port-titulos">
                                  <h3>{aluno.nome}</h3>
                                  <span className="card-port-sala" style={{ color: aluno.cor }}>
                                    {grupo.nome}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className="estrela mini-estrela"
                                  aria-pressed={estrelado}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    estrelar(aluno.id, e);
                                  }}
                                >
                                  {estrelado ? "★" : "☆"} {aluno.estrelas}
                                </button>
                              </header>

                              {aluno.bio ? (
                                <p className="card-port-bio">{aluno.bio}</p>
                              ) : null}

                              {/* Redes Principais (LinkedIn & GitHub em alto destaque!) */}
                              <div className="card-port-redes" onClick={(e) => e.stopPropagation()}>
                                <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
                                <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
                                <button
                                  type="button"
                                  className="mini"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAlunoCracha(aluno);
                                  }}
                                >
                                  📇 Crachá 3D
                                </button>
                              </div>

                              <footer className="card-port-rodape">
                                <span className="ver-perfil-texto">Ver perfil completo & criações →</span>
                              </footer>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* ── ABA 2: PROJETOS & CRIAÇÕES DA ESCOLA ─────────────────────── */}
        {aba === "projetos" ? (
          <div className="crm-secao-conteudo">
            <div className="projetos-intro-banner">
              <h2>Mural de Projetos & Inovações dos Estudantes</h2>
              <p>
                Robótica, desenvolvimento de software, automação IoT e design criados pelos alunos
                do SESI.
              </p>
            </div>

            <div className="grade-projetos-mural">
              {todasCriacoes.map((p, idx) => (
                <div
                  key={idx}
                  className="card-criacao-mural"
                  onClick={() => setAlunoBreveSelecionado(p.alunoObjeto)}
                >
                  {p.imagem ? (
                    <img src={p.imagem} alt={p.titulo} className="criacao-mural-capa" />
                  ) : (
                    <div className="criacao-mural-capa-placeholder">
                      <span>🚀 Projeto SESI</span>
                    </div>
                  )}

                  <div className="criacao-mural-corpo">
                    <div className="criacao-autor">
                      <span className="avatar mini-avatar">{p.alunoAvatar}</span>
                      <div>
                        <b>{p.alunoNome}</b>
                        <small>{p.alunoSala ?? "SESI"}</small>
                      </div>
                    </div>

                    <h3>{p.titulo}</h3>
                    <p>{p.descricao}</p>

                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-criacao"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Acessar Projeto Externo ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── ABA 3: TABELAS & ALUNOS ──────────────────────────────────── */}
        {aba === "tabelas" ? (
          <div className="crm-secao-conteudo">
            <TabelaAlunos
              alunos={visiveis}
              meusVotos={meus}
              ocupado={ocupado}
              onEstrelar={estrelar}
              onAbrirCracha={setAlunoCracha}
            />
          </div>
        ) : null}

        {/* ── ABA 4: PAINEL ADMINISTRATIVO ─────────────────────────────── */}
        {aba === "adm" && ehSuperAdm ? (
          <div className="crm-secao-conteudo">
            <div className="bloco">
              <header>
                <h2>Gerenciamento da Turma (Super ADM)</h2>
                <span>Acesso exclusivo para {usuario.username}</span>
              </header>
              <div className="corpo">
                <p>
                  Você pode navegar para a rota administrativa completa com suporte a importação em
                  massa de planilhas ou gerenciar destaques diretamente no portfólio.
                </p>
                <a href="/adm" className="botao botao-primario">
                  Abrir Painel ADM Completo →
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* ── MODAIS INTEGRADOS ────────────────────────────────────────────── */}
      {modalEditarPerfilAberto ? (
        <ModalEditarPerfil
          usuario={usuario}
          alunoAtual={meuAlunoNaTela}
          onFechar={() => setModalEditarPerfilAberto(false)}
        />
      ) : null}

      {alunoBreveSelecionado ? (
        <ModalPerfilBreve
          aluno={alunoBreveSelecionado}
          onFechar={() => setAlunoBreveSelecionado(null)}
        />
      ) : null}

      {alunoCracha ? (
        <CrachaModal aluno={alunoCracha} onClose={() => setAlunoCracha(null)} />
      ) : null}

      <CommandBar
        aberto={cmdAberto}
        onFechar={() => setCmdAberto(false)}
        alunos={naTela}
        salas={salas}
        onSelecionarSala={(sId) => {
          setSalaSelecionada(sId);
          setAba("portfolio");
        }}
        onAbrirCracha={(a) => setAlunoCracha(a)}
      />
    </div>
  );
}
