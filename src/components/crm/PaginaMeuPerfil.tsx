"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { salvarPerfilAction } from "@/app/acoes-crm";
import { CrachaModal } from "@/components/CrachaModal";
import {
  IconeCheck,
  IconeCopiar,
  IconeCracha,
  IconeDownload,
  IconeEditar,
  IconeEscudo,
  IconeEstrela,
  IconeGaleria,
  IconeImprimir,
  IconeLinkExterno,
  IconeLixeira,
  IconePlus,
  IconeProjetos,
  IconeUpload,
  IconeUsuario,
} from "@/components/Icones";
import { IconeGitHub, IconeInstagram, IconeLinkedIn } from "@/components/RedesBadges";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais } from "@/lib/links";
import type { AlunoNaTela, MidiaAluno, ProjetoAluno, UsuarioSessao } from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunoAtual: AlunoNaTela | null;
  salas: { id: string; nome: string }[];
  onPerfilSalvo?: () => void;
};

export function PaginaMeuPerfil({ usuario, alunoAtual, salas, onPerfilSalvo }: Props) {
  const [estado, formAction, salvando] = useActionState(salvarPerfilAction, { ok: false });
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "projetos" | "midias" | "conta">("dados");
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Campos do Aluno
  const [nome, setNome] = useState(alunoAtual?.nome ?? usuario.nome ?? "Theo Padilha");
  const [sala, setSala] = useState(alunoAtual?.sala ?? usuario.sala ?? "DSM3");
  const [email, setEmail] = useState(usuario.email ?? "theopadilha2009@gmail.com");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bio, setBio] = useState(alunoAtual?.bio ?? "");
  const [linkedin, setLinkedin] = useState(alunoAtual?.linkedin ?? "");
  const [github, setGithub] = useState(alunoAtual?.github ?? "");
  const [instagram, setInstagram] = useState(alunoAtual?.instagram ?? "");

  // Habilidades / Competências Técnicas
  const [habilidades, setHabilidades] = useState<string[]>(alunoAtual?.habilidades ?? ["Next.js", "TypeScript", "UI/UX"]);
  const [novaHabilidade, setNovaHabilidade] = useState("");

  // Lista de projetos / criações
  const [projetos, setProjetos] = useState<ProjetoAluno[]>(
    alunoAtual?.projetos && Array.isArray(alunoAtual.projetos) ? alunoAtual.projetos : [],
  );
  const [novoProjTitulo, setNovoProjTitulo] = useState("");
  const [novoProjDesc, setNovoProjDesc] = useState("");
  const [novoProjLink, setNovoProjLink] = useState("");
  const [novoProjImg, setNovoProjImg] = useState("");

  // Lista de mídias (Imagens e GIFs da Galeria)
  const [midias, setMidias] = useState<MidiaAluno[]>(
    alunoAtual?.midias && Array.isArray(alunoAtual.midias) ? alunoAtual.midias : [],
  );
  const [novaMidiaUrl, setNovaMidiaUrl] = useState("");
  const [novaMidiaTipo, setNovaMidiaTipo] = useState<"imagem" | "gif">("imagem");
  const [novaMidiaLegenda, setNovaMidiaLegenda] = useState("");

  const urlPerfil =
    typeof window !== "undefined"
      ? `${window.location.origin}/alunos/${alunoAtual?.slug ?? "theo-padilha"}`
      : `https://alunos-sesi.vercel.app/alunos/${alunoAtual?.slug ?? "theo-padilha"}`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPerfil);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2400);
    } catch {}
  }

  function adicionarHabilidade() {
    const val = novaHabilidade.trim();
    if (!val || habilidades.includes(val)) return;
    setHabilidades([...habilidades, val]);
    setNovaHabilidade("");
  }

  function removerHabilidade(hab: string) {
    setHabilidades(habilidades.filter((h) => h !== hab));
  }

  function adicionarProjeto() {
    if (!novoProjTitulo.trim()) return;
    const novo: ProjetoAluno = {
      id: `proj_${Date.now()}`,
      titulo: novoProjTitulo.trim(),
      descricao: novoProjDesc.trim(),
      link: novoProjLink.trim() || undefined,
      imagem: novoProjImg.trim() || undefined,
    };
    setProjetos([...projetos, novo]);
    setNovoProjTitulo("");
    setNovoProjDesc("");
    setNovoProjLink("");
    setNovoProjImg("");
  }

  function removerProjeto(id: string) {
    setProjetos(projetos.filter((p) => p.id !== id));
  }

  function adicionarMidia() {
    const url = novaMidiaUrl.trim();
    if (!url) return;
    const tipo = url.toLowerCase().includes(".gif") ? "gif" : novaMidiaTipo;
    setMidias([...midias, { url, tipo, legenda: novaMidiaLegenda.trim() || undefined }]);
    setNovaMidiaUrl("");
    setNovaMidiaLegenda("");
  }

  function removerMidia(index: number) {
    setMidias(midias.filter((_, i) => i !== index));
  }

  async function comprimirImagemArquivo(file: File, maxDim = 1280, qualidade = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.type === "image/gif") {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      const img = new Image();
      const urlObj = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(urlObj);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => {
        URL.revokeObjectURL(urlObj);
        reject(new Error("Erro ao carregar imagem"));
      };
      img.src = urlObj;
    });
  }

  async function handleUploadArquivoMidia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await comprimirImagemArquivo(file, 1280, 0.85);
      setNovaMidiaUrl(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) setNovaMidiaUrl(result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleUploadArquivoProjeto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await comprimirImagemArquivo(file, 1000, 0.82);
      setNovoProjImg(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) setNovoProjImg(result);
      };
      reader.readAsDataURL(file);
    }
  }

  const ehSuperAdm = usuario.role === "super_adm";

  return (
    <div className="pagina-perfil-container">
      {/* ── NAVEGAÇÃO DE TOPO / BREADCRUMB ─────────────────────────────────── */}
      <div className="perfil-topo-bar">
        <div className="perfil-breadcrumb">
          <span className="crumb-secao">WORKSPACE CRM</span>
          <span className="crumb-div">/</span>
          <span className="crumb-secao">ESTUDANTES</span>
          <span className="crumb-div">/</span>
          <span className="crumb-atual">{nome || "Meu Perfil"}</span>
        </div>

        <div className="perfil-topo-acoes">
          {alunoAtual ? (
            <button
              type="button"
              className="btn-perfil-acao"
              onClick={() => setCrachaAberto(true)}
              title="Abrir e baixar crachá digital institucional"
            >
              <IconeCracha tamanho={16} />
              <span>Ver Crachá Digital</span>
            </button>
          ) : null}

          <Link
            href={`/alunos/${alunoAtual?.slug ?? "theo-padilha"}`}
            target="_blank"
            className="btn-perfil-acao"
            title="Abrir portfólio público em nova aba"
          >
            <IconeLinkExterno tamanho={15} />
            <span>Página Pública</span>
          </Link>
        </div>
      </div>

      {/* ── BANNER HERO INSTITUCIONAL (Estilo Imagem 4) ────────────────────── */}
      <section className="perfil-hero-banner">
        <div className="hero-banner-conteudo">
          <div className="hero-banner-avatar-wrap">
            <span className="hero-banner-avatar">{iniciais(nome)}</span>
            <span className="hero-banner-status-dot" title="Online" />
          </div>

          <div className="hero-banner-textos">
            <div className="hero-banner-tag-linha">
              <span className="hero-banner-tag-cargo">
                {ehSuperAdm ? "SUPER ADM · GESTOR" : "ESTUDANTE · AUTOR"}
              </span>
              <span className="hero-banner-tag-sala">{sala}</span>
              {alunoAtual?.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
              {alunoAtual?.destaque ? <span className="selo selo-adm">Destaque</span> : null}
            </div>

            <h1 className="hero-banner-nome">{nome}</h1>

            <div className="hero-banner-meta-linha">
              <span className="meta-item">
                <IconeUsuario tamanho={14} /> @{usuario.username}
              </span>
              <span className="meta-item">
                <IconeEstrela preenchida tamanho={14} /> {alunoAtual?.estrelas ?? 0} estrelas recebidas
              </span>
              {linkedin ? (
                <span className="meta-item meta-rede-ativa">
                  <IconeLinkedIn tamanho={14} /> LinkedIn Ativo
                </span>
              ) : null}
              {github ? (
                <span className="meta-item meta-rede-ativa">
                  <IconeGitHub tamanho={14} /> GitHub Ativo
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Feedback de Ação Salvar */}
      {estado.mensagem ? (
        <div
          className={`alerta-banner ${estado.ok ? "alerta-sucesso" : "alerta-erro"}`}
          role="alert"
        >
          {estado.ok ? <IconeCheck tamanho={18} /> : null}
          <span>{estado.mensagem}</span>
        </div>
      ) : null}

      {/* ── FORMULÁRIO PRINCIPAL DE EDIÇÃO EM DOIS BLOCOS (Imagem 4) ─────── */}
      <form action={formAction} className="perfil-grid-layout">
        <input type="hidden" name="projetos" value={JSON.stringify(projetos)} />
        <input type="hidden" name="midias" value={JSON.stringify(midias)} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="novaSenha" value={novaSenha} />
        <input type="hidden" name="confirmarSenha" value={confirmarSenha} />

        {/* ── COLUNA ESQUERDA: RESUMO, AÇÕES E CONTATOS ─────────────────── */}
        <aside className="perfil-coluna-esquerda">
          {/* Card 1: Identidade e Ações Rápidas */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">IDENTIFICAÇÃO</span>
            </div>

            <div className="perfil-card-identidade">
              <span className="avatar perfil-card-avatar">{iniciais(nome)}</span>
              <div className="perfil-card-identidade-info">
                <h3>{nome}</h3>
                <span className="perfil-card-sala-pill">{sala}</span>
              </div>
            </div>

            <div className="perfil-acoes-rapidas">
              <button
                type="button"
                className="btn-acao-rapida"
                onClick={copiarLink}
                title="Copiar link do portfólio"
              >
                <IconeCopiar tamanho={15} />
                <span>{linkCopiado ? "Link Copiado!" : "Copiar Link"}</span>
              </button>

              <button
                type="button"
                className="btn-acao-rapida"
                onClick={() => setCrachaAberto(true)}
                title="Visualizar crachá digital 3D"
              >
                <IconeCracha tamanho={15} />
                <span>Crachá Digital</span>
              </button>

              <button
                type="button"
                className="btn-acao-rapida"
                onClick={() => window.print()}
                title="Imprimir ficha cadastral"
              >
                <IconeImprimir tamanho={15} />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {/* Card 2: Redes Profissionais (Inputs Diretos) */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">REDES PROFISSIONAIS</span>
            </div>

            <div className="campos-redes-grupo">
              <div className="campo-rede-item">
                <label htmlFor="perfil-linkedin" className="label-rede">
                  <IconeLinkedIn tamanho={15} /> LinkedIn
                </label>
                <input
                  id="perfil-linkedin"
                  name="linkedin"
                  type="text"
                  className="input-rede"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>

              <div className="campo-rede-item">
                <label htmlFor="perfil-github" className="label-rede">
                  <IconeGitHub tamanho={15} /> GitHub
                </label>
                <input
                  id="perfil-github"
                  name="github"
                  type="text"
                  className="input-rede"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="ex: usuario ou link github.com/..."
                />
              </div>

              <div className="campo-rede-item">
                <label htmlFor="perfil-instagram" className="label-rede">
                  <IconeInstagram tamanho={15} /> Instagram
                </label>
                <input
                  id="perfil-instagram"
                  name="instagram"
                  type="text"
                  className="input-rede"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seu_usuario"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Contexto & Estatísticas Institucionais */}
          <div className="painel-card">
            <div className="painel-card-header">
              <span className="painel-card-label">CONTEXTO INSTITUCIONAL</span>
            </div>

            <div className="stats-lista">
              <div className="stat-linha">
                <span className="stat-titulo">Turma Cadastrada</span>
                <span className="stat-valor">{sala}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Estrelas Recebidas</span>
                <span className="stat-valor">{alunoAtual?.estrelas ?? 0}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Projetos Ativos</span>
                <span className="stat-valor">{projetos.length}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Mídias na Galeria</span>
                <span className="stat-valor">{midias.length}</span>
              </div>
              <div className="stat-linha">
                <span className="stat-titulo">Nível de Permissão</span>
                <span className="stat-valor">{ehSuperAdm ? "Super Administrador" : "Estudante"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── COLUNA DIREITA: TABS DE CONFIGURAÇÃO & CONTEÚDO ─────────────── */}
        <main className="perfil-coluna-direita">
          {/* Navegação de Abas do Editor (Estilo Imagem 4) */}
          <div className="perfil-tabs-barra" role="tablist">
            <button
              type="button"
              className={`perfil-tab-btn ${abaAtiva === "dados" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("dados")}
              role="tab"
              aria-selected={abaAtiva === "dados"}
            >
              <IconeUsuario tamanho={15} />
              <span>Dados & Bio</span>
            </button>

            <button
              type="button"
              className={`perfil-tab-btn ${abaAtiva === "projetos" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("projetos")}
              role="tab"
              aria-selected={abaAtiva === "projetos"}
            >
              <IconeProjetos tamanho={15} />
              <span>Projetos & Criações</span>
              {projetos.length > 0 ? <span className="tab-contador">{projetos.length}</span> : null}
            </button>

            <button
              type="button"
              className={`perfil-tab-btn ${abaAtiva === "midias" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("midias")}
              role="tab"
              aria-selected={abaAtiva === "midias"}
            >
              <IconeGaleria tamanho={15} />
              <span>Galeria de Imagens</span>
              {midias.length > 0 ? <span className="tab-contador">{midias.length}</span> : null}
            </button>

            <button
              type="button"
              className={`perfil-tab-btn ${abaAtiva === "conta" ? "perfil-tab-ativo" : ""}`}
              onClick={() => setAbaAtiva("conta")}
              role="tab"
              aria-selected={abaAtiva === "conta"}
            >
              <IconeEscudo tamanho={15} />
              <span>Segurança & Conta</span>
            </button>
          </div>

          {/* ── ABA 1: DADOS & BIO ─────────────────────────────────────────── */}
          {abaAtiva === "dados" ? (
            <div className="perfil-tab-painel">
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Dados Cadastrais do Aluno</h3>
                  <p>Informações principais exibidas na vitrine e crachá do SESI</p>
                </header>

                <div className="formulario-corpo">
                  <div className="form-dupla">
                    <label className="campo-form">
                      <span className="label-texto">Nome Completo *</span>
                      <input
                        type="text"
                        name="nome"
                        className="input-texto"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        placeholder="Seu nome oficial"
                      />
                    </label>

                    <label className="campo-form">
                      <span className="label-texto">Sala / Turma *</span>
                      <select
                        name="sala"
                        className="input-select"
                        value={sala}
                        onChange={(e) => setSala(e.target.value)}
                      >
                        {salas.map((s) => (
                          <option key={s.id} value={s.nome}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="campo-form">
                    <div className="label-com-contagem">
                      <span className="label-texto">Bio & Apresentação Pessoal</span>
                      <span className="contagem-caracteres">{bio.length} / 280</span>
                    </div>
                    <textarea
                      name="bio"
                      className="input-textarea"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={280}
                      placeholder="Descreva seu foco de aprendizado, tecnologias que domina e aspirações no SESI..."
                    />
                  </label>

                  {/* Gerenciamento Interativo de Competências Técnicas */}
                  <div className="campo-form">
                    <span className="label-texto">Competências Técnicas & Tecnologias</span>
                    <div className="habilidades-chips-editor">
                      {habilidades.map((hab) => (
                        <span
                          key={hab}
                          className="chip-hab-editavel"
                          style={{ ["--cor-hab" as string]: corHabilidade(hab) }}
                        >
                          <span className="ponto-hab" style={{ background: corHabilidade(hab) }} />
                          {hab}
                          <button
                            type="button"
                            className="btn-remover-chip"
                            onClick={() => removerHabilidade(hab)}
                            title={`Remover ${hab}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="adicionar-habilidade-linha">
                      <input
                        type="text"
                        className="input-texto input-hab"
                        value={novaHabilidade}
                        onChange={(e) => setNovaHabilidade(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            adicionarHabilidade();
                          }
                        }}
                        placeholder="Ex: React, Python, Robótica, Figma..."
                      />
                      <button
                        type="button"
                        className="botao botao-secundario"
                        onClick={adicionarHabilidade}
                      >
                        <IconePlus tamanho={15} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── ABA 2: PROJETOS & CRIAÇÕES ─────────────────────────────────── */}
          {abaAtiva === "projetos" ? (
            <div className="perfil-tab-painel">
              {/* Projetos Existentes */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Criações & Projetos Cadastrados ({projetos.length})</h3>
                  <p>Trabalhos escolares, sistemas e criações desenvolvidas na escola</p>
                </header>

                {projetos.length === 0 ? (
                  <div className="vazio-suave">
                    <p>Nenhum projeto cadastrado ainda. Use o formulário abaixo para adicionar seu primeiro trabalho.</p>
                  </div>
                ) : (
                  <div className="grade-projetos-editor">
                    {projetos.map((proj) => (
                      <div key={proj.id} className="card-projeto-item-editor">
                        {proj.imagem ? (
                          <div className="proj-thumb-wrap">
                            <img src={proj.imagem} alt={proj.titulo} className="proj-thumb-img" />
                          </div>
                        ) : (
                          <div className="proj-thumb-placeholder">
                            <IconeProjetos tamanho={24} />
                          </div>
                        )}
                        <div className="proj-info-wrap">
                          <h4 className="proj-item-titulo">{proj.titulo}</h4>
                          <p className="proj-item-desc">{proj.descricao}</p>
                          {proj.link ? (
                            <a
                              href={proj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="proj-item-link"
                            >
                              <IconeLinkExterno tamanho={13} /> {proj.link}
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn-deletar-item"
                          onClick={() => removerProjeto(proj.id)}
                          title="Excluir projeto"
                        >
                          <IconeLixeira tamanho={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar Novo Projeto */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>+ Cadastrar Nova Criação</h3>
                  <p>Adicione um projeto escolar com foto de capa e link externo</p>
                </header>

                <div className="formulario-corpo">
                  <div className="form-dupla">
                    <label className="campo-form">
                      <span className="label-texto">Título do Projeto *</span>
                      <input
                        type="text"
                        className="input-texto"
                        value={novoProjTitulo}
                        onChange={(e) => setNovoProjTitulo(e.target.value)}
                        placeholder="Ex: Robô Seguidor de Linha FLL"
                      />
                    </label>

                    <label className="campo-form">
                      <span className="label-texto">Link da Criação (GitHub, Vercel, Figma)</span>
                      <input
                        type="url"
                        className="input-texto"
                        value={novoProjLink}
                        onChange={(e) => setNovoProjLink(e.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <label className="campo-form">
                    <span className="label-texto">Descrição Resumida</span>
                    <textarea
                      className="input-textarea"
                      rows={2}
                      value={novoProjDesc}
                      onChange={(e) => setNovoProjDesc(e.target.value)}
                      placeholder="Explique o objetivo do projeto, tecnologias utilizadas e resultados..."
                    />
                  </label>

                  <div className="campo-form">
                    <span className="label-texto">Imagem de Capa do Projeto</span>
                    <div className="upload-linha-flex">
                      <input
                        type="text"
                        className="input-texto"
                        value={novoProjImg}
                        onChange={(e) => setNovoProjImg(e.target.value)}
                        placeholder="Cole a URL ou selecione uma imagem do dispositivo"
                      />
                      <label className="botao botao-secundario btn-upload-label">
                        <IconeUpload tamanho={15} />
                        <span>Arquivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleUploadArquivoProjeto}
                        />
                      </label>
                    </div>
                    {novoProjImg ? (
                      <div className="preview-mini-wrap">
                        <img src={novoProjImg} alt="Pré-visualização" className="preview-mini-img" />
                        <button
                          type="button"
                          className="btn-limpar-preview"
                          onClick={() => setNovoProjImg("")}
                        >
                          ✕ Remover imagem
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="form-acoes-fim">
                    <button
                      type="button"
                      className="botao botao-primario"
                      onClick={adicionarProjeto}
                      disabled={!novoProjTitulo.trim()}
                    >
                      <IconePlus tamanho={15} /> Adicionar Projeto à Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── ABA 3: GALERIA DE MÍDIAS (Sem bugs de layout da Imagem 3) ──── */}
          {abaAtiva === "midias" ? (
            <div className="perfil-tab-painel">
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Galeria de Fotos & Demonstrações ({midias.length})</h3>
                  <p>Mídias que comprovam suas habilidades práticas em bancada e código</p>
                </header>

                {midias.length === 0 ? (
                  <div className="vazio-suave">
                    <p>Nenhuma imagem cadastrada na sua galeria. Adicione fotos de workshops, placas ou certificações.</p>
                  </div>
                ) : (
                  <div className="galeria-grid-organizada">
                    {midias.map((mid, idx) => (
                      <div key={idx} className="galeria-card-organizado">
                        <div className="galeria-card-img-wrap">
                          <img src={mid.url} alt={mid.legenda ?? "Mídia"} className="galeria-card-img" />
                          <button
                            type="button"
                            className="btn-deletar-midia-overlay"
                            onClick={() => removerMidia(idx)}
                            title="Remover mídia"
                          >
                            <IconeLixeira tamanho={14} />
                          </button>
                        </div>
                        {mid.legenda ? (
                          <div className="galeria-card-legenda">
                            <span>{mid.legenda}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload de Nova Mídia */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>+ Adicionar Foto ou GIF à Galeria</h3>
                  <p>Selecione um arquivo local (comprimido automaticamente) ou informe uma URL</p>
                </header>

                <div className="formulario-corpo">
                  <div className="campo-form">
                    <span className="label-texto">Origem da Imagem</span>
                    <div className="upload-linha-flex">
                      <input
                        type="text"
                        className="input-texto"
                        value={novaMidiaUrl}
                        onChange={(e) => setNovaMidiaUrl(e.target.value)}
                        placeholder="Cole o link direto da imagem ou GIF..."
                      />
                      <label className="botao botao-secundario btn-upload-label">
                        <IconeUpload tamanho={15} />
                        <span>Arquivo Local</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleUploadArquivoMidia}
                        />
                      </label>
                    </div>
                  </div>

                  <label className="campo-form">
                    <span className="label-texto">Legenda Educacional da Foto</span>
                    <input
                      type="text"
                      className="input-texto"
                      value={novaMidiaLegenda}
                      onChange={(e) => setNovaMidiaLegenda(e.target.value)}
                      placeholder="Ex: Bancada de teste com microcontrolador ESP32"
                    />
                  </label>

                  {novaMidiaUrl ? (
                    <div className="preview-galeria-novo">
                      <img src={novaMidiaUrl} alt="Preview" className="preview-galeria-img" />
                      <button
                        type="button"
                        className="btn-limpar-preview"
                        onClick={() => setNovaMidiaUrl("")}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  ) : null}

                  <div className="form-acoes-fim">
                    <button
                      type="button"
                      className="botao botao-primario"
                      onClick={adicionarMidia}
                      disabled={!novaMidiaUrl.trim()}
                    >
                      <IconePlus tamanho={15} /> Incluir na Galeria
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── ABA 4: CONTA & SEGURANÇA ────────────────────────────────────── */}
          {abaAtiva === "conta" ? (
            <div className="perfil-tab-painel">
              {/* Card 1: Identidade, Nome Visual e E-mail */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Nome Visual & E-mail Cadastrado</h3>
                  <p>Configure sua identificação visível para a turma e seu e-mail institucional</p>
                </header>

                <div className="formulario-corpo">
                  <div className="form-dupla">
                    <label className="campo-form">
                      <span className="label-texto">Nome Visual de Exibição *</span>
                      <input
                        type="text"
                        name="nome"
                        className="input-texto"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Theo Padilha"
                        required
                      />
                      <span className="campo-dica">
                        Nome que aparece em destaque na vitrine, no crachá e nas listagens escolares.
                      </span>
                    </label>

                    <label className="campo-form">
                      <span className="label-texto">E-mail Cadastrado *</span>
                      <input
                        type="email"
                        name="email"
                        className="input-texto"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        required
                      />
                      <span className="campo-dica">
                        E-mail para comunicações, credenciais e recuperação de acesso.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Alteração de Senha Segura */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Alterar Senha de Acesso</h3>
                  <p>Defina uma nova senha para proteger seu acesso ao sistema</p>
                </header>

                <div className="formulario-corpo">
                  <div className="form-dupla">
                    <label className="campo-form">
                      <span className="label-texto">Nova Senha</span>
                      <input
                        type="password"
                        name="novaSenha"
                        className="input-texto"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 4 caracteres (opcional)"
                        autoComplete="new-password"
                      />
                    </label>

                    <label className="campo-form">
                      <span className="label-texto">Confirmar Nova Senha</span>
                      <input
                        type="password"
                        name="confirmarSenha"
                        className="input-texto"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a nova senha digitada"
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  {novaSenha && novaSenha !== confirmarSenha ? (
                    <span className="aviso-senha-invalida" style={{ color: "var(--vermelho)", fontSize: "0.82rem", fontWeight: 700 }}>
                      ⚠ A confirmação de senha não coincide com a nova senha digitada.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Card 3: Credenciais e Nível de Acesso */}
              <div className="painel-card">
                <header className="painel-card-topo">
                  <h3>Credenciais de Autenticação</h3>
                  <p>Informações técnicas e proteção criptográfica da sua conta</p>
                </header>

                <div className="formulario-corpo">
                  <div className="info-bloco-seguranca">
                    <div className="seguranca-item">
                      <span className="seguranca-rotulo">Nome de Usuário (Login)</span>
                      <span className="seguranca-dado">@{usuario.username}</span>
                    </div>
                    <div className="seguranca-item">
                      <span className="seguranca-rotulo">Privilégio da Conta</span>
                      <span className="seguranca-dado">
                        {ehSuperAdm ? "Super Administrador (Acesso Total)" : "Estudante SESI"}
                      </span>
                    </div>
                    <div className="seguranca-item">
                      <span className="seguranca-rotulo">E-mail Vinculado</span>
                      <span className="seguranca-dado">{email}</span>
                    </div>
                    <div className="seguranca-item">
                      <span className="seguranca-rotulo">ID do Registro</span>
                      <span className="seguranca-dado" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {usuario.id}
                      </span>
                    </div>
                  </div>

                  <div className="aviso-seguranca-box">
                    <IconeEscudo tamanho={20} />
                    <p>
                      Sua conta possui acesso protegido por hash criptográfico seguro (PBKDF2/SHA-256) e
                      sessão com cookie HttpOnly de integridade estrita.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── BARRA FIXA DE SALVAMENTO ──────────────────────────────────── */}
          <div className="perfil-barra-salvar">
            <span className="salvar-dica">
              As alterações salvas são refletidas instantaneamente na vitrine da turma e no crachá digital.
            </span>
            <button
              type="submit"
              className="botao botao-primario btn-salvar-perfil-grande"
              disabled={salvando}
            >
              <IconeCheck tamanho={16} />
              <span>{salvando ? "Salvando Alterações..." : "Salvar Todas as Alterações"}</span>
            </button>
          </div>
        </main>
      </form>

      {/* Crachá Modal */}
      {crachaAberto && alunoAtual ? (
        <CrachaModal aluno={alunoAtual} onClose={() => setCrachaAberto(false)} />
      ) : null}
    </div>
  );
}
