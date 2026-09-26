"use client";

import { useState } from "react";
import { importarReposGithubAction } from "@/app/acoes-crm";
import { IconeGitHub } from "@/components/RedesBadges";
import {
  descricaoDoRepo,
  quandoDoRepo,
  tituloDoRepo,
  type RepoGithub,
} from "@/lib/github";
import { MAX_PROJETOS } from "@/lib/limites";
import type { ProjetoAluno } from "@/lib/tipos";

type Props = {
  /** O handle já salvo no perfil — poupa o aluno de digitar de novo. */
  handleInicial: string;
  projetos: ProjetoAluno[];
  onImportar: (novos: ProjetoAluno[]) => { adicionados: number; ignorados: number };
};

/**
 * Traz os repositórios públicos do GitHub como projetos, em vez de digitar.
 *
 * Fica num arquivo próprio, e não dentro de `PaginaMeuPerfil.tsx`, porque aquele
 * componente já passa de mil linhas e só cresce; aqui tem estado próprio (busca,
 * seleção) que não interessa a mais ninguém.
 *
 * A gravação continua sendo a de sempre: o que isto devolve vira item da lista
 * de projetos em memória, e quem persiste é o `salvarPerfilAction` no submit do
 * formulário, passando pelo `sanitizarProjetos`. Nada aqui escreve no banco —
 * se o aluno fechar a página sem salvar, não importou nada.
 */
export function ImportarGithub({ handleInicial, projetos, onImportar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [handle, setHandle] = useState(handleInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoGithub[]>([]);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [resumo, setResumo] = useState<string | null>(null);

  const jaImportados = new Set(
    projetos.map((p) => p.link).filter((l): l is string => Boolean(l)),
  );

  const vagas = Math.max(0, MAX_PROJETOS - projetos.length);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    setResumo(null);
    const resultado = await importarReposGithubAction(handle);
    setCarregando(false);

    if (!resultado.ok || !resultado.repos) {
      setErro(resultado.mensagem ?? "Não consegui buscar os repositórios.");
      setRepos([]);
      setSelecionados([]);
      return;
    }

    setRepos(resultado.repos);
    // Vem tudo marcado: o aluno quer quase todos, e desmarcar um é mais rápido
    // que marcar nove.
    setSelecionados(resultado.repos.map((r) => r.id));
  }

  function alternar(id: number) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function adicionar() {
    const escolhidos = repos.filter((r) => selecionados.includes(r.id));
    const novos: ProjetoAluno[] = escolhidos
      .filter((r) => !jaImportados.has(r.url))
      .map((r) => ({
        id: `gh_${r.id}`,
        titulo: tituloDoRepo(r.nome),
        descricao: descricaoDoRepo(r),
        link: r.url,
      }));

    if (novos.length === 0) {
      setErro("Os repositórios que você marcou já estão nos seus projetos.");
      return;
    }

    const { adicionados, ignorados } = onImportar(novos);
    setErro(null);
    setResumo(
      ignorados > 0
        ? `${adicionados} entraram. ${ignorados} não couberam: o perfil aceita ${MAX_PROJETOS} projetos e você já tem ${projetos.length}.`
        : `${adicionados} projeto(s) adicionado(s). Confira a lista e clique em salvar para gravar.`,
    );
    setAberto(false);
    setRepos([]);
    setSelecionados([]);
  }

  if (!aberto) {
    return (
      <div className="gh-importar">
        <button type="button" className="btn-acao-rapida" onClick={() => setAberto(true)}>
          <IconeGitHub tamanho={15} /> Importar do GitHub
        </button>
        {resumo ? <p className="gh-importar-resumo">{resumo}</p> : null}
      </div>
    );
  }

  return (
    <div className="painel-card gh-importar">
      <header className="painel-card-topo">
        <h3>Importar do GitHub</h3>
        <p>
          Puxa os repositórios públicos do seu perfil e transforma em projetos. Você escolhe
          quais entram — e nada é gravado até você salvar o perfil.
        </p>
      </header>

      <div className="formulario-corpo">
        <label className="campo-form">
          <span className="label-texto">Usuário do GitHub</span>
          <input
            type="text"
            className="input-texto"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="theopadilha2009-hash"
            autoComplete="off"
            spellCheck={false}
            disabled={carregando}
          />
        </label>

        <div className="gh-importar-acoes">
          <button
            type="button"
            className="btn-acao-rapida"
            onClick={buscar}
            disabled={carregando || !handle.trim()}
          >
            {carregando ? "Buscando..." : "Buscar repositórios"}
          </button>
          <button
            type="button"
            className="btn-limpar-preview"
            onClick={() => {
              setAberto(false);
              setErro(null);
              setResumo(null);
              setRepos([]);
            }}
            disabled={carregando}
          >
            Cancelar
          </button>
        </div>

        {erro ? <p className="gh-importar-erro" role="alert">{erro}</p> : null}

        {repos.length > 0 ? (
          <>
            <p className="gh-importar-nota">
              {repos.length} repositório(s) público(s) encontrado(s), sem contar os forks.
              {vagas === 0
                ? ` Seus ${MAX_PROJETOS} projetos já estão ocupados — remova um para abrir espaço.`
                : ` Cabe${vagas === 1 ? "" : "m"} mais ${vagas} no perfil.`}
            </p>

            <div className="gh-lista-repos">
              {repos.map((r) => {
                const marcado = selecionados.includes(r.id);
                const repetido = jaImportados.has(r.url);
                return (
                  <label
                    key={r.id}
                    className={`gh-repo ${marcado ? "gh-repo-marcado" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(r.id)}
                    />
                    <span className="gh-repo-dados">
                      <b>
                        {tituloDoRepo(r.nome)}
                        {repetido ? <span className="gh-repo-tag">já no perfil</span> : null}
                      </b>
                      <span className="gh-repo-desc">{descricaoDoRepo(r)}</span>
                      <span className="gh-repo-meta">
                        {[r.linguagem, r.estrelas > 0 ? `${r.estrelas} ★` : null, quandoDoRepo(r.atualizadoEm)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-acao-rapida"
              onClick={adicionar}
              disabled={selecionados.length === 0}
            >
              Adicionar {selecionados.length} selecionado(s)
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
