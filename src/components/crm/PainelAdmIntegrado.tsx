"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { alternar, aprovarAluno, criarAluno, importarLista, mudarSalaDoAluno, removerAluno } from "@/app/adm/acoes";
import { ESTADO_INICIAL, type Estado } from "@/app/adm/estado";
import {
  IconeCheck,
  IconeCopiar,
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
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  alunos: AlunoNaTela[];
  salas: { id: string; nome: string }[];
  onAbrirCracha: (aluno: AlunoNaTela) => void;
  onSelecionarAluno?: (aluno: AlunoNaTela) => void;
};

export function PainelAdmIntegrado({ alunos, salas, onAbrirCracha, onSelecionarAluno }: Props) {
  const [subAba, setSubAba] = useState<"alunos" | "importar" | "novo" | "salas">("alunos");
  const [busca, setBusca] = useState("");
  const [salaFiltro, setSalaFiltro] = useState<string>("todas");

  // Ações de formulário com useActionState
  const [estadoImportar, formImportar, importando] = useActionState(importarLista, ESTADO_INICIAL);
  const [estadoCriar, formCriar, criando] = useActionState(criarAluno, ESTADO_INICIAL);

  // Alunos filtrados no painel
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((a) => {
      const matchBusca =
        !busca.trim() ||
        a.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (a.sala && a.sala.toLowerCase().includes(busca.toLowerCase())) ||
        (a.github && a.github.toLowerCase().includes(busca.toLowerCase()));
      const matchSala = salaFiltro === "todas" || a.sala_id === salaFiltro || a.sala === salaFiltro;
      return matchBusca && matchSala;
    });
  }, [alunos, busca, salaFiltro]);

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
                            <span className="cracha-sala-pill" style={{ borderColor: a.cor }}>
                              <span className="ponto" style={{ background: a.cor }} />
                              {a.sala}
                            </span>
                          ) : (
                            <span className="tabela-sem-dado">—</span>
                          )}
                          <input type="hidden" name="alunoId" value={a.id} />
                          <input
                            type="text"
                            name="sala"
                            className="input-texto adm-input-sala"
                            placeholder="Nova turma"
                            maxLength={30}
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
                <div
                  className={`alerta-banner ${estadoImportar.ok ? "alerta-sucesso" : "alerta-erro"}`}
                  role="alert"
                >
                  {estadoImportar.ok ? <IconeCheck tamanho={16} /> : null}
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
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
