"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submeterDesafioAction } from "@/app/acoes-crm";
import {
  IconeCheck,
  IconeCracha,
  IconeEscudo,
  IconeEstrela,
  IconeLinkExterno,
  IconePlus,
  IconeProjetos,
} from "@/components/Icones";
import { CATEGORIAS } from "@/lib/desafios";
import { useTravaDeFoco } from "@/lib/foco";
import type { DesafioHackathon, SubmissaoDesafio, UsuarioSessao } from "@/lib/tipos";

type Props = {
  desafios: DesafioHackathon[];
  usuario: UsuarioSessao;
  /** Os envios deste aluno, para o card mostrar onde cada um parou. */
  envios?: SubmissaoDesafio[];
  /**
   * Quantos envios da turma esperam julgamento. Vem preenchido só para
   * `super_adm` — os outros papéis não enxergam a fila, e um contador aqui
   * seria a única pista de que ela existe.
   */
  enviosPendentes?: number;
  /**
   * Leva à fila de julgamento. Existe só para `super_adm`, e é o que resolve
   * "onde eu vejo os projetos que a turma enviou": a fila mora no Painel ADM,
   * dois níveis fundo, e quem procura por ela procura aqui.
   */
  onJulgarEnvios?: () => void;
};

export function MuralDesafios({
  desafios,
  usuario,
  envios = [],
  enviosPendentes = 0,
  onJulgarEnvios,
}: Props) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todos");
  const [desafioSelecionado, setDesafioSelecionado] = useState<DesafioHackathon | null>(null);
  const [estadoSubmissao, formAction, enviando] = useActionState(submeterDesafioAction, {
    ok: false,
  });

  const dialogoRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(dialogoRef);

  // ESC fecha com o foco em qualquer lugar da página (o backdrop não recebe foco)
  useEffect(() => {
    if (!desafioSelecionado) return;
    const focoAnterior = document.activeElement as HTMLElement | null;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setDesafioSelecionado(null);
    }

    document.addEventListener("keydown", aoTeclar);
    dialogoRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnterior?.focus();
    };
  }, [desafioSelecionado]);

  // Derivado de `CATEGORIAS`, não escrito à mão: a lista local tinha quatro das
  // cinco, e um desafio publicado em "Design & UI/UX" só aparecia em "todos" —
  // o botão que o filtraria não existia.
  const categorias = ["todos", ...CATEGORIAS];

  const desafiosFiltrados = desafios.filter((d) => {
    if (categoriaAtiva === "todos") return true;
    return d.categoria === categoriaAtiva;
  });

  // A constraint `submissoes_unica_por_aluno` garante um envio por desafio,
  // então o mapa é 1:1 e o último vence por construção, não por sorte.
  const envioPorDesafio = new Map(envios.map((e) => [e.desafioId, e]));

  return (
    <div className="mural-desafios-container">
      {/* Topo do Mural com identidade SESI Joinville */}
      <header className="mural-topo-banner">
        <div className="mural-topo-conteudo">
          <div className="mural-badge-linha">
            <span className="mural-tag-sesi">SESI SENAI SC · UNIDADE JOINVILLE</span>
            <span className="mural-tag-hackathon">TEMPORADA DE DESAFIOS TÉCNICOS 2026</span>
          </div>
          <h1 className="mural-titulo">Mural de Desafios & Hackathons Escolares</h1>
          <p className="mural-subtitulo">
            Resolva desafios de engenharia, programação e robótica propostos pela coordenação e professores do SESI Joinville.
            Submeta seu projeto, conquiste insígnias exclusivas para o seu perfil e acelere seu portfólio profissional!
          </p>
        </div>
      </header>

      {/* A fila de julgamento é do ADM, não do aluno — mas é AQUI que alguém
          procura por ela, porque é aqui que os desafios e os envios acontecem.
          Antes ela ficava só no Painel ADM (aba 6) → sub-aba 5 de 5, e o Théo
          perguntou "como eu vejo os projetos enviados pela turma?" tendo a fila
          a três cliques de distância. */}
      {onJulgarEnvios ? (
        <div
          className={`mural-fila-adm ${enviosPendentes > 0 ? "mural-fila-adm-tem" : ""}`}
        >
          <span className="mural-fila-texto">
            {enviosPendentes > 0 ? (
              <>
                <b>
                  {enviosPendentes} {enviosPendentes === 1 ? "envio" : "envios"}
                </b>{" "}
                da turma {enviosPendentes === 1 ? "espera" : "esperam"} julgamento.
              </>
            ) : (
              "Nenhum envio esperando julgamento."
            )}
          </span>
          <button type="button" className="botao botao-fraco" onClick={onJulgarEnvios}>
            <IconeEscudo tamanho={14} />
            <span>Ver envios da turma</span>
          </button>
        </div>
      ) : null}

      {/* Barra de Filtros por Categoria */}
      <div className="mural-filtros-bar">
        <span className="filtros-label">Filtrar por Área:</span>
        <div className="filtros-botoes-grupo">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn-filtro-cat ${categoriaAtiva === cat ? "btn-filtro-ativo" : ""}`}
              onClick={() => setCategoriaAtiva(cat)}
            >
              {cat === "todos" ? "Todos os Desafios" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Desafios Ativos */}
      <div className="mural-desafios-grid">
        {desafiosFiltrados.map((desafio) => {
          const meuEnvio = envioPorDesafio.get(desafio.id);
          return (
            <div key={desafio.id} className="card-desafio-item">
              <div className="desafio-card-header">
                <span className="desafio-categoria-badge">{desafio.categoria}</span>
                <span className="desafio-prazo-tag">Prazo: {desafio.prazo}</span>
              </div>

              <div className="desafio-corpo">
                <h2 className="desafio-titulo">{desafio.titulo}</h2>
                <p className="desafio-subtitulo-texto">{desafio.subtitulo}</p>
                <p className="desafio-descricao">{desafio.descricao}</p>

                {/* Critérios de Avaliação */}
                {desafio.criterios && desafio.criterios.length > 0 ? (
                  <div className="desafio-criterios-bloco">
                    <span className="criterios-label">Requisitos & Critérios:</span>
                    <ul className="criterios-lista">
                      {desafio.criterios.map((c, i) => (
                        <li key={i}>
                          <IconeCheck tamanho={12} />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Recompensa & Insígnia */}
                <div className="desafio-recompensa-box">
                  <div className="recompensa-icone-wrap">
                    <IconeEstrela preenchida tamanho={16} />
                  </div>
                  <div className="recompensa-info">
                    <span className="recompensa-rotulo">Recompensa & Insígnia no Perfil:</span>
                    <strong className="recompensa-nome">{desafio.recompensa}</strong>
                  </div>
                </div>
              </div>

              <div className="desafio-card-footer">
                <span className="desafio-contagem-submissoes">
                  {desafio.submissoesCount} soluções enviadas por alunos
                </span>

                {/* Três estados desde a 016, e a decisão do ADM tem
                    consequência: o aluno cujo projeto foi rejeitado recebe o
                    botão de volta para corrigir e reenviar.

                    Reenviar não esbarra em `submissoes_unica_por_aluno`: o
                    envio é upsert (dados.ts), então atualiza a mesma linha e
                    devolve o registro para a fila como pendente. */}
                {!meuEnvio ? (
                  <button
                    type="button"
                    className="botao botao-primario btn-submeter-desafio"
                    onClick={() => setDesafioSelecionado(desafio)}
                  >
                    <IconePlus tamanho={15} />
                    <span>Submeter Projeto</span>
                  </button>
                ) : meuEnvio.aprovado === false ? (
                  <button
                    type="button"
                    className="botao botao-primario btn-submeter-desafio"
                    onClick={() => setDesafioSelecionado(desafio)}
                    title={`Seu envio: ${meuEnvio.tituloProjeto}`}
                  >
                    <IconePlus tamanho={15} />
                    <span>Corrigir e reenviar</span>
                  </button>
                ) : (
                  <span
                    className={`mural-meu-envio ${
                      meuEnvio.aprovado ? "mural-envio-aprovado" : "mural-envio-pendente"
                    }`}
                    title={`Seu envio: ${meuEnvio.tituloProjeto}`}
                  >
                    {meuEnvio.aprovado ? (
                      <>
                        <IconeCheck tamanho={14} />
                        <span>Envio aprovado</span>
                      </>
                    ) : (
                      <>
                        <IconeEstrela tamanho={14} />
                        <span>Envio em análise</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Submissão de Projeto para o Desafio */}
      {desafioSelecionado ? (
        <div className="modal-backdrop" onClick={() => setDesafioSelecionado(null)}>
          <div
            className="modal-submissao-desafio"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-submissao-titulo"
            tabIndex={-1}
            ref={dialogoRef}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-submissao-topo">
              <div>
                <span className="submissao-tag">SUBMISSÃO DE PROJETO TÉCNICO</span>
                <h3 id="modal-submissao-titulo">{desafioSelecionado.titulo}</h3>
              </div>
              {/* Sem aria-label o nome acessível deste botão é o próprio "✕",
                  que vence o title no cálculo — o leitor de tela anuncia
                  "sinal de multiplicação" no único botão que fecha o modal. */}
              <button
                type="button"
                className="drawer-fechar"
                onClick={() => setDesafioSelecionado(null)}
                aria-label="Fechar formulário"
                title="Fechar formulário"
              >
                ✕
              </button>
            </header>

            {estadoSubmissao.mensagem ? (
              <div
                className={`alerta-banner ${estadoSubmissao.ok ? "alerta-sucesso" : "alerta-erro"}`}
                role="alert"
              >
                {estadoSubmissao.ok ? <IconeCheck tamanho={18} /> : null}
                <span>{estadoSubmissao.mensagem}</span>
              </div>
            ) : null}

            <form action={formAction} className="formulario-submissao-corpo">
              <input type="hidden" name="desafioId" value={desafioSelecionado.id} />

              <div className="campo-form">
                <label htmlFor="submissao-titulo" className="label-texto">
                  Título do seu Projeto / Criação *
                </label>
                <input
                  id="submissao-titulo"
                  name="tituloProjeto"
                  type="text"
                  required
                  className="input-texto"
                  placeholder="Ex: Robô Seguidor de Linha PID SESI Joinville"
                />
              </div>

              <div className="campo-form">
                <label htmlFor="submissao-link" className="label-texto">
                  Link do Repositório GitHub / Protótipo / Demonstração
                </label>
                {/* `type="text"` com `inputMode="url"`, e não `type="url"`: o
                    campo `url` faz o navegador barrar o envio com uma bolha
                    nativa quando falta o esquema — quem digita
                    `github.com/meu-projeto` não descobre por quê. Quem valida é
                    o servidor (`urlSegura`), que devolve uma frase legível no
                    aviso do próprio modal. Mesma troca que o editor de perfil
                    recebeu. */}
                <input
                  id="submissao-link"
                  name="linkProjeto"
                  type="text"
                  inputMode="url"
                  className="input-texto"
                  placeholder="https://github.com/usuario/meu-robo-sesi"
                />
                <span className="dica-campo">
                  Cole o endereço completo, começando com https://
                </span>
              </div>

              <div className="campo-form">
                <label htmlFor="submissao-desc" className="label-texto">
                  Descrição da Solução Desenvolvida *
                </label>
                {/* `input-textarea` é a classe dos campos de texto do CRM. O
                    `textarea-bio` que estava aqui não existe em CSS nenhum do
                    repositório, e sem classe e sem `color-scheme: dark` o campo
                    caía no estilo default do navegador — fundo branco no meio de
                    um modal escuro. */}
                <textarea
                  id="submissao-desc"
                  name="descricao"
                  required
                  rows={4}
                  className="input-textarea"
                  placeholder="Explique como seu código/projeto resolve os critérios do desafio, tecnologias usadas (ex: Arduino, Python, ESP32) e diferenciais..."
                />
              </div>

              <div className="modal-submissao-acoes">
                <button
                  type="button"
                  className="botao botao-fraco"
                  onClick={() => setDesafioSelecionado(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="botao botao-primario btn-confirmar-submissao"
                  disabled={enviando}
                >
                  <IconeCheck tamanho={16} />
                  <span>{enviando ? "Enviando Solução..." : "Confirmar Envio ao SESI"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
