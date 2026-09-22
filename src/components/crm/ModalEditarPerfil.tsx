"use client";

import { useActionState, useState } from "react";
import { salvarPerfilAction } from "@/app/acoes-crm";
import { iniciais } from "@/lib/links";
import type { AlunoNaTela, MidiaAluno, ProjetoAluno, UsuarioSessao } from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunoAtual: AlunoNaTela | null;
  onFechar: () => void;
  onPerfilSalvo?: () => void;
};

export function ModalEditarPerfil({ usuario, alunoAtual, onFechar }: Props) {
  const [estado, formAction, carregando] = useActionState(salvarPerfilAction, { ok: false });

  // Lista de mídias (Imagens e GIFs)
  const [midias, setMidias] = useState<MidiaAluno[]>(
    alunoAtual?.midias && Array.isArray(alunoAtual.midias) ? alunoAtual.midias : [],
  );
  const [novaMidiaUrl, setNovaMidiaUrl] = useState("");
  const [novaMidiaTipo, setNovaMidiaTipo] = useState<"imagem" | "gif">("imagem");
  const [novaMidiaLegenda, setNovaMidiaLegenda] = useState("");

  // Lista de projetos / criações
  const [projetos, setProjetos] = useState<ProjetoAluno[]>(
    alunoAtual?.projetos && Array.isArray(alunoAtual.projetos) ? alunoAtual.projetos : [],
  );
  const [novoProjTitulo, setNovoProjTitulo] = useState("");
  const [novoProjDesc, setNovoProjDesc] = useState("");
  const [novoProjLink, setNovoProjLink] = useState("");
  const [novoProjImg, setNovoProjImg] = useState("");

  function adicionarMidia() {
    const url = novaMidiaUrl.trim();
    if (!url) return;

    // Detecta se é GIF automaticamente pela extensão
    const tipo = url.toLowerCase().includes(".gif") ? "gif" : novaMidiaTipo;

    setMidias((prev) => [
      ...prev,
      { url, tipo, legenda: novaMidiaLegenda.trim() || undefined },
    ]);
    setNovaMidiaUrl("");
    setNovaMidiaLegenda("");
  }

  function removerMidia(index: number) {
    setMidias((prev) => prev.filter((_, i) => i !== index));
  }

  function adicionarProjeto() {
    const titulo = novoProjTitulo.trim();
    if (!titulo) return;

    const novo: ProjetoAluno = {
      id: `proj-${Date.now()}`,
      titulo,
      descricao: novoProjDesc.trim(),
      link: novoProjLink.trim() || undefined,
      imagem: novoProjImg.trim() || undefined,
    };

    setProjetos((prev) => [...prev, novo]);
    setNovoProjTitulo("");
    setNovoProjDesc("");
    setNovoProjLink("");
    setNovoProjImg("");
  }

  function removerProjeto(id: string) {
    setProjetos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="modal-backdrop" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="modal-drawer-perfil" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-topo">
          <div className="drawer-topo-info">
            <span className="avatar drawer-avatar">
              {iniciais(alunoAtual?.nome ?? usuario.nome ?? usuario.username)}
            </span>
            <div>
              <h2>Personalizar Meu Perfil</h2>
              <span className="drawer-sub">
                É assim que os outros estudantes e recrutadores verão seu portfólio.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="drawer-fechar"
            onClick={onFechar}
            aria-label="Fechar edição"
          >
            ✕
          </button>
        </header>

        <form action={formAction} className="drawer-corpo">
          {estado.mensagem ? (
            <p
              className={`recado ${estado.ok ? "recado-ok" : "recado-erro"}`}
              role="alert"
            >
              {estado.mensagem}
            </p>
          ) : null}

          {/* Dados Principais */}
          <section className="drawer-secao">
            <h3 className="secao-titulo">👤 Identificação Básica</h3>

            <div className="linha-campos">
              <div className="campo">
                <label htmlFor="ed-nome">Nome Completo</label>
                <input
                  id="ed-nome"
                  name="nome"
                  type="text"
                  defaultValue={alunoAtual?.nome ?? usuario.nome ?? "Telor de Espadilha"}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="ed-sala">Sala / Turma</label>
                <input
                  id="ed-sala"
                  name="sala"
                  type="text"
                  defaultValue={alunoAtual?.sala ?? usuario.sala ?? "DSM3"}
                  placeholder="Ex.: DSM3, 3ºB Robótica"
                  required
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="ed-bio">Bio & Apresentação Profissional</label>
              <textarea
                id="ed-bio"
                name="bio"
                rows={3}
                defaultValue={alunoAtual?.bio ?? ""}
                placeholder="Fale um pouco sobre o que você cria, programa ou desenvolve..."
              />
            </div>
          </section>

          {/* Redes & Contatos (LinkedIn, GitHub, Instagram, etc) */}
          <section className="drawer-secao">
            <h3 className="secao-titulo">🌐 Redes & Conexões</h3>

            <div className="linha-campos">
              <div className="campo">
                <label htmlFor="ed-in">LinkedIn</label>
                <input
                  id="ed-in"
                  name="linkedin"
                  type="text"
                  defaultValue={alunoAtual?.linkedin ?? ""}
                  placeholder="https://linkedin.com/in/seuperfil"
                />
              </div>

              <div className="campo">
                <label htmlFor="ed-gh">GitHub</label>
                <input
                  id="ed-gh"
                  name="github"
                  type="text"
                  defaultValue={alunoAtual?.github ?? ""}
                  placeholder="Seu @ no GitHub"
                />
              </div>

              <div className="campo">
                <label htmlFor="ed-ig">Instagram (Extra)</label>
                <input
                  id="ed-ig"
                  name="instagram"
                  type="text"
                  defaultValue={alunoAtual?.instagram ?? ""}
                  placeholder="@seuinstagram"
                />
              </div>
            </div>
          </section>

          {/* Espaço para Imagens e GIFs com moderação educacional segura */}
          <section className="drawer-secao">
            <div className="secao-cabecalho-com-alerta">
              <div>
                <h3 className="secao-titulo">🖼️ Espaço para Imagens e GIFs</h3>
                <span className="secao-desc">
                  Mostre capturas, protótipos, GIFs de robôs ou animações dos seus projetos.
                </span>
              </div>
            </div>

            {/* Aviso de Moderação Escolar Seguro */}
            <div className="alerta-escola-segura">
              <span className="alerta-icone">🛡️</span>
              <div className="alerta-texto">
                <b>Diretriz de Segurança Escolar SESI (Classificação Livre)</b>
                <span>
                  Permitidos apenas projetos técnicos, robótica, prints educativos e criações
                  adequadas para todas as idades escolares (estritamente livre de violência, conteúdo
                  adulto ou jogos de aposta).
                </span>
              </div>
            </div>

            {/* Adicionar Mídia */}
            <div className="linha-add-midia">
              <input
                type="url"
                value={novaMidiaUrl}
                onChange={(e) => setNovaMidiaUrl(e.target.value)}
                placeholder="Cole a URL da Imagem ou GIF (ex: https://.../animacao.gif)"
                className="input-flex"
              />
              <select
                value={novaMidiaTipo}
                onChange={(e) => setNovaMidiaTipo(e.target.value as "imagem" | "gif")}
                className="select-tipo"
              >
                <option value="imagem">Imagem</option>
                <option value="gif">GIF</option>
              </select>
              <input
                type="text"
                value={novaMidiaLegenda}
                onChange={(e) => setNovaMidiaLegenda(e.target.value)}
                placeholder="Legenda do projeto..."
                className="input-legenda"
              />
              <button
                type="button"
                className="botao botao-fraco btn-adicionar"
                onClick={adicionarMidia}
              >
                + Adicionar
              </button>
            </div>

            {/* Galeria de Mídias Cadastradas */}
            {midias.length > 0 ? (
              <div className="grade-previa-midias">
                {midias.map((m, idx) => (
                  <div key={idx} className="card-midia-preview">
                    <img src={m.url} alt={m.legenda || "Mídia do portfólio"} />
                    <span className="badge-tipo-midia">{m.tipo.toUpperCase()}</span>
                    {m.legenda ? <span className="legenda-midia">{m.legenda}</span> : null}
                    <button
                      type="button"
                      className="btn-remover-midia"
                      onClick={() => removerMidia(idx)}
                      title="Remover mídia"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="texto-vazio-secao">Nenhuma imagem ou GIF adicionado ainda.</p>
            )}

            {/* Input oculto com JSON serializado */}
            <input type="hidden" name="midias" value={JSON.stringify(midias)} />
          </section>

          {/* Criações & Projetos da Escola */}
          <section className="drawer-secao">
            <h3 className="secao-titulo">🚀 Criações & Projetos do Estudante</h3>
            <span className="secao-desc">
              Projetos de robótica, desenvolvimento web, circuitos e feiras que você criou.
            </span>

            {/* Adicionar Projeto */}
            <div className="bloco-novo-projeto">
              <div className="linha-campos">
                <div className="campo">
                  <label>Título do Projeto</label>
                  <input
                    type="text"
                    value={novoProjTitulo}
                    onChange={(e) => setNovoProjTitulo(e.target.value)}
                    placeholder="Ex.: Robô Autônomo Seguidor de Linha"
                  />
                </div>
                <div className="campo">
                  <label>Link do Projeto (GitHub ou Demonstração)</label>
                  <input
                    type="url"
                    value={novoProjLink}
                    onChange={(e) => setNovoProjLink(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              <div className="campo">
                <label>Descrição do que você construiu</label>
                <input
                  type="text"
                  value={novoProjDesc}
                  onChange={(e) => setNovoProjDesc(e.target.value)}
                  placeholder="Ex.: Desenvolvido com Arduino e PID na equipe de robótica SESI."
                />
              </div>

              <div className="campo">
                <label>URL da Imagem de Capa do Projeto (Opcional)</label>
                <input
                  type="url"
                  value={novoProjImg}
                  onChange={(e) => setNovoProjImg(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <button
                type="button"
                className="botao botao-fraco btn-adicionar-proj"
                onClick={adicionarProjeto}
              >
                + Incluir Criação no Portfólio
              </button>
            </div>

            {/* Lista de Projetos */}
            {projetos.length > 0 ? (
              <div className="lista-projetos-preview">
                {projetos.map((p) => (
                  <div key={p.id} className="item-projeto-preview">
                    {p.imagem ? (
                      <img src={p.imagem} alt={p.titulo} className="thumb-projeto" />
                    ) : null}
                    <div className="item-proj-dados">
                      <b>{p.titulo}</b>
                      <span>{p.descricao}</span>
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noreferrer" className="link-ext">
                          Link do Projeto ↗
                        </a>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn-remover-midia"
                      onClick={() => removerProjeto(p.id)}
                      title="Remover criação"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <input type="hidden" name="projetos" value={JSON.stringify(projetos)} />
          </section>

          <footer className="drawer-rodape">
            <button type="button" className="botao botao-fraco" onClick={onFechar}>
              Cancelar
            </button>
            <button
              type="submit"
              className="botao botao-primario-grande"
              disabled={carregando}
            >
              {carregando ? "Salvando Perfil..." : "Salvar Alterações no Portfólio ✓"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
