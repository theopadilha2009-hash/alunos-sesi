"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/acoes-crm";
import { Avatar } from "@/components/Avatar";
import { CartaoAluno } from "@/components/CartaoAluno";
import { CommandBar } from "@/components/CommandBar";
import { CrachaModal } from "@/components/CrachaModal";
import { PaginaMeuPerfil } from "@/components/crm/PaginaMeuPerfil";
import { PainelAdmIntegrado } from "@/components/crm/PainelAdmIntegrado";
import { ModalPerfilBreve } from "@/components/crm/ModalPerfilBreve";
import {
  IconeCards,
  IconeCracha,
  IconeEditar,
  IconeEscudo,
  IconeEstrela,
  IconeImprimir,
  IconeLogout,
  IconePortfolio,
  IconeProjetos,
  IconeSala,
  IconeTabela,
  IconeTrofeu,
  IconeUsuario,
} from "@/components/Icones";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { Roseta } from "@/components/Roseta";
import { TabelaAlunos } from "@/components/TabelaAlunos";
import { TemaToggle } from "@/components/TemaToggle";
import { TopProjetosTurma } from "@/components/TopProjetosTurma";
import { MuralDesafios } from "@/components/crm/MuralDesafios";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import { corHabilidade } from "@/lib/habilidades";
import { ordenarAlunos, rankingSalas } from "@/lib/ranking";
import { dispararConfetes, tocarSomEstrela } from "@/lib/som";
import type { Aluno, AlunoNaTela, DesafioHackathon, RetratoSala, Sala, UsuarioSessao } from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunosIniciais: Aluno[];
  salas: Sala[];
  retrato: RetratoSala[];
  meusVotos: string[];
  desafiosIniciais?: DesafioHackathon[];
};

type AbaAtiva = "portfolio" | "projetos" | "desafios" | "tabelas" | "perfil" | "adm";

export function CrmApp({
  usuario,
  alunosIniciais,
  salas,
  retrato,
  meusVotos,
  desafiosIniciais = [],
}: Props) {
  const [aba, setAba] = useState<AbaAtiva>("portfolio");
  const [desafios, setDesafios] = useState<DesafioHackathon[]>(desafiosIniciais);
  const [query, setQuery] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState<string>(TODAS);
  const [habilidadeFiltro, setHabilidadeFiltro] = useState<string>("Todas");
  // Filtro roda sobre o valor adiado: o input responde na hora e a lista pesada
  // é recalculada depois, com o mesmo resultado final.
  const queryAdiada = useDeferredValue(query);

  const [lista, setLista] = useState<Aluno[]>(alunosIniciais);
  const [meus, setMeus] = useState<string[]>(meusVotos);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Modais
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
        // `a.habilidades` já vem resolvida de `listarAlunos`. Redeclarar com o
        // regex da bio aqui desfazia a resolução no único lugar em que a lista
        // inteira é montada — e era isso que chegava em tags e chips.
        habilidades: a.habilidades ?? [],
      };
    });
  }, [lista, salas]);

  // Aluno correspondente ao usuário logado
  const meuAlunoNaTela = useMemo(() => {
    if (usuario.alunoId) {
      return naTela.find((a) => a.id === usuario.alunoId) ?? null;
    }
    return (
      naTela.find(
        (a) =>
          a.slug === "theo-padilha" ||
          a.slug === "telor-de-espadilha" ||
          a.id === "a1417080-b591-4cc9-8558-5650a3da0546",
      ) ?? null
    );
  }, [naTela, usuario.alunoId]);

  // Suporte a PWA shortcuts (?aba=desafios, ?aba=cracha)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const abaParam = params.get("aba");
    if (abaParam === "desafios") {
      setAba("desafios");
    } else if (abaParam === "cracha" && meuAlunoNaTela) {
      setAlunoCracha(meuAlunoNaTela);
    }
  }, [meuAlunoNaTela]);

  // Filtro de alunos visíveis no Portfólio
  const visiveis = useMemo(() => {
    const filtrados = filtrarAlunos(
      naTela.map((a) => ({ ...a, salaId: a.sala_id })),
      { sala: salaSelecionada, query: queryAdiada, estrelados: meus, habilidade: habilidadeFiltro },
    );
    return ordenarAlunos(filtrados);
  }, [naTela, salaSelecionada, queryAdiada, meus, habilidadeFiltro]);

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
      const s = salas.find((item) => item.id === salaSelecionada);
      return [
        {
          id: salaSelecionada,
          nome: s?.nome ?? "Sala Selecionada",
          cor: corDaSala(s?.nome ?? ""),
          alunos: visiveis,
        },
      ];
    }

    // Se "Todas", agrupa por cada sala respeitando a ordem do banco
    return salas
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        cor: corDaSala(s.nome),
        alunos: visiveis.filter((a) => a.sala_id === s.id || a.sala === s.nome),
      }))
      .filter((g) => g.alunos.length > 0);
  }, [salas, salaSelecionada, visiveis]);

  // Todas as criações/projetos agregados de todos os alunos
  const todasCriacoes = useMemo(() => {
    const arr: Array<{
      id: string;
      titulo: string;
      descricao: string;
      link?: string;
      imagem?: string;
      alunoNome: string;
      alunoSala: string | null;
      alunoFoto: string | null;
      alunoSlug: string;
      alunoObjeto: AlunoNaTela;
    }> = [];

    for (const a of naTela) {
      if (a.projetos && Array.isArray(a.projetos)) {
        for (const p of a.projetos) {
          arr.push({
            id: p.id,
            titulo: p.titulo,
            descricao: p.descricao,
            link: p.link,
            imagem: p.imagem,
            alunoNome: a.nome,
            alunoSala: a.sala,
            alunoFoto: a.foto_url ?? null,
            alunoSlug: a.slug,
            alunoObjeto: a,
          });
        }
      }
    }
    return arr;
  }, [naTela]);

  // Voto de Estrela Otimizado com som e confetes
  async function estrelar(alunoId: string, ev?: React.MouseEvent) {
    if (ocupado) return;
    setOcupado(alunoId);

    const meusAnteriores = meus;
    const listaAnterior = lista;

    const eraEstrelado = meus.includes(alunoId);
    const proximaListaMeus = eraEstrelado
      ? meus.filter((id) => id !== alunoId)
      : [...meus, alunoId];

    setMeus(proximaListaMeus);
    setLista((antiga) =>
      antiga.map((a) =>
        a.id === alunoId
          ? { ...a, estrelas: Math.max(0, a.estrelas + (eraEstrelado ? -1 : 1)) }
          : a,
      ),
    );

    if (!eraEstrelado) {
      tocarSomEstrela();
      if (ev) {
        dispararConfetes(ev.clientX, ev.clientY);
      }
    }

    try {
      const resp = await fetch("/api/estrela", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alunoId }),
      });
      if (!resp.ok) {
        setMeus(meusAnteriores);
        setLista(listaAnterior);
      }
    } catch {
      setMeus(meusAnteriores);
      setLista(listaAnterior);
    } finally {
      setOcupado(null);
    }
  }

  const ehSuperAdm = usuario.role === "super_adm";
  const nomeExibicao = usuario.nome || usuario.username;
  const salaExibicao = usuario.sala || "SESI SP";

  return (
    <div className="crm-layout">
      {/* ── BARRA LATERAL (SIDEBAR CRM) ──────────────────────────────────── */}
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
            <span>Buscar...</span>
            <kbd className="sidebar-kbd">⌘K</kbd>
          </button>
        </div>

        {/* Abas Principais de Navegação com Ícones SVG Limpos */}
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${aba === "portfolio" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("portfolio")}
          >
            <span className="nav-icone">
              <IconePortfolio tamanho={18} />
            </span>
            <span className="nav-label">Portfólio</span>
            <span className="nav-badge">{naTela.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "projetos" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("projetos")}
          >
            <span className="nav-icone">
              <IconeProjetos tamanho={18} />
            </span>
            <span className="nav-label">Projetos & Criações</span>
            <span className="nav-badge">{todasCriacoes.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "desafios" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("desafios")}
          >
            <span className="nav-icone">
              <IconeTrofeu tamanho={18} />
            </span>
            <span className="nav-label">Mural de Desafios</span>
            <span className="nav-badge">{desafios.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "tabelas" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("tabelas")}
          >
            <span className="nav-icone">
              <IconeTabela tamanho={18} />
            </span>
            <span className="nav-label">Tabelas & Alunos</span>
          </button>

          <button
            type="button"
            className={`nav-item ${aba === "perfil" ? "nav-item-ativo" : ""}`}
            onClick={() => setAba("perfil")}
          >
            <span className="nav-icone">
              <IconeUsuario tamanho={18} />
            </span>
            <span className="nav-label">Meu Perfil</span>
          </button>

          {ehSuperAdm ? (
            <button
              type="button"
              className={`nav-item ${aba === "adm" ? "nav-item-ativo" : ""}`}
              onClick={() => setAba("adm")}
            >
              <span className="nav-icone">
                <IconeEscudo tamanho={18} />
              </span>
              <span className="nav-label">Painel ADM</span>
              <span className="nav-badge-adm">Super</span>
            </button>
          ) : null}
        </nav>

        {/* Canto Inferior Esquerdo: Perfil do Usuário Logado & Ações Coesas */}
        <div className="sidebar-rodape">
          <div
            className="card-usuario-logado"
            onClick={() => setAba("perfil")}
            title="Acessar meu perfil e editor completo"
          >
            <div className="user-avatar-wrap">
              <Avatar
                nome={nomeExibicao}
                foto={meuAlunoNaTela?.foto_url}
                className="user-avatar"
              />
              <span className="user-online-dot" />
            </div>

            <div className="user-info">
              <span className="user-nome">{nomeExibicao}</span>
              <span className="user-sala">
                <span className="ponto" style={{ background: "var(--ciano)" }} />
                {salaExibicao} {ehSuperAdm ? "· Super ADM" : ""}
              </span>
            </div>

            <button
              type="button"
              className="user-editar-btn"
              title="Editar Perfil"
              aria-label="Editar Perfil"
              style={{
                background: "none",
                border: 0,
                padding: 0,
                color: "inherit",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setAba("perfil");
              }}
            >
              <IconeEditar tamanho={14} />
            </button>
          </div>

          <div className="sidebar-rodape-acoes">
            {meuAlunoNaTela ? (
              <button
                type="button"
                className="btn-sidebar-acao btn-sidebar-cracha"
                onClick={() => setAlunoCracha(meuAlunoNaTela)}
                title="Visualizar e baixar meu crachá digital"
              >
                <IconeCracha tamanho={15} />
                <span>Meu Crachá</span>
              </button>
            ) : null}

            <form action={logoutAction} className="form-logout-inline">
              <button
                type="submit"
                className="btn-sidebar-acao btn-sidebar-logout"
                title="Encerrar sessão no CRM"
                aria-label="Sair da conta"
              >
                <IconeLogout tamanho={15} />
                <span>Sair</span>
              </button>
            </form>
          </div>
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
                    : aba === "perfil"
                      ? "Configurações de Estudante"
                      : "Administração"}
            </span>
            <h1 className="crm-header-titulo">
              {aba === "portfolio"
                ? "Portfólio da Turma"
                : aba === "projetos"
                  ? "Criações & Projetos SESI"
                  : aba === "tabelas"
                    ? "Tabela de Alunos & Salas"
                    : aba === "perfil"
                      ? "Meu Perfil & Portfólio Pessoal"
                      : "Painel do Administrador"}
            </h1>
          </div>

          <div className="crm-header-acoes">
            <TemaToggle />
            {aba !== "perfil" ? (
              <button
                type="button"
                className="botao botao-primario"
                onClick={() => setAba("perfil")}
              >
                <IconeEditar tamanho={15} />
                <span>Editar Meu Perfil</span>
              </button>
            ) : null}
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
                    <IconeSala tamanho={18} />
                    <span>Salas & Estudantes SESI</span>
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
                    <IconeImprimir tamanho={14} />
                    <span>Imprimir Catálogo (PDF)</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-modo ${modoVisualizacao === "tabela" ? "btn-modo-ativo" : ""}`}
                    onClick={() => setModoVisualizacao("tabela")}
                    title="Formato Tabela com Redes Destacadas (Recomendado)"
                  >
                    <IconeTabela tamanho={14} />
                    <span>Tabela por Sala</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-modo ${modoVisualizacao === "cards" ? "btn-modo-ativo" : ""}`}
                    onClick={() => setModoVisualizacao("cards")}
                    title="Formato Cards"
                  >
                    <IconeCards tamanho={14} />
                    <span>Cards</span>
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
                        <h3 className="secao-sala-nome">{grupo.nome}</h3>
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
                                <Avatar
                                  nome={aluno.nome}
                                  foto={aluno.foto_url}
                                  className="card-port-avatar"
                                />
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
                                  <IconeEstrela preenchida={estrelado} tamanho={12} /> {aluno.estrelas}
                                </button>
                              </header>

                              {aluno.bio ? (
                                <p className="card-port-bio">{aluno.bio}</p>
                              ) : null}

                              {/* Redes Principais (LinkedIn & GitHub em alto destaque) */}
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
                                  <IconeCracha tamanho={12} /> Crachá
                                </button>
                              </div>

                              <footer className="card-port-rodape">
                                <button
                                  type="button"
                                  className="ver-perfil-texto"
                                  style={{
                                    background: "none",
                                    border: 0,
                                    padding: 0,
                                    fontFamily: "inherit",
                                    cursor: "pointer",
                                    textAlign: "inherit",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAlunoBreveSelecionado(aluno);
                                  }}
                                >
                                  Ver perfil completo & criações →
                                </button>
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
                    <img
                      src={p.imagem}
                      alt={p.titulo}
                      className="criacao-mural-capa"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="criacao-mural-capa-placeholder">
                      <IconeProjetos tamanho={24} />
                      <span>Projeto SESI</span>
                    </div>
                  )}

                  <div className="criacao-mural-corpo">
                    <div className="criacao-autor">
                      <Avatar nome={p.alunoNome} foto={p.alunoFoto} className="mini-avatar" />
                      <div>
                        <b>{p.alunoNome}</b>
                        <small>{p.alunoSala ?? "SESI"}</small>
                      </div>
                    </div>

                    <h3 className="criacao-titulo">{p.titulo}</h3>
                    <p className="criacao-desc">{p.descricao}</p>

                    <div className="criacao-rodape">
                      {p.link ? (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noreferrer"
                          className="link-ext"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Acessar Criação ↗
                        </a>
                      ) : (
                        <span className="criacao-sem-link">Sem link externo</span>
                      )}

                      <button
                        type="button"
                        className="btn-ver-autor"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlunoBreveSelecionado(p.alunoObjeto);
                        }}
                      >
                        Perfil do Autor →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── ABA: MURAL DE DESAFIOS & HACKATHONS SESI ─────────────── */}
        {aba === "desafios" ? (
          <div className="crm-secao-conteudo">
            <MuralDesafios desafios={desafios} usuario={usuario} />
          </div>
        ) : null}

        {/* ── ABA 3: TABELAS & ALUNOS ──────────────────────────────────── */}
        {aba === "tabelas" ? (
          <div className="crm-secao-conteudo">
            <div className="bloco-cabecalho-tabela">
              <h2>Tabela Geral de Estudantes SESI</h2>
              <p>
                Visualização tabular completa com filtros por sala, status de fixação e redes
                profissionais.
              </p>
            </div>

            <TabelaAlunos
              alunos={visiveis}
              meusVotos={meus}
              ocupado={ocupado}
              onEstrelar={estrelar}
              onAbrirCracha={setAlunoCracha}
              onSelecionarAluno={setAlunoBreveSelecionado}
            />
          </div>
        ) : null}

        {/* ── ABA 4: MEU PERFIL (Página Completa Estilo Imagem 4) ──────── */}
        {aba === "perfil" ? (
          <div className="crm-secao-conteudo">
            <PaginaMeuPerfil
              usuario={usuario}
              alunoAtual={meuAlunoNaTela}
              salas={salas}
            />
          </div>
        ) : null}

        {/* ── ABA 5: PAINEL ADMINISTRATIVO INTEGRADO (Super ADM) ────────── */}
        {aba === "adm" && ehSuperAdm ? (
          <div className="crm-secao-conteudo">
            <PainelAdmIntegrado
              alunos={naTela}
              salas={salas}
              onAbrirCracha={(a) => setAlunoCracha(a)}
              onSelecionarAluno={(a) => setAlunoBreveSelecionado(a)}
            />
          </div>
        ) : null}
      </main>

      {/* ── MODAIS INTEGRADOS ────────────────────────────────────────────── */}
      {alunoBreveSelecionado ? (
        <ModalPerfilBreve
          aluno={alunoBreveSelecionado}
          onFechar={() => setAlunoBreveSelecionado(null)}
          onAbrirCracha={(a) => {
            setAlunoBreveSelecionado(null);
            setAlunoCracha(a);
          }}
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
