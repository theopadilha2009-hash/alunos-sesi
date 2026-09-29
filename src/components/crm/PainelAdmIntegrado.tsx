"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  alternar,
  aprovarAluno,
  criarAluno,
  decidirSubmissaoAction,
  gerarCodigoAtivacao,
  importarLista,
  mudarSalaDoAluno,
  publicarDesafioAction,
  removerAluno,
} from "@/app/adm/acoes";
import { ESTADO_CODIGO_INICIAL, ESTADO_INICIAL } from "@/app/adm/estado";
import {
  IconeCheck,
  IconeChave,
  IconeCracha,
  IconeEditar,
  IconeEscudo,
  IconeEstrela,
  IconeLixeira,
  IconePlus,
  IconeSala,
  IconeTabela,
  IconeUpload,
  IconeUsuario,
} from "@/components/Icones";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { Avatar } from "@/components/Avatar";
import { aoSetasDasAbas } from "@/lib/abas";
import { dataCurta } from "@/lib/datas";
import {
  CATEGORIAS,
  MAX_CRITERIOS,
  MAX_DESCRICAO,
  MAX_PRAZO,
  MAX_RECOMPENSA,
  MAX_SUBTITULO,
  MAX_TITULO,
} from "@/lib/desafios";
import { contarLacunas, filtrarPorLacuna, ROTULO_LACUNA, type Lacuna } from "@/lib/lacunas";
import type { AlunoNaTela, SubmissaoDesafio } from "@/lib/tipos";

type SubAba = "alunos" | "importar" | "novo" | "salas" | "desafios";

type Props = {
  alunos: AlunoNaTela[];
  salas: { id: string; nome: string }[];
  /** `aluno_id` de quem já tem login — o código só é oferecido a quem não tem. */
  comAcesso: string[];
  /** Fila de moderação do mural, já com o nome do aluno e o título do desafio. */
  submissoes: SubmissaoDesafio[];
  /**
   * Em que sub-aba abrir. O painel só monta quando a aba `adm` fica ativa, então
   * o valor vale como estado inicial — é assim que o atalho do Mural de Desafios
   * leva direto à fila de envios, que fica a dois níveis de fundo daqui.
   */
  subAbaInicial?: SubAba;
  onAbrirCracha: (aluno: AlunoNaTela) => void;
  onSelecionarAluno?: (aluno: AlunoNaTela) => void;
};

export function PainelAdmIntegrado({
  alunos,
  salas,
  comAcesso,
  submissoes,
  subAbaInicial = "alunos",
  onAbrirCracha,
  onSelecionarAluno,
}: Props) {
  const [subAba, setSubAba] = useState<SubAba>(subAbaInicial);
  const [busca, setBusca] = useState("");
  const [salaFiltro, setSalaFiltro] = useState<string>("todas");
  const [lacuna, setLacuna] = useState<Lacuna | null>(null);

  // Ações de formulário com useActionState
  const [estadoImportar, formImportar, importando] = useActionState(importarLista, ESTADO_INICIAL);
  const [estadoCriar, formCriar, criando] = useActionState(criarAluno, ESTADO_INICIAL);
  const [estadoCodigo, formCodigo, emitindoCodigo] = useActionState(
    gerarCodigoAtivacao,
    ESTADO_CODIGO_INICIAL,
  );
  const [estadoDesafio, formDesafio, publicando] = useActionState(
    publicarDesafioAction,
    ESTADO_INICIAL,
  );

  // O tom do banner da importação. As ações que não preenchem `tom` continuam
  // nos dois estados de sempre, pelo `ok`.
  const tomImportar = estadoImportar.tom ?? (estadoImportar.ok ? "sucesso" : "erro");

  // A fila mostra primeiro o que espera decisão: um envio julgado some da
  // frente do ADM e vira histórico.
  //
  // `=== null` e não `!s.aprovado`: com o tri-estado da 016 o `!` também
  // pegaria os rejeitados, e eles voltariam para a fila de quem já os julgou.
  const pendentes = submissoes.filter((s) => (s.aprovado ?? null) === null);

  // `alguns` alunos já têm login; o código é só para quem falta.
  const comAcessoSet = useMemo(() => new Set(comAcesso), [comAcesso]);

  // Alunos filtrados no painel
  const alunosFiltrados = useMemo(() => {
    const porTextoESala = alunos.filter((a) => {
      const matchBusca =
        !busca.trim() ||
        a.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (a.sala && a.sala.toLowerCase().includes(busca.toLowerCase())) ||
        (a.github && a.github.toLowerCase().includes(busca.toLowerCase()));
      const matchSala = salaFiltro === "todas" || a.sala_id === salaFiltro || a.sala === salaFiltro;
      return matchBusca && matchSala;
    });
    return filtrarPorLacuna(porTextoESala, lacuna);
  }, [alunos, busca, salaFiltro, lacuna]);

  const salaAtiva = lacuna ? salas.find((s) => s.id === salaFiltro)?.nome : null;
  const regraAtiva = lacuna ? ROTULO_LACUNA[lacuna] : null;

  /**
   * O card de sala não cabe na tela junto da tabela, então o filtro precisa
   * trazer o ADM de volta: sem isto a aba troca e ele fica olhando para o
   * rodapé da seção anterior, sem ver as linhas que acabou de pedir.
   *
   * O scroll sai de um efeito, e não do próprio clique, porque no clique a
   * tabela ainda está com `display: none` — o `getElementById` acharia a caixa
   * escondida e não rolaria nada.
   */
  const [rolarParaLista, setRolarParaLista] = useState(0);

  useEffect(() => {
    if (rolarParaLista === 0) return;
    document
      .getElementById("adm-painel-alunos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rolarParaLista]);

  function abrirLacuna(salaId: string, chave: Lacuna) {
    setSalaFiltro(salaId);
    setLacuna(chave);
    setSubAba("alunos");
    setRolarParaLista((n) => n + 1);
  }

  const totalFixados = alunos.filter((a) => a.fixado).length;
  const totalDestaques = alunos.filter((a) => a.destaque).length;
  const totalComRedes = alunos.filter((a) => a.linkedin || a.github).length;

  return (
    <div className="painel-adm-integrado">
      {/* ── CABEÇALHO DO PAINEL ADM ────────────────────────────────────────── */}
      <header className="adm-header-bloco">
        <div className="adm-header-info">
          <div className="adm-header-badge">
            <IconeEscudo tamanho={14} />
            <span>MÓDULO ADMINISTRATIVO EXCLUSIVO</span>
          </div>
          <h2 className="adm-header-titulo">Painel de Gestão da Turma</h2>
          <p className="adm-header-sub">
            Gerenciamento global de estudantes, destaques em pódio, importação em lote e moderação
          </p>
        </div>
      </header>

      {/* ── MÉTRICAS INSTITUCIONAIS DA TURMA ──────────────────────────────── */}
      <div className="adm-metricas-grid">
        <div className="adm-metrica-card">
          <div className="metrica-icone-wrap">
            <IconeUsuario tamanho={18} />
          </div>
          <div className="metrica-textos">
            <span className="metrica-numero">{alunos.length}</span>
            <span className="metrica-legenda">Estudantes Cadastrados</span>
          </div>
        </div>

        <div className="adm-metrica-card">
          <div className="metrica-icone-wrap" style={{ background: "rgba(56, 199, 189, 0.12)", color: "#38c7bd" }}>
            <IconeSala tamanho={18} />
          </div>
          <div className="metrica-textos">
            <span className="metrica-numero">{salas.length}</span>
            <span className="metrica-legenda">Salas / Turmas Ativas</span>
          </div>
        </div>

        <div className="adm-metrica-card">
          <div className="metrica-icone-wrap" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
            <IconeEstrela preenchida tamanho={18} />
          </div>
          <div className="metrica-textos">
            <span className="metrica-numero">{totalDestaques}</span>
            <span className="metrica-legenda">Destaques Super ADM</span>
          </div>
        </div>

        <div className="adm-metrica-card">
          <div className="metrica-icone-wrap" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
            <IconeCheck tamanho={18} />
          </div>
          <div className="metrica-textos">
            <span className="metrica-numero">{totalComRedes}</span>
            <span className="metrica-legenda">Perfis com Redes Conectadas</span>
          </div>
        </div>
      </div>

      {/* ── NAVEGAÇÃO DE SUB-ABAS DO PAINEL ADM ────────────────────────────── */}
      <div className="adm-tabs-nav" role="tablist">
        <button
          type="button"
          id="adm-tab-alunos"
          className={`adm-tab-item ${subAba === "alunos" ? "adm-tab-item-ativo" : ""}`}
          onClick={() => setSubAba("alunos")}
          onKeyDown={aoSetasDasAbas}
          role="tab"
          aria-selected={subAba === "alunos"}
          aria-controls="adm-painel-alunos"
          tabIndex={subAba === "alunos" ? 0 : -1}
        >
          <IconeTabela tamanho={15} />
          <span>Gestão de Alunos & Destaques ({alunos.length})</span>
        </button>

        <button
          type="button"
          id="adm-tab-importar"
          className={`adm-tab-item ${subAba === "importar" ? "adm-tab-item-ativo" : ""}`}
          onClick={() => setSubAba("importar")}
          onKeyDown={aoSetasDasAbas}
          role="tab"
          aria-selected={subAba === "importar"}
          aria-controls="adm-painel-importar"
          tabIndex={subAba === "importar" ? 0 : -1}
        >
          <IconeUpload tamanho={15} />
          <span>Importar em Massa (Planilha)</span>
        </button>

        <button
          type="button"
          id="adm-tab-novo"
          className={`adm-tab-item ${subAba === "novo" ? "adm-tab-item-ativo" : ""}`}
          onClick={() => setSubAba("novo")}
          onKeyDown={aoSetasDasAbas}
          role="tab"
          aria-selected={subAba === "novo"}
          aria-controls="adm-painel-novo"
          tabIndex={subAba === "novo" ? 0 : -1}
        >
          <IconePlus tamanho={15} />
          <span>Cadastrar Aluno Individual</span>
        </button>

        <button
          type="button"
          id="adm-tab-salas"
          className={`adm-tab-item ${subAba === "salas" ? "adm-tab-item-ativo" : ""}`}
          onClick={() => setSubAba("salas")}
          onKeyDown={aoSetasDasAbas}
          role="tab"
          aria-selected={subAba === "salas"}
          aria-controls="adm-painel-salas"
          tabIndex={subAba === "salas" ? 0 : -1}
        >
          <IconeSala tamanho={15} />
          <span>Salas & Turmas ({salas.length})</span>
        </button>

        {/* O contador é dos envios que esperam decisão, não do total: é o
            número que diz ao ADM se há trabalho ali. */}
        <button
          type="button"
          id="adm-tab-desafios"
          className={`adm-tab-item ${subAba === "desafios" ? "adm-tab-item-ativo" : ""}`}
          onClick={() => setSubAba("desafios")}
          onKeyDown={aoSetasDasAbas}
          role="tab"
          aria-selected={subAba === "desafios"}
          aria-controls="adm-painel-desafios"
          tabIndex={subAba === "desafios" ? 0 : -1}
        >
          <IconeEstrela tamanho={15} />
          <span>Desafios do Mural ({pendentes.length})</span>
        </button>
      </div>

      {/* ── CONTEÚDO DAS SUB-ABAS ─────────────────────────────────────────── */}

      {/* Sub-Aba 1: Lista e Gestão de Alunos */}
      <div
        id="adm-painel-alunos"
        role="tabpanel"
        aria-labelledby="adm-tab-alunos"
        style={{ display: subAba === "alunos" ? "block" : "none" }}
      >
        <section className="adm-secao-conteudo">
          {/* Controles de Busca e Filtro de Sala */}
          <div className="adm-filtros-linha">
            <div className="adm-busca-campo">
              <input
                type="search"
                className="input-texto"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, sala ou usuário GitHub..."
              />
            </div>

            <div className="adm-seletor-sala">
              <select
                className="input-select"
                value={salaFiltro}
                onChange={(e) => setSalaFiltro(e.target.value)}
              >
                <option value="todas">Todas as salas ({alunos.length})</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro vindo do card de sala — diz o que está escondido e como sair */}
          {regraAtiva ? (
            <div className="adm-filtro-ativo">
              <span>
                Mostrando <strong>{alunosFiltrados.length}</strong>{" "}
                {alunosFiltrados.length === 1 ? "aluno" : "alunos"} {regraAtiva}
                {salaAtiva ? ` em ${salaAtiva}` : ""}.
              </span>
              <button type="button" onClick={() => setLacuna(null)}>
                Limpar filtro
              </button>
            </div>
          ) : null}

          {/* O código aparece UMA vez: o banco guarda só o hash. Se o ADM
              fechar a tela antes de passar para o aluno, emite outro. */}
          {estadoCodigo.codigo ? (
            <div className="adm-codigo-ativacao" role="status">
              <IconeChave tamanho={18} />
              <div>
                <strong>Código de {estadoCodigo.paraQuem}</strong>
                <code className="adm-codigo-valor">{estadoCodigo.codigo}</code>
                <span className="dica-campo">
                  Vale uma vez, por 7 dias. Anote agora e passe para o aluno — ele não
                  aparece de novo.
                </span>
              </div>
            </div>
          ) : null}

          {estadoCodigo.mensagem ? (
            <p className="recado recado-erro" role="alert">
              {estadoCodigo.mensagem}
            </p>
          ) : null}

          {/* Tabela Administrativa de Alunos */}
          <div className="tabela-container adm-tabela-wrap">
            <table className="tabela-alunos">
              <thead>
                <tr>
                  <th scope="col">Estudante</th>
                  <th scope="col">Sala</th>
                  <th scope="col">Redes</th>
                  <th scope="col">Fixar no Topo</th>
                  <th scope="col">Destaque ADM</th>
                  <th scope="col">Moderação</th>
                  <th scope="col" style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem" }}>
                      <p style={{ margin: 0, color: "var(--dim)" }}>
                        Nenhum estudante encontrado para os filtros selecionados.
                      </p>
                    </td>
                  </tr>
                ) : (
                  alunosFiltrados.map((a) => (
                    <tr key={a.id} className="tabela-linha" style={{ ["--sala-cor" as string]: a.cor }}>
                      <td>
                        <div className="tabela-aluno-celula">
                          <Avatar
                            nome={a.nome}
                            foto={a.foto_url}
                            className="mini-avatar"
                            style={{
                              background: `color-mix(in srgb, ${a.cor} 25%, var(--surface-2))`,
                              border: `1.5px solid ${a.cor}`,
                            }}
                          />
                          <div>
                            <span className="tabela-aluno-nome-btn" style={{ cursor: "default" }}>
                              {a.nome}
                            </span>
                            {!a.aprovado ? (
                              <span className="pill-pendente">Aguardando aprovação</span>
                            ) : null}
                            {a.bio ? <p className="tabela-aluno-bio">{a.bio}</p> : null}
                          </div>
                        </div>
                      </td>

                      {/* Sala: o pill diz a turma, o form é quem troca. O aluno
                          não move a si mesmo — quem manda aqui é o ADM. */}
                      <td>
                        <form action={mudarSalaDoAluno} className="adm-form-sala">
                          {a.sala ? (
                            <span className="cracha-sala-pill" style={{ borderColor: a.corSala }}>
                              <span className="ponto" style={{ background: a.corSala }} />
                              {a.sala}
                            </span>
                          ) : (
                            <span className="tabela-sem-dado">—</span>
                          )}
                          <input type="hidden" name="alunoId" value={a.id} />
                          {/* `required` + `minLength` porque a action recusa
                              calada: `mudarSalaDoAluno` tem
                              `if (!alunoId || nomeSala.length < 2) return;` e
                              devolve `void`, então o clique no "Mover" com o
                              campo vazio não fazia NADA — sem aviso, sem erro,
                              e quem clicou conclui que travou. Quem recusa antes
                              do envio é o navegador, que explica o motivo.
                              O piso é o mesmo da action (2 caracteres); ele
                              conta a string crua, então um valor como " A" ainda
                              passa daqui e morre no servidor — o servidor segue
                              sendo a autoridade. */}
                          <input
                            type="text"
                            name="sala"
                            className="input-texto adm-input-sala"
                            placeholder="Nova turma"
                            maxLength={30}
                            required
                            minLength={2}
                            /* `minLength` conta a string crua: " A " o passa e
                               chega no servidor, que faz `.trim()` e devolve em
                               silêncio — clique morto, que é o defeito que o
                               `minLength` veio fechar. O `pattern` exige dois
                               caracteres que não sejam espaço, que é a regra de
                               `mudarSalaDoAluno`. */
                            pattern="\s*\S[\s\S]*\S\s*"
                            aria-label={`Trocar a turma de ${a.nome}`}
                          />
                          <button type="submit" className="btn-acao-tabela" title="Mover de turma">
                            <span>Mover</span>
                          </button>
                        </form>
                      </td>

                      <td>
                        <div className="adm-redes-inline">
                          <BadgeLinkedIn url={a.linkedin} nomeAluno={a.nome} />
                          <BadgeGitHub username={a.github} nomeAluno={a.nome} />
                          {!a.linkedin && !a.github ? <span className="tabela-sem-dado">—</span> : null}
                        </div>
                      </td>

                      {/* Botão de Fixar com Server Action nativa */}
                      <td>
                        <form action={alternar}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="campo" value="fixado" />
                          <button
                            type="submit"
                            className={`btn-toggle-badge ${a.fixado ? "toggle-ativo" : ""}`}
                            title="Fixar no topo da lista"
                          >
                            <IconeCheck tamanho={13} />
                            <span>{a.fixado ? "Fixado" : "Fixar"}</span>
                          </button>
                        </form>
                      </td>

                      {/* Botão de Destaque com Server Action nativa */}
                      <td>
                        <form action={alternar}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="campo" value="destaque" />
                          <button
                            type="submit"
                            className={`btn-toggle-badge ${a.destaque ? "toggle-destaque-ativo" : ""}`}
                            title="Destacar com estrela de recomendação do Super ADM"
                          >
                            <IconeEstrela preenchida={a.destaque} tamanho={13} />
                            <span>{a.destaque ? "Destaque" : "Destacar"}</span>
                          </button>
                        </form>
                      </td>

                      {/* Moderação: o auto-cadastro nasce `aprovado: false` e é
                          aqui que o ADM despacha a fila. Desaprovar é o
                          "tirar do ar" — mais brando que remover o aluno. */}
                      <td>
                        <form action={aprovarAluno}>
                          <input type="hidden" name="id" value={a.id} />
                          <button
                            type="submit"
                            className={`btn-toggle-badge ${a.aprovado ? "" : "toggle-pendente-ativo"}`}
                            title={
                              a.aprovado
                                ? "Tira o perfil da vitrine até aprovar de novo"
                                : "Libera o perfil na vitrine"
                            }
                          >
                            <span>{a.aprovado ? "Aprovado" : "Aprovar"}</span>
                          </button>
                        </form>
                      </td>

                      {/* Ações: Ver Crachá / Remover */}
                      <td>
                        <div className="adm-linha-acoes-wrap">
                          <button
                            type="button"
                            className="btn-acao-tabela"
                            onClick={() => onAbrirCracha(a)}
                            title="Abrir crachá digital 3D"
                          >
                            <IconeCracha tamanho={14} />
                          </button>

                          {/* Só para quem ainda não tem login. Emitir código de
                              quem já tem trocaria a senha em uso por um código,
                              deixando o aluno de fora até resgatar. */}
                          {!comAcessoSet.has(a.id) ? (
                            <form action={formCodigo}>
                              <input type="hidden" name="alunoId" value={a.id} />
                              <button
                                type="submit"
                                className="btn-acao-tabela"
                                title="Gerar código de ativação para este aluno"
                                disabled={emitindoCodigo}
                              >
                                <IconeChave tamanho={14} />
                              </button>
                            </form>
                          ) : null}

                          <form
                            action={removerAluno}
                            onSubmit={(e) => {
                              if (!confirm(`Tem certeza que deseja excluir ${a.nome}? Esta ação é irreversível.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              className="btn-acao-tabela btn-perigo-tabela"
                              title="Excluir estudante"
                            >
                              <IconeLixeira tamanho={14} />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Sub-Aba 2: Importação em Massa de Planilha */}
      <div
        id="adm-painel-importar"
        role="tabpanel"
        aria-labelledby="adm-tab-importar"
        style={{ display: subAba === "importar" ? "block" : "none" }}
      >
        <section className="adm-secao-conteudo">
          <div className="painel-card">
            <header className="painel-card-topo">
              <h3>Importar Lista de Estudantes da Planilha</h3>
              <p>Cole diretamente as linhas do Excel ou Google Sheets para sincronização em massa</p>
            </header>

            <form action={formImportar} className="formulario-corpo">
              <label className="campo-form">
                <span className="label-texto">Conteúdo da Planilha (Colunas: Nome, Sala, LinkedIn, GitHub)</span>
                <textarea
                  name="lista"
                  className="input-textarea"
                  rows={8}
                  placeholder={`Exemplo de colagem:\nLucas Albuquerque\t3ºB · Robótica FLL\thttps://linkedin.com/in/lucas-albuquerque\tlucas-bot\nEnzo Cavalcanti\t3ºB · Robótica FLL\t\tenzoc-dev\nManuela Ribeiro\tDSM3\thttps://linkedin.com/in/manuela-ribeiro\t`}
                  required
                />
              </label>

              {estadoImportar.mensagem ? (
                <div className={`alerta-banner alerta-${tomImportar}`} role="alert">
                  {tomImportar === "sucesso" ? <IconeCheck tamanho={16} /> : null}
                  <span>{estadoImportar.mensagem}</span>
                </div>
              ) : null}

              {estadoImportar.erros && estadoImportar.erros.length > 0 ? (
                <div className="erros-importacao-lista">
                  <h4>Avisos encontrados durante a leitura:</h4>
                  <ul>
                    {estadoImportar.erros.map((err, i) => (
                      <li key={i}>
                        Linha {err.linha}: {err.motivo} (<code>{err.texto}</code>)
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="form-acoes-fim">
                <button
                  type="submit"
                  className="botao botao-primario"
                  disabled={importando}
                >
                  <IconeUpload tamanho={16} />
                  <span>{importando ? "Processando e Importando..." : "Importar Turma Agora"}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Sub-Aba 3: Cadastrar Aluno Individual */}
      <div
        id="adm-painel-novo"
        role="tabpanel"
        aria-labelledby="adm-tab-novo"
        style={{ display: subAba === "novo" ? "block" : "none" }}
      >
        <section className="adm-secao-conteudo">
          <div className="painel-card">
            <header className="painel-card-topo">
              <h3>Cadastrar Novo Estudante Individualmente</h3>
              <p>Insira manualmente um aluno para adicionar à respectiva sala</p>
            </header>

            <form action={formCriar} className="formulario-corpo">
              <div className="form-dupla">
                <label className="campo-form">
                  <span className="label-texto">Nome do Aluno *</span>
                  <input
                    type="text"
                    name="nome"
                    className="input-texto"
                    placeholder="Nome completo do estudante"
                    required
                  />
                </label>

                <label className="campo-form">
                  <span className="label-texto">Sala / Turma *</span>
                  <input
                    type="text"
                    name="sala"
                    className="input-texto"
                    list="salas-sugestoes"
                    placeholder="Ex: DSM3 ou 3ºB · Robótica FLL"
                    required
                  />
                  <datalist id="salas-sugestoes">
                    {salas.map((s) => (
                      <option key={s.id} value={s.nome} />
                    ))}
                  </datalist>
                </label>
              </div>

              <div className="form-dupla">
                <label className="campo-form">
                  <span className="label-texto">Perfil LinkedIn</span>
                  <input
                    type="text"
                    name="linkedin"
                    className="input-texto"
                    placeholder="https://linkedin.com/in/..."
                  />
                </label>

                <label className="campo-form">
                  <span className="label-texto">Usuário GitHub</span>
                  <input
                    type="text"
                    name="github"
                    className="input-texto"
                    placeholder="usuario ou link github.com/..."
                  />
                </label>
              </div>

              <label className="campo-form">
                <span className="label-texto">Bio / Apresentação Inicial</span>
                <textarea
                  name="bio"
                  className="input-textarea"
                  rows={3}
                  placeholder="Foco de aprendizado e tecnologias que estuda..."
                />
              </label>

              {estadoCriar.mensagem ? (
                <div
                  className={`alerta-banner ${estadoCriar.ok ? "alerta-sucesso" : "alerta-erro"}`}
                  role="alert"
                >
                  {estadoCriar.ok ? <IconeCheck tamanho={16} /> : null}
                  <span>{estadoCriar.mensagem}</span>
                </div>
              ) : null}

              <div className="form-acoes-fim">
                <button
                  type="submit"
                  className="botao botao-primario"
                  disabled={criando}
                >
                  <IconePlus tamanho={16} />
                  <span>{criando ? "Salvando Aluno..." : "Cadastrar Estudante"}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Sub-Aba 4: Salas & Turmas */}
      <div
        id="adm-painel-salas"
        role="tabpanel"
        aria-labelledby="adm-tab-salas"
        style={{ display: subAba === "salas" ? "block" : "none" }}
      >
        <section className="adm-secao-conteudo">
          <div className="painel-card">
            <header className="painel-card-topo">
              <h3>Salas e Turmas Registradas ({salas.length})</h3>
              <p>Organização pedagógica por turmas no catálogo institucional SESI</p>
            </header>

            <div className="salas-grid-cards">
              {salas.map((s) => {
                const alunosDaSala = alunos.filter((a) => a.sala_id === s.id || a.sala === s.nome);
                return (
                  <div key={s.id} className="sala-card-adm">
                    <div className="sala-card-topo">
                      <span className="sala-cor-circulo" />
                      <h4 className="sala-card-nome">{s.nome}</h4>
                    </div>
                    <div className="sala-card-dados">
                      <span className="sala-contador-badge">
                        {alunosDaSala.length} {alunosDaSala.length === 1 ? "aluno" : "alunos"}
                      </span>
                      <span className="sala-redes-contagem">
                        {alunosDaSala.filter((a) => a.linkedin || a.github).length} com redes
                      </span>
                    </div>

                    {/* A lacuna só aparece quando existe: "0 sem LinkedIn" é
                        ruído, e o que o ADM quer saber é onde falta o quê. */}
                    {(() => {
                      const abertas = contarLacunas(alunosDaSala).filter((l) => l.quantos > 0);

                      if (abertas.length === 0) {
                        return (
                          <p className="sala-lacuna-ok">
                            {alunosDaSala.length === 0
                              ? "Turma sem alunos cadastrados."
                              : "Turma completa: todos com LinkedIn, GitHub e bio."}
                          </p>
                        );
                      }

                      return (
                        <div className="sala-lacunas">
                          {abertas.map((l) => (
                            <button
                              key={l.chave}
                              type="button"
                              className="sala-lacuna-btn"
                              onClick={() => abrirLacuna(s.id, l.chave)}
                              aria-label={`Ver os ${l.quantos} alunos de ${s.nome} ${ROTULO_LACUNA[l.chave]}`}
                            >
                              {l.quantos} {ROTULO_LACUNA[l.chave]}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Sub-Aba 5: Desafios do Mural */}
      <div
        id="adm-painel-desafios"
        role="tabpanel"
        aria-labelledby="adm-tab-desafios"
        style={{ display: subAba === "desafios" ? "block" : "none" }}
      >
        <section className="adm-secao-conteudo">
          {/* A fila vem antes do formulário: julgar envio é rotina, publicar
              desafio é raro. O que o ADM abre esta aba para fazer fica no topo. */}
          <div className="painel-card">
            <header className="painel-card-topo">
              <h3>Envios dos alunos ({submissoes.length})</h3>
              <p>
                {pendentes.length > 0
                  ? `${pendentes.length} esperando decisão.`
                  : "Nenhum envio esperando decisão."}
              </p>
            </header>

            {submissoes.length === 0 ? (
              <p className="adm-desafios-vazio">
                Nenhum aluno enviou projeto ainda. O envio acontece no mural, dentro do
                CRM do aluno.
              </p>
            ) : (
              <div className="tabela-container">
                <table className="tabela-alunos">
                  <thead>
                    <tr>
                      <th scope="col">Aluno</th>
                      <th scope="col">Desafio</th>
                      <th scope="col">Projeto</th>
                      <th scope="col">Enviado</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissoes.map((s) => (
                      <tr key={s.id}>
                        <td>{s.alunoNome}</td>
                        <td>{s.desafioTitulo || "—"}</td>
                        <td>
                          <span className="adm-desafios-projeto">{s.tituloProjeto}</span>
                          {s.linkProjeto ? (
                            <a
                              href={s.linkProjeto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="adm-desafios-link"
                            >
                              abrir
                            </a>
                          ) : null}
                        </td>
                        <td>{dataCurta(s.criadoEm) ?? "—"}</td>
                        <td>
                          <span
                            className={`adm-desafios-status ${
                              s.aprovado === true
                                ? "adm-desafios-aprovado"
                                : s.aprovado === false
                                  ? "adm-desafios-rejeitado"
                                  : "adm-desafios-pendente"
                            }`}
                          >
                            {s.aprovado === true
                              ? "Aprovado"
                              : s.aprovado === false
                                ? "Rejeitado"
                                : "Pendente"}
                          </span>
                        </td>
                        <td>
                          {/* Um botão por decisão, cada um escondido quando ela
                              já é a dele: com o tri-estado o ADM pode voltar
                              atrás (rejeitar um aprovado, aprovar um
                              rejeitado), e um botão único de rótulo invertido
                              ficaria ambíguo em três estados. */}
                          <div className="adm-desafios-decidir">
                            {s.aprovado !== true ? (
                              <form action={decidirSubmissaoAction}>
                                <input type="hidden" name="submissaoId" value={s.id} />
                                <button
                                  type="submit"
                                  name="decisao"
                                  value="aprovar"
                                  className="botao botao-fraco"
                                >
                                  Aprovar
                                </button>
                              </form>
                            ) : null}
                            {s.aprovado !== false ? (
                              <form action={decidirSubmissaoAction}>
                                <input type="hidden" name="submissaoId" value={s.id} />
                                <button
                                  type="submit"
                                  name="decisao"
                                  value="rejeitar"
                                  className="botao botao-fraco"
                                >
                                  Rejeitar
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <details className="painel-card adm-desafios-publicar">
            <summary>Publicar um desafio novo</summary>

            <form action={formDesafio} className="adm-desafios-form">
              {estadoDesafio.mensagem ? (
                <p
                  className={`recado ${estadoDesafio.ok ? "recado-ok" : "recado-erro"}`}
                  role="alert"
                >
                  {estadoDesafio.mensagem}
                </p>
              ) : null}

              <div className="linha-campos">
                <div className="campo">
                  <label htmlFor="dft-titulo">Título</label>
                  <input
                    id="dft-titulo"
                    name="titulo"
                    type="text"
                    required
                    maxLength={MAX_TITULO}
                    placeholder="Ex.: Robô Seguidor de Linha"
                  />
                </div>
                <div className="campo">
                  <label htmlFor="dft-categoria">Categoria</label>
                  <select id="dft-categoria" name="categoria" required defaultValue={CATEGORIAS[0]}>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="campo">
                <label htmlFor="dft-subtitulo">Subtítulo do card</label>
                <input
                  id="dft-subtitulo"
                  name="subtitulo"
                  type="text"
                  required
                  maxLength={MAX_SUBTITULO}
                  placeholder="Uma linha dizendo o que o aluno vai construir"
                />
              </div>

              <div className="linha-campos">
                <div className="campo">
                  <label htmlFor="dft-prazo">Prazo</label>
                  <input
                    id="dft-prazo"
                    name="prazo"
                    type="text"
                    required
                    maxLength={MAX_PRAZO}
                    placeholder="10/11/2026"
                  />
                  <span className="dica-campo">Texto livre: cabe uma data ou um período.</span>
                </div>
                <div className="campo">
                  <label htmlFor="dft-recompensa">Recompensa</label>
                  <input
                    id="dft-recompensa"
                    name="recompensa"
                    type="text"
                    required
                    maxLength={MAX_RECOMPENSA}
                    placeholder="Ex.: Insígnia de Engenharia"
                  />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="dft-descricao">Descrição</label>
                <textarea
                  id="dft-descricao"
                  name="descricao"
                  required
                  rows={3}
                  maxLength={MAX_DESCRICAO}
                  placeholder="O que o aluno precisa fazer e com que tecnologias"
                />
              </div>

              <div className="campo">
                <label htmlFor="dft-criterios">Critérios de avaliação</label>
                <textarea
                  id="dft-criterios"
                  name="criterios"
                  required
                  rows={4}
                  placeholder={"Um por linha. Ex.:\nPercurso completo sem sair da pista\nCódigo comentado"}
                />
                <span className="dica-campo">
                  Um critério por linha, até {MAX_CRITERIOS}. Linha em branco é ignorada.
                </span>
              </div>

              <button type="submit" className="botao botao-primario" disabled={publicando}>
                {publicando ? "Publicando..." : "Publicar no mural"}
              </button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
