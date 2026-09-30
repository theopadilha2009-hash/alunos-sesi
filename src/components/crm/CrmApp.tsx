"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "@/app/acoes-crm";
import { Avatar } from "@/components/Avatar";
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
import { LinhaCargos } from "@/components/CargosBadges";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { Roseta } from "@/components/Roseta";
import { TabelaAlunos } from "@/components/TabelaAlunos";
import { TemaToggle } from "@/components/TemaToggle";
import { TopProjetosTurma } from "@/components/TopProjetosTurma";
import { MuralDesafios } from "@/components/crm/MuralDesafios";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { chaveDaSala, corDaSala, corDoAluno } from "@/lib/cores";
import { lerRespostaEstrela, motivoParaNaoEstrelar } from "@/lib/estrela";
import { corHabilidade } from "@/lib/habilidades";
import { ordenarAlunos } from "@/lib/ranking";
import { dispararConfetes, tocarSomEstrela } from "@/lib/som";
import type {
  Aluno,
  AlunoNaTela,
  DesafioHackathon,
  RetratoSala,
  Sala,
  SubmissaoDesafio,
  UsuarioSessao,
} from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunosIniciais: Aluno[];
  salas: Sala[];
  retrato: RetratoSala[];
  meusVotos: string[];
  desafiosIniciais?: DesafioHackathon[];
  /** `aluno_id` de quem já tem login — o painel só oferece código a quem não tem. */
  comAcesso?: string[];
  /**
   * Fila de moderação do mural. Vem direto da prop, sem `useState`: o ADM
   * decide por Server Action e o `revalidatePath` re-renderiza o Server
   * Component. Guardar em estado congelaria a fila na primeira carga.
   */
  submissoesIniciais?: SubmissaoDesafio[];
  /** Os envios DESTE aluno, para o mural mostrar a situação de cada um. */
  meusEnvios?: SubmissaoDesafio[];
};

type AbaAtiva = "portfolio" | "projetos" | "desafios" | "tabelas" | "perfil" | "adm";

/** Troca de turma pedida pelo ADM e ainda não confirmada pelo servidor. */
type TrocaDeTurma = { salaId: string; nomeSala: string | null };

/**
 * A troca saiu do papel? Confere contra a linha que o servidor mandou.
 *
 * Duas provas, porque a troca viaja de duas formas: pelo `id` da sala, quando o
 * ADM escolhe uma que já existe, e pelo NOME, quando ele cria uma turma nova —
 * nesse caminho o formulário manda só o texto digitado. O nome é comparado por
 * `chaveDaSala`, a mesma identidade de turma do banco (caixa e espaço, nunca
 * acento), e não pela string crua: "dsm3" e "DSM3" são a mesma sala aqui como
 * são lá.
 */
function trocaConfirmada(
  aluno: Aluno,
  pedido: TrocaDeTurma,
  nomePorId: Map<string, string>,
): boolean {
  if (pedido.salaId && aluno.sala_id === pedido.salaId) return true;
  if (!pedido.nomeSala) return false;
  const nomeNoBanco = aluno.sala_id ? (nomePorId.get(aluno.sala_id) ?? aluno.sala) : aluno.sala;
  return !!nomeNoBanco && chaveDaSala(nomeNoBanco) === chaveDaSala(pedido.nomeSala);
}

/**
 * A frase da recusa da troca de turma, no tom do CRM.
 *
 * Sem `error.message` do PostgREST: nome de coluna e código de constraint são
 * diagnóstico de log, não frase para o ADM que acabou de mexer no seletor.
 */
function fraseDaRecusaDaTroca(nomes: string[]): string {
  const quem =
    nomes.length === 1
      ? `a turma de ${nomes[0]}`
      : `a turma de ${nomes.length} alunos`;
  return `Não deu para trocar ${quem}: nada foi gravado e a lista voltou para a turma anterior.`;
}

export function CrmApp({
  usuario,
  alunosIniciais,
  salas,
  retrato,
  meusVotos,
  desafiosIniciais = [],
  comAcesso = [],
  submissoesIniciais = [],
  meusEnvios = [],
}: Props) {
  const [aba, setAba] = useState<AbaAtiva>("portfolio");
  // Sem setter: `desafios` é só lido, e o estado congela o valor da prop — quem
  // troca a lista é o remonte depois da Server Action. Não confundir com o
  // `meus` logo abaixo: ele **tem** setter, porque o voto é otimista.
  const [desafios] = useState<DesafioHackathon[]>(desafiosIniciais);
  const [query, setQuery] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState<string>(TODAS);
  const [habilidadeFiltro, setHabilidadeFiltro] = useState<string>("Todas");
  // Filtro roda sobre o valor adiado: o input responde na hora e a lista pesada
  // é recalculada depois, com o mesmo resultado final.
  const queryAdiada = useDeferredValue(query);

  const [lista, setLista] = useState<Aluno[]>(alunosIniciais);

  // Troca de turma em voo, por aluno. Fica em `useRef` e não em `useState`: o
  // que o ADM escolheu não é para desenhar nada — a pintura otimista da linha já
  // está na lista —, é para ser conferido quando a resposta do servidor chegar.
  //
  // atalho: uma troca em voo por aluno; dois pedidos seguidos na MESMA linha,
  // antes de a primeira resposta chegar, são conferidos contra o estado do
  // primeiro e o segundo pode ser lido como recusa. Revisitar se o seletor
  // passar a disparar mais de uma troca por gesto (arrastar, multiseleção).
  const trocasPendentes = useRef(new Map<string, TrocaDeTurma>());
  /** Recusa da troca de turma, escrita acima da tabela do painel ADM. */
  const [recadoSala, setRecadoSala] = useState<string | null>(null);

  // Sincroniza a lista local quando o servidor revalida e envia novas props
  useEffect(() => {
    setLista(alunosIniciais);

    // A resposta da troca de turma chegou — e ela é a única resposta que existe:
    // `mudarSalaDoAluno` devolve `void` (é `action` de `<form>`), então quem
    // chamou não tem retorno nenhum para ler. O que o ADM viu pintado foi
    // gravado? Se não foi, o `setLista` acima já devolveu a linha à turma do
    // servidor, e a recusa vira frase na tela. Sem isto, o `revalidar()` dos
    // caminhos de falha corrigia a lista em silêncio e a troca recusada ficava
    // com cara de sucesso.
    const pendentes = trocasPendentes.current;
    if (pendentes.size === 0) return;

    const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));
    const recusados: string[] = [];
    for (const [alunoId, pedido] of pendentes) {
      pendentes.delete(alunoId);
      const aluno = alunosIniciais.find((a) => a.id === alunoId);
      if (aluno && !trocaConfirmada(aluno, pedido, nomePorId)) recusados.push(aluno.nome);
    }
    if (recusados.length > 0) setRecadoSala(fraseDaRecusaDaTroca(recusados));
  }, [alunosIniciais]);

  const handleMudarSalaAluno = (alunoId: string, novaSalaId: string, nomeSala?: string) => {
    setLista((antiga) =>
      antiga.map((a) =>
        a.id === alunoId
          ? {
              ...a,
              sala_id: novaSalaId || a.sala_id,
              ...(nomeSala ? { sala: nomeSala.trim().toUpperCase() } : {}),
            }
          : a,
      ),
    );
    // A pintura acima vale como pedido: o que o ADM escolheu fica guardado até a
    // revalidação chegar, para o efeito logo acima poder conferir se vingou. A
    // recusa anterior sai da tela no mesmo gesto — ela é do pedido antigo.
    trocasPendentes.current.set(alunoId, {
      salaId: novaSalaId,
      nomeSala: nomeSala?.trim() ?? null,
    });
    setRecadoSala(null);
  };

  const [meus, setMeus] = useState<string[]>(meusVotos);
  const [ocupado, setOcupado] = useState<string | null>(null);
  /** Recusa do servidor no voto, escrita perto de quem clicou. */
  const [recado, setRecado] = useState<string | null>(null);

  // Modais
  const [alunoBreveSelecionado, setAlunoBreveSelecionado] = useState<AlunoNaTela | null>(null);
  const [alunoCracha, setAlunoCracha] = useState<AlunoNaTela | null>(null);
  const [cmdAberto, setCmdAberto] = useState(false);
  // Com que sub-aba o Painel ADM abre. O atalho do Mural de Desafios escreve
  // aqui antes de trocar de aba — o painel monta depois, e pega o valor novo.
  const [subAbaAdm, setSubAbaAdm] = useState<"alunos" | "desafios">("alunos");

  // Mapeia alunos para a visualização na tela
  const naTela: AlunoNaTela[] = useMemo(() => {
    // O mapa guarda o nome como ele está no banco: a cor sai de `corDaSala`, e
    // quem normaliza é ela (`cores.ts`). A caixa alta daqui para baixo é só do
    // que se lê na tela — enquanto ela também alimentava o hash, o CRM pintava
    // "dsm3" de uma cor e a vitrine, que passa o nome cru, de outra.
    const nomePorId = new Map(salas.map((s) => [s.id, s.nome]));
    return lista.map((a) => {
      const nomeSala = a.sala_id ? (nomePorId.get(a.sala_id) ?? a.sala ?? null) : (a.sala ?? null);
      return {
        ...a,
        sala: nomeSala?.trim().toUpperCase() ?? null,
        cor: corDoAluno(a.cor_perfil, nomeSala),
        corSala: corDaSala(nomeSala ?? ""),
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

    // Se "Todas", agrupa por cada sala unificando variações de caixa (ex: "dsm3" e "DSM3" juntos em "DSM3")
    const gruposMap = new Map<string, { id: string; nome: string; cor: string; alunos: AlunoNaTela[] }>();

    for (const s of salas) {
      const nomeCanonico = s.nome.trim().toUpperCase();
      if (!gruposMap.has(nomeCanonico)) {
        gruposMap.set(nomeCanonico, {
          id: s.id,
          nome: nomeCanonico,
          cor: corDaSala(nomeCanonico),
          alunos: [],
        });
      }
    }

    for (const a of visiveis) {
      const nomeCanonico = (a.sala ?? "").trim().toUpperCase();
      let grupo = gruposMap.get(nomeCanonico);
      if (!grupo && nomeCanonico) {
        grupo = {
          id: a.sala_id || nomeCanonico,
          nome: nomeCanonico,
          cor: corDaSala(nomeCanonico),
          alunos: [],
        };
        gruposMap.set(nomeCanonico, grupo);
      }
      if (grupo) {
        grupo.alunos.push(a);
      }
    }

    return Array.from(gruposMap.values()).filter((g) => g.alunos.length > 0);
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

  // Voto de estrela otimista, com som e confetes.
  //
  // Quem confirma o resultado é a resposta do servidor, não o que a tela
  // pintou. Quando ele recusa — perfil pendente, rate limit, navegador sem
  // cookie — o otimismo é desfeito E o motivo vai para a tela. Antes o desfazer
  // era mudo, então recusa e voto duplicado davam o mesmo sintoma: confete,
  // som, e o número de volta sem explicação.
  //
  // atalho: um voto por vez na tela inteira (o otimismo guarda o estado
  // anterior para poder desfazer, e dois em voo se atropelam); revisitar se o
  // POST passar de ~1s.
  async function estrelar(alunoId: string, ev?: React.MouseEvent) {
    if (ocupado) return;
    setOcupado(alunoId);
    setRecado(null);

    const meusAnteriores = meus;
    const listaAnterior = lista;
    const eraEstrelado = meus.includes(alunoId);

    setMeus(
      eraEstrelado ? meus.filter((id) => id !== alunoId) : [...meus, alunoId],
    );
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

    function desfazer() {
      setMeus(meusAnteriores);
      setLista(listaAnterior);
    }

    try {
      const resp = await fetch("/api/estrela", {
        // Tirar a estrela é DELETE. Mandar POST aqui não removia nada: a rota
        // insere com `on conflict do nothing`, então a tela desmarcava e o voto
        // voltava no próximo carregamento.
        method: eraEstrelado ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alunoId }),
      });
      const resultado = lerRespostaEstrela(
        resp.status,
        await resp.json().catch(() => null),
      );

      if (!resultado.ok) {
        desfazer();
        setRecado(resultado.motivo);
        return;
      }

      setLista((antiga) =>
        antiga.map((a) =>
          a.id === alunoId ? { ...a, estrelas: resultado.estrelas } : a,
        ),
      );
      setMeus((antes) =>
        resultado.votado
          ? antes.includes(alunoId)
            ? antes
            : [...antes, alunoId]
          : antes.filter((id) => id !== alunoId),
      );
    } catch {
      desfazer();
      setRecado("Não deu para votar agora. Confira a conexão e tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  function handleAtualizarMeuAluno(dados: Partial<Aluno>) {
    setLista((antiga) =>
      antiga.map((a) => {
        const meuId = usuario.alunoId || meuAlunoNaTela?.id;
        return a.id === meuId ? { ...a, ...dados } : a;
      }),
    );
  }

  const ehSuperAdm = usuario.role === "super_adm";
  const nomeExibicao = usuario.nome || usuario.username;
  const salaExibicao = usuario.sala || "SESI SP";

  // Mesmo filtro do painel (`aprovado === null` é pendente no tri-estado da 016).
  // Só super_adm recebe `submissoesIniciais`; para os outros papéis a lista vem
  // vazia e o contador nem é desenhado.
  const enviosPendentes = submissoesIniciais.filter(
    (s) => (s.aprovado ?? null) === null,
  ).length;

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
              // Entrar pelo menu abre na primeira sub-aba. Sem este reset, quem
              // chegou à fila pelo atalho do Mural deixaria o `subAbaAdm` em
              // "desafios" e o próximo clique aqui cairia na 5ª de 5 — a fila
              // virava a porta de entrada do painel sem ninguém ter pedido.
              onClick={() => {
                setSubAbaAdm("alunos");
                setAba("adm");
              }}
            >
              <span className="nav-icone">
                <IconeEscudo tamanho={18} />
              </span>
              <span className="nav-label">Painel ADM</span>
              {/* O contador do que espera decisão. Sem ele, a fila do mural só
                  existe depois de três cliques — o ADM não tem como saber que
                  há algo esperando por ele. */}
              {enviosPendentes > 0 ? (
                <span
                  className="nav-badge nav-badge-fila"
                  title={`${enviosPendentes} ${enviosPendentes === 1 ? "envio" : "envios"} do mural esperando julgamento`}
                >
                  {enviosPendentes}
                </span>
              ) : null}
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
            {meuAlunoNaTela?.banner_url ? (
              <div
                className="card-usuario-banner-fundo"
                style={{ backgroundImage: `url("${meuAlunoNaTela.banner_url}")` }}
                aria-hidden="true"
              />
            ) : null}

            <div className="card-usuario-conteudo">
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
                <div className="user-cargos-wrap">
                  <LinhaCargos
                    aluno={{
                      sala: meuAlunoNaTela?.sala || salaExibicao,
                      corSala: meuAlunoNaTela?.corSala || "var(--ciano)",
                      fixado: meuAlunoNaTela?.fixado,
                      destaque: meuAlunoNaTela?.destaque,
                    }}
                    role={ehSuperAdm ? "super_adm" : usuario.role}
                    agruparExtras
                    tamanho="pequeno"
                  />
                </div>
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

        {/* Aviso de moderação. Sem isto o aluno recém-cadastrado edita o perfil,
            salva, abre o próprio link e leva 404 — sem nada na tela dizendo por
            quê. Aparece em todas as abas de propósito: é a primeira coisa que
            ele precisa entender. */}
        {usuario.aprovado === false ? (
          <div className="crm-aviso-moderacao" role="status">
            <strong>Seu perfil aguarda aprovação.</strong> Ele ainda não aparece
            na vitrine, no cartão nem na validação do crachá — o ADM precisa
            liberar. Você já pode editar e salvar tudo normalmente enquanto isso.
          </div>
        ) : null}

        {/* A recusa do voto aparece aqui, no mesmo lugar em todas as abas: os
            botões de estrela vivem no Portfólio e na aba Tabelas, e a mensagem
            não pode nascer dentro de uma delas. */}
        {recado ? (
          <p className="recado recado-erro" role="status">
            {recado}
          </p>
        ) : null}

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
                          const impedimento = motivoParaNaoEstrelar(aluno);
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
                                  {/* `grupo.cor`, e não a cor da sala do aluno: o
                                      rótulo é o nome do GRUPO, que pode ser
                                      "Meus Alunos Estrelados" — aí a cor do
                                      aluno não teria relação com o texto. */}
                                  <span
                                    className="card-port-sala"
                                    style={{ ["--sala-cor" as string]: grupo.cor }}
                                  >
                                    {grupo.nome}
                                  </span>
                                </div>

                                {/* O `title` fica no envoltório: em controle
                                    `disabled` o Chrome não emite evento de
                                    mouse, e o tooltip não saía (ver
                                    `TabelaAlunos.tsx`, mesmo desenho). */}
                                <span
                                  className="estrela-wrap"
                                  title={impedimento ?? undefined}
                                  data-bloqueada={impedimento ? "" : undefined}
                                >
                                  <button
                                    type="button"
                                    className="estrela mini-estrela"
                                    aria-pressed={estrelado}
                                    // Desabilitado também enquanto OUTRO voto está
                                    // em voo: o `estrelar` só aceita um por vez, e
                                    // sem isto o clique era descartado em silêncio.
                                    disabled={impedimento !== null || ocupado !== null}
                                    aria-label={
                                      impedimento ??
                                      (estrelado
                                        ? `Tirar estrela de ${aluno.nome}`
                                        : `Dar estrela para ${aluno.nome}`)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      estrelar(aluno.id, e);
                                    }}
                                  >
                                    <IconeEstrela preenchida={estrelado} tamanho={12} /> {aluno.estrelas}
                                  </button>
                                </span>
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
            <MuralDesafios
              desafios={desafios}
              usuario={usuario}
              envios={meusEnvios}
              enviosPendentes={enviosPendentes}
              // Sem `onJulgarEnvios` a faixa nem é desenhada: a fila não existe
              // para quem não pode julgar.
              onJulgarEnvios={
                ehSuperAdm
                  ? () => {
                      setSubAbaAdm("desafios");
                      setAba("adm");
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        {/* ── ABA 3: TABELAS & ALUNOS ──────────────────────────────────── */}
        {aba === "tabelas" ? (
          <div className="crm-secao-conteudo">
            <div className="bloco-cabecalho-tabela">
              <h2>Tabela Geral de Estudantes SESI</h2>
              {/* O texto antigo prometia "filtros por sala, status de fixação e
                  redes profissionais" que esta aba nunca teve — e, pior, os da
                  aba Portfólio continuavam valendo aqui sem aparecer. Agora a
                  lista é a turma inteira, e a frase diz o que a tela entrega. */}
              <p>
                Visualização tabular completa da turma: sala, estrelas, fixação e redes
                profissionais.
              </p>
            </div>

            {/* `naTela`, e não `visiveis`: os filtros da aba Portfólio (busca,
                sala, estrelados, competência) sobrevivem à troca de aba porque
                moram no estado do `CrmApp`, mas os controles que os produzem só
                são desenhados na aba do Portfólio. A tabela aparecia filtrada
                sem nada na tela explicando por quê — e o próprio cabeçalho
                acima promete "visualização tabular completa". Um F5, que zera o
                estado, "consertava" a tela e escondia a causa. */}
            <TabelaAlunos
              alunos={naTela}
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
              onAtualizarAluno={handleAtualizarMeuAluno}
            />
          </div>
        ) : null}

        {/* ── ABA 5: PAINEL ADMINISTRATIVO INTEGRADO (Super ADM) ────────── */}
        {aba === "adm" && ehSuperAdm ? (
          <div className="crm-secao-conteudo">
            <PainelAdmIntegrado
              alunos={naTela}
              salas={salas}
              comAcesso={comAcesso}
              submissoes={submissoesIniciais}
              subAbaInicial={subAbaAdm}
              onAbrirCracha={(a) => setAlunoCracha(a)}
              onSelecionarAluno={(a) => setAlunoBreveSelecionado(a)}
              onMudarSalaAluno={handleMudarSalaAluno}
              recadoSala={recadoSala}
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
        // O aluno comum não tem a aba ADM na sidebar (`CrmApp` já esconde), mas
        // a paleta de comandos não era gateada: ele achava o painel por aqui.
        ehAdm={ehSuperAdm}
        onSelecionarSala={(sId) => {
          setSalaSelecionada(sId);
          setAba("portfolio");
        }}
        onAbrirCracha={(a) => setAlunoCracha(a)}
      />
    </div>
  );
}
