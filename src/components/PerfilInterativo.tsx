"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apoiarHabilidadeAction } from "@/app/acoes-crm";
import { Avatar } from "@/components/Avatar";
import { CrachaModal } from "@/components/CrachaModal";
import { CurriculoImpressao } from "@/components/CurriculoImpressao";
import { Insignias } from "@/components/Insignias";
import {
  IconeCheck,
  IconeCopiar,
  IconeCracha,
  IconeDownload,
  IconeEscudo,
  IconeEstrela,
  IconeLinkExterno,
  IconePlus,
  IconeProjetos,
  IconeSom,
  IconeSomMudo,
} from "@/components/Icones";
import { BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import { handleLinkedin, urlGithub } from "@/lib/links";
import { definirSom, dispararConfetes, somLigado, tocarSomEstrela } from "@/lib/som";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  salaNome: string | null;
};

export function PerfilInterativo({ aluno, salaNome }: Props) {
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [curriculoAberto, setCurriculoAberto] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [estrelas, setEstrelas] = useState(aluno.estrelas);
  const [estrelado, setEstrelado] = useState(false);
  const [carregandoVoto, setCarregandoVoto] = useState(false);
  // Som e confetes são opcionais e nascem ligados. `somLigado()` lê o
  // localStorage, que não existe no servidor — daí o valor entrar por efeito em
  // vez do inicializador do useState, que faria o HTML do servidor divergir do
  // primeiro render do cliente.
  const [comSom, setComSom] = useState(true);

  // Apoio de Competências (+1 estilo LinkedIn)
  const [votos, setVotos] = useState<Record<string, number>>(aluno.habilidades_votos || {});
  const [apoiandoHab, setApoiandoHab] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const github = urlGithub(aluno.github);
  const linkedinHandle = handleLinkedin(aluno.linkedin);
  // A lista já vem resolvida da camada de dados (coluna `habilidades` ?? regex da
  // bio). O `?? []` cobre aluno antigo, e array vazio aqui é escolha do aluno —
  // "não quero nenhuma" —, então não pode voltar para o regex da bio.
  const habilidades = aluno.habilidades ?? [];
  // Teto do editor; o slice aqui é defesa contra payload antigo ou maior. O
  // filtro descarta item sem url: a coluna é JSON cru e `<img src="">` faz o
  // navegador buscar a própria página.
  const midias = (aluno.midias ?? []).filter((m) => m.url).slice(0, 12);

  const urlAtual =
    typeof window !== "undefined"
      ? window.location.href
      : `https://alunos-sesi.vercel.app/alunos/${aluno.slug}`;

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        // qrcode só entra no bundle quando o QR do perfil precisa ser gerado
        const { toDataURL } = await import("qrcode");
        const dataUrl = await toDataURL(urlAtual, {
          width: 180,
          margin: 1,
          color: {
            dark: "#0b1418",
            light: "#ffffff",
          },
        });
        if (vivo) setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error("Falha ao gerar QR Code do perfil:", err);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [urlAtual]);

  useEffect(() => {
    setComSom(somLigado());
  }, []);

  function alternarSom() {
    const proximo = !comSom;
    definirSom(proximo);
    setComSom(proximo);
    // Toca o próprio efeito ao ligar: é o som que a pessoa acabou de reativar,
    // e sem ele o clique não dá retorno nenhum.
    if (proximo) tocarSomEstrela();
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlAtual);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {}
  }

  async function handleApoiarCompetencia(hab: string) {
    if (apoiandoHab) return;
    const anterior = votos[hab] || 0;
    setApoiandoHab(hab);
    setRecado(null);
    setVotos((prev) => ({ ...prev, [hab]: (prev[hab] || 0) + 1 }));

    try {
      const res = await apoiarHabilidadeAction(aluno.id, hab);
      if (!res.ok) throw new Error(res.mensagem ?? "Não deu para apoiar agora.");
      if (res.votos) setVotos(res.votos);
    } catch (erro) {
      // Desfaz o +1 otimista: sem isso o apoio fica na tela mesmo tendo falhado
      setVotos((prev) => ({ ...prev, [hab]: anterior }));
      setRecado(erro instanceof Error ? erro.message : "Não deu para apoiar agora.");
    } finally {
      setTimeout(() => setApoiandoHab(null), 400);
    }
  }

  async function votarEstrela(ev: React.MouseEvent) {
    if (carregandoVoto) return;
    setCarregandoVoto(true);

    const proximoEstrelado = !estrelado;
    setEstrelado(proximoEstrelado);
    setEstrelas((prev) => Math.max(0, prev + (proximoEstrelado ? 1 : -1)));

    if (proximoEstrelado) {
      tocarSomEstrela();
      dispararConfetes(ev.clientX, ev.clientY);
    }

    try {
      const resp = await fetch("/api/estrela", {
        method: proximoEstrelado ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: aluno.id }),
      });
      const dados = (await resp.json()) as { estrelas?: number; votado?: boolean };
      if (resp.ok && typeof dados.estrelas === "number") {
        setEstrelas(dados.estrelas);
        setEstrelado(Boolean(dados.votado));
      }
    } catch {
      setEstrelado(!proximoEstrelado);
      setEstrelas((prev) => Math.max(0, prev + (proximoEstrelado ? -1 : 1)));
    } finally {
      setCarregandoVoto(false);
    }
  }

  const stickers = Array.isArray(aluno.stickers) ? aluno.stickers : [];
  const stickersBanner = stickers.filter((s) => s.alvo !== "projeto");
  const stickersDoProjeto = (projId: string) =>
    stickers.filter((s) => s.alvo === "projeto" && s.projetoId === projId);

  return (
    <>
      <article
        className="perfil perfil-moderno"
        style={{ ["--sala" as string]: aluno.cor, position: "relative", overflow: "hidden" }}
      >
        {/* Stickers / GIFs Flutuantes posicionados estilo Canva no topo do perfil */}
        {stickersBanner.map((st) => (
          <div
            key={st.id}
            className="sticker-flutuante-perfil"
            style={{
              position: "absolute",
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.tamanho || 64}px`,
              transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
              pointerEvents: "none",
              zIndex: 3,
            }}
            title={st.rotulo || "Sticker"}
          >
            <img
              src={st.url}
              alt={st.rotulo || "Elemento visual"}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ))}

        <div className="perfil-topo">
          <div className="perfil-avatar-wrap">
            <Avatar nome={aluno.nome} foto={aluno.foto_url} className="perfil-avatar" />
            <button
              type="button"
              className="botao-cracha-flutuante"
              onClick={() => setCrachaAberto(true)}
              title="Abrir Crachá Digital 3D"
            >
              <IconeCracha tamanho={14} />
              <span>Crachá Digital</span>
            </button>
          </div>

          <div className="perfil-titulos">
            <h1>{aluno.nome}</h1>
            <div className="perfil-sub-linha">
              {salaNome ? (
                <span className="sala-tag">
                  <span className="ponto" style={{ background: aluno.cor }} />
                  {salaNome}
                </span>
              ) : null}
              {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
              {aluno.destaque ? (
                <span className="selo selo-adm">
                  <IconeEscudo tamanho={11} /> Destaque do ADM
                </span>
              ) : null}
              <Link
                href={`/validar/${aluno.slug}`}
                target="_blank"
                className="selo-verificado-pill"
                title="Página de verificação com selo verde oficial"
              >
                <IconeEscudo tamanho={12} />
                <span>Matrícula Validada SESI Joinville</span>
              </Link>
            </div>
          </div>
        </div>

        {aluno.bio ? <p className="perfil-bio-destaque">{aluno.bio}</p> : null}

        {/* Validação de Competências Técnicas (Endorsements / Apoios +1) */}
        {habilidades.length > 0 ? (
          <div className="perfil-habilidades">
            <div className="perfil-hab-topo-linha">
              <span className="perfil-label-secao">Competências & Prova Social dos Colegas:</span>
              <span className="perfil-hab-sub">Clique em +1 para apoiar uma competência</span>
            </div>
            <div className="tags-container">
              {habilidades.map((hab) => {
                const count = votos[hab] || 0;
                const apoiandoEste = apoiandoHab === hab;

                return (
                  <div key={hab} className="endorsement-pill">
                    <span className="endorsement-nome">{hab}</span>
                    <button
                      type="button"
                      className={`btn-endorsement-add ${apoiandoEste ? "anim-pulse" : ""}`}
                      onClick={() => handleApoiarCompetencia(hab)}
                      title={`Apoiar ${hab} de ${aluno.nome}`}
                    >
                      <IconePlus tamanho={11} />
                      <span>1</span>
                    </button>
                    {count > 0 ? (
                      <span className="endorsement-count" title={`${count} apoios recebidos`}>
                        {count}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {recado ? (
          <p className="recado recado-erro" role="alert">
            {recado}
          </p>
        ) : null}

        {/* Insígnias vêm logo abaixo das competências porque são o extrato delas:
            estrelas e endossos. O placar usa o estado, não `aluno.estrelas` e
            `aluno.habilidades_votos`, porque o visitante pode estrelar e apoiar
            nesta mesma tela — com o valor do servidor a insígnia só acenderia
            no próximo carregamento. */}
        <section className="port-insignias" aria-labelledby="port-insignias-titulo">
          <span className="perfil-label-secao" id="port-insignias-titulo">
            Insígnias & Conquistas:
          </span>
          <span className="port-secao-sub">
            Elas vêm das estrelas e dos endossos dos colegas — não se escolhe ter.
          </span>
          <Insignias placar={{ estrelas, habilidades_votos: votos }} />
        </section>

        {/* Grade de Criações e Projetos */}
        {aluno.projetos && aluno.projetos.length > 0 ? (
          <div className="perfil-projetos-secao">
            <span className="perfil-label-secao">Projetos & Inovações Desenvolvidas:</span>
            <div className="grade-projetos-aluno">
              {aluno.projetos.map((p) => {
                const stickersProj = stickersDoProjeto(p.id);

                return (
                  <div
                    key={p.id}
                    className="card-projeto-vitrine"
                    style={{ position: "relative", overflow: "hidden" }}
                  >
                    {/* Stickers / GIFs específicos deste projeto */}
                    {stickersProj.map((st) => (
                      <div
                        key={st.id}
                        className="sticker-flutuante-proj"
                        style={{
                          position: "absolute",
                          left: `${st.x}%`,
                          top: `${st.y}%`,
                          width: `${st.tamanho || 54}px`,
                          transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
                          pointerEvents: "none",
                          zIndex: 4,
                        }}
                        title={st.rotulo || "Elemento visual"}
                      >
                        <img
                          src={st.url}
                          alt={st.rotulo || "Sticker"}
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      </div>
                    ))}

                    {p.imagem ? (
                      <img src={p.imagem} alt={p.titulo} className="foto-projeto" loading="lazy" />
                    ) : null}
                    <div className="conteudo-projeto">
                      <h4>{p.titulo}</h4>
                      <p>{p.descricao}</p>
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noreferrer" className="link-ext">
                          Acessar Demonstração ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Galeria do portfólio. A seção inteira desaparece quando não há mídia:
            um bloco fixo dizendo "ainda não há nada" marcaria a ausência em toda
            visita e o visitante não tem como resolver isso — quem sobe mídia é o
            aluno, no Estúdio. Sem biblioteca de lightbox: o `<a>` abre o arquivo
            original em outra aba e o `<img>` já mostra a prévia. */}
        {midias.length > 0 ? (
          <section className="port-midias" aria-labelledby="port-midias-titulo">
            <span className="perfil-label-secao" id="port-midias-titulo">
              Portfólio de Mídias:
            </span>
            <div className="port-midias-grade">
              {midias.map((m, i) => {
                const legenda = m.legenda?.trim();
                return (
                  <figure className="port-midia" key={`${m.url}-${i}`}>
                    <a
                      className="port-midia-link"
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        className="port-midia-img"
                        src={m.url}
                        alt={legenda || `Mídia do portfólio de ${aluno.nome}`}
                        loading="lazy"
                      />
                    </a>
                    {legenda ? (
                      <figcaption className="port-midia-legenda">{legenda}</figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="perfil-grade-acoes">
          <div className="perfil-links">
            <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
            <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
            <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />

            <button
              type="button"
              className="estrela botao-estrela-grande"
              aria-pressed={estrelado}
              disabled={carregandoVoto}
              onClick={votarEstrela}
              title="Dar estrela de reconhecimento ao aluno"
            >
              <IconeEstrela preenchida={estrelado} tamanho={16} />
              <span>{estrelas} estrelas</span>
            </button>

            {/* O rótulo já diz o estado, então não leva aria-pressed: um botão
                que anuncia "pressionado" e ainda troca o texto vira ruído no
                leitor de tela. O title diz o que o clique faz. */}
            <button
              type="button"
              className="botao botao-fraco botao-som"
              onClick={alternarSom}
              title={comSom ? "Desligar som e confetes" : "Ligar som e confetes"}
            >
              {comSom ? <IconeSom tamanho={15} /> : <IconeSomMudo tamanho={15} />}
              <span>{comSom ? "Som ligado" : "Som desligado"}</span>
            </button>
          </div>

          {/* Cartão de Compartilhamento & Ações Oficiais */}
          <div className="perfil-compartilhar-box">
            <div className="qrcode-bloco">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code de ${aluno.nome}`}
                  className="qrcode-img"
                />
              ) : (
                <div className="qrcode-placeholder" />
              )}
              <span className="qrcode-legenda">Escanear com celular</span>
            </div>

            <div className="botoes-compartilhar">
              <button
                type="button"
                className="botao botao-primario"
                onClick={() => setCrachaAberto(true)}
              >
                <IconeCracha tamanho={16} />
                <span>Abrir Crachá Digital 3D</span>
              </button>

              <button
                type="button"
                className="botao botao-secundario"
                onClick={() => setCurriculoAberto(true)}
                title="Gerar e imprimir mini-currículo em folha A4"
              >
                <IconeDownload tamanho={15} />
                <span>Mini-Currículo (PDF A4)</span>
              </button>

              <Link
                href={`/u/${aluno.slug}`}
                target="_blank"
                className="botao botao-fraco"
                title="Abrir versão rápida para Cartão NFC e Link na Bio"
              >
                <span>Cartão NFC / Link na Bio</span>
              </Link>

              <Link
                href={`/validar/${aluno.slug}`}
                target="_blank"
                className="botao botao-fraco"
                title="Página de verificação com selo verde oficial do SESI"
              >
                <IconeEscudo tamanho={14} />
                <span>Validar Matrícula SESI</span>
              </Link>

              <button
                type="button"
                className="botao botao-fraco"
                onClick={copiarLink}
              >
                {copiado ? (
                  <>
                    <IconeCheck tamanho={14} />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <IconeCopiar tamanho={14} />
                    <span>Copiar Link do Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p style={{ marginTop: "2.5rem" }}>
          <Link href="/" className="botao botao-fraco">
            ← Voltar para a turma
          </Link>
        </p>
      </article>

      {/* Crachá 3D Modal */}
      {crachaAberto ? (
        <CrachaModal
          aluno={{ ...aluno, sala: salaNome, habilidades }}
          onClose={() => setCrachaAberto(false)}
        />
      ) : null}

      {/* Mini-Currículo A4 Modal */}
      {curriculoAberto ? (
        <CurriculoImpressao aluno={aluno} onFechar={() => setCurriculoAberto(false)} />
      ) : null}
    </>
  );
}
