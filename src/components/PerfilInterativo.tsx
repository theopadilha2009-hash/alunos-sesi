"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apoiarHabilidadeAction } from "@/app/acoes-crm";
import { Avatar } from "@/components/Avatar";
import { LinhaCargos } from "@/components/CargosBadges";
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
  IconePlus,
  IconeSom,
  IconeSomMudo,
} from "@/components/Icones";
import { BadgeEmail, BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import { VideoEmbed } from "@/components/VideoEmbed";
import { copiarTexto } from "@/lib/clipboard";
import { lerRespostaEstrela } from "@/lib/estrela";
import { habilidadePermitida } from "@/lib/habilidades";
import { MAX_VIDEOS } from "@/lib/limites";
import { definirSom, dispararConfetes, somLigado, tocarSomEstrela } from "@/lib/som";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  salaNome: string | null;
  /**
   * O visitante desta sessão já votou neste aluno — quem responde é o cookie
   * `sesi.visitante`, lido na página. Obrigatória de propósito: o padrão
   * `false` era o bug. O perfil abria com a estrela apagada para quem já tinha
   * votado, e o clique seguinte mandava um `POST` que a rota descarta
   * (`on conflict do nothing`) — confete, nenhum voto novo, nenhum aviso. Quem
   * esquecer de passar isto quebra no `tsc`, não na tela.
   */
  estreladoInicial: boolean;
  /**
   * Deep-link `?curriculo=1`. O botão "Mini-Currículo (A4)" do cartão NFC mora
   * em `/u/[slug]` e aponta para cá com esse parâmetro: sem isto, o aluno
   * clicava e caía no perfil sem nada abrir.
   */
  abrirCurriculo?: boolean;
};

export function PerfilInterativo({
  aluno,
  salaNome,
  estreladoInicial,
  abrirCurriculo = false,
}: Props) {
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [curriculoAberto, setCurriculoAberto] = useState(abrirCurriculo);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [estrelas, setEstrelas] = useState(aluno.estrelas);
  const [estrelado, setEstrelado] = useState(estreladoInicial);
  const [carregandoVoto, setCarregandoVoto] = useState(false);
  // Som e confetes são opcionais e nascem ligados. `somLigado()` lê o
  // localStorage, que não existe no servidor — daí o valor entrar por efeito em
  // vez do inicializador do useState, que faria o HTML do servidor divergir do
  // primeiro render do cliente.
  const [comSom, setComSom] = useState(true);

  // Apoio de Competências (+1 estilo LinkedIn) com animação de +1 e bloqueio de cliques repetidos
  const [votos, setVotos] = useState<Record<string, number>>(aluno.habilidades_votos || {});
  const [apoiandoHab, setApoiandoHab] = useState<string | null>(null);
  const [habilidadesApoiadas, setHabilidadesApoiadas] = useState<Set<string>>(new Set());
  const [animandoMaisUm, setAnimandoMaisUm] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  // A lista já vem resolvida da camada de dados (coluna `habilidades` ?? regex da
  // bio). O `?? []` cobre aluno antigo, e array vazio aqui é escolha do aluno —
  // "não quero nenhuma" —, então não pode voltar para o regex da bio.
  const habilidades = aluno.habilidades ?? [];
  // Teto do editor; o slice aqui é defesa contra payload antigo ou maior. O
  // filtro descarta item sem url: a coluna é JSON cru e `<img src="">` faz o
  // navegador buscar a própria página.
  const midias = (aluno.midias ?? []).filter((m) => m.url).slice(0, 12);
  // Mesmo desenho do `slice` acima: o editor já limita, e aqui é defesa contra
  // payload antigo. O filtro descarta item sem id — a coluna é JSON cru, e um
  // `{ tipo: "youtube" }` sem id viraria um iframe apontando para lugar nenhum.
  const videos = (aluno.videos ?? []).filter((v) => v.id).slice(0, MAX_VIDEOS);

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
    if (await copiarTexto(urlAtual)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
      return;
    }
    setRecado("Não deu para copiar o link. Selecione o endereço e copie pela barra do navegador.");
  }

  async function handleApoiarCompetencia(hab: string) {
    if (apoiandoHab || habilidadesApoiadas.has(hab)) return;
    const anterior = votos[hab] || 0;
    setApoiandoHab(hab);
    setHabilidadesApoiadas((prev) => new Set(prev).add(hab));
    setAnimandoMaisUm(hab);
    setTimeout(() => setAnimandoMaisUm(null), 1000);
    setRecado(null);
    setVotos((prev) => ({ ...prev, [hab]: (prev[hab] || 0) + 1 }));

    try {
      const res = await apoiarHabilidadeAction(aluno.id, hab);
      if (!res.ok) throw new Error(res.mensagem ?? "Não deu para apoiar agora.");
      if (res.votos) setVotos(res.votos);
    } catch (erro) {
      // Desfaz o +1 otimista: sem isso o apoio fica na tela mesmo tendo falhado
      setVotos((prev) => ({ ...prev, [hab]: anterior }));
      setHabilidadesApoiadas((prev) => {
        const next = new Set(prev);
        next.delete(hab);
        return next;
      });
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

    // Desfaz o otimismo. Antes disto o `if (resp.ok)` sem `else` deixava a
    // estrela acesa na tela mesmo quando o servidor recusava — o número subia,
    // ninguém tinha votado, e o visitante só descobria no próximo carregamento.
    function desfazer() {
      setEstrelado(!proximoEstrelado);
      setEstrelas((prev) => Math.max(0, prev + (proximoEstrelado ? -1 : 1)));
    }

    try {
      const resp = await fetch("/api/estrela", {
        method: proximoEstrelado ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: aluno.id }),
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

      setEstrelas(resultado.estrelas);
      setEstrelado(resultado.votado);
    } catch {
      desfazer();
      setRecado("Não deu para votar agora. Confira a conexão e tente de novo.");
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
        style={{
          ["--sala" as string]: aluno.cor,
          ["--sala-cor" as string]: aluno.corSala,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Capa do topo com stickers perfeitamente contidos no enquadramento 3:1 */}
        <div className="perfil-capa-wrap">
          <div
            className="perfil-capa"
            aria-hidden="true"
            style={
              aluno.banner_url ? { backgroundImage: `url("${aluno.banner_url}")` } : undefined
            }
          />

          {/* Stickers / GIFs Flutuantes posicionados estilo Canva restritos ao banner */}
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
        </div>

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
              {/* Sem `role`, de propósito. O perfil público mostra turma,
                  fixação e destaque — colunas de `alunos`. O papel de login
                  mora em `usuarios` e não entra aqui: ler a tabela de login
                  para desenhar a vitrine custaria uma consulta por render e
                  publicaria quem é ADM para qualquer visitante. Cargo é
                  informação do painel, não da vitrine. */}
              <LinhaCargos
                aluno={aluno}
                agruparExtras
                tamanho="padrao"
              />
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
                    {/* O botão só existe para as competências que o endosso
                        alcança: a PK de `public.endossos` é o nome exato, e a
                        action recusa o que não está na lista. Um +1 que
                        responde "competência inválida" é pior que não ter +1 —
                        o aluno que criou a própria competência vê o chip, sem
                        número e sem botão, e entende que ali não há apoio ainda. */}
                    {habilidadePermitida(hab) ? (
                      !habilidadesApoiadas.has(hab) ? (
                        <button
                          type="button"
                          className={`btn-endorsement-add ${apoiandoEste ? "anim-pulse" : ""}`}
                          onClick={() => handleApoiarCompetencia(hab)}
                          disabled={apoiandoHab !== null}
                          title={`Apoiar ${hab} de ${aluno.nome}`}
                        >
                          <IconePlus tamanho={11} />
                          <span>1</span>
                        </button>
                      ) : (
                        <span className="endorsement-apoiado" title="Você apoiou esta competência">
                          <IconeCheck tamanho={11} />
                        </span>
                      )
                    ) : null}
                    {count > 0 ? (
                      <span className="endorsement-count" title={`${count} apoios recebidos`}>
                        {count}
                      </span>
                    ) : null}
                    {animandoMaisUm === hab ? (
                      <span className="anim-flutuante-mais-um" aria-hidden="true">
                        +1
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
            aluno, no Estúdio. Sem biblioteca de lightbox: o `<img>` já é a prévia
            e o `<a>` abre o arquivo inteiro em outra aba. */}
        {midias.length > 0 ? (
          <section className="port-midias" aria-labelledby="port-midias-titulo">
            <span className="perfil-label-secao" id="port-midias-titulo">
              Portfólio de Mídias:
            </span>
            <div className="port-midias-grade">
              {midias.map((m, i) => {
                const legenda = m.legenda?.trim();
                const imagem = (
                  <img
                    className="port-midia-img"
                    src={m.url}
                    alt={legenda || `Mídia do portfólio de ${aluno.nome}`}
                    loading="lazy"
                  />
                );
                return (
                  <figure className="port-midia" key={`${m.url}-${i}`}>
                    {/* O link só existe quando leva a algum lugar: navegador
                        bloqueia abrir `data:` em aba nova, então para upload do
                        próprio Estúdio (que é data URL) o `<a>` seria um clique
                        que não faz nada — exatamente o tipo de promessa vazia que
                        esta rodada foi desfazer. */}
                    {m.url.startsWith("http") ? (
                      <a
                        className="port-midia-link"
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {imagem}
                      </a>
                    ) : (
                      <span className="port-midia-link">{imagem}</span>
                    )}
                    {legenda ? (
                      <figcaption className="port-midia-legenda">{legenda}</figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Vídeos. Depois das mídias porque o vídeo é o fecho da apresentação:
            quem rolou até aqui já viu a foto e o projeto, e o vídeo é o que
            mostra o negócio funcionando. A seção some quando não há vídeo, pelo
            mesmo motivo da galeria — um bloco vazio marcaria a ausência. */}
        {videos.length > 0 ? (
          <section className="port-videos" aria-labelledby="port-videos-titulo">
            <span className="perfil-label-secao" id="port-videos-titulo">
              Vídeos:
            </span>
            <div className="port-videos-grade">
              {videos.map((v) => (
                <VideoEmbed key={`${v.tipo}-${v.id}`} video={v} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="perfil-grade-acoes">
          <div className="perfil-coluna-redes">
            <span className="perfil-label-secao">Redes Profissionais & Contato:</span>
            <div className="perfil-links">
              <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
              <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
              <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />
              <BadgeEmail email={aluno.email} nomeAluno={aluno.nome} />
            </div>

            <div className="perfil-estrelas-linha">
              <button
                type="button"
                className="estrela botao-estrela-grande"
                aria-pressed={estrelado}
                disabled={carregandoVoto}
                onClick={votarEstrela}
                title="Dar estrela de reconhecimento ao aluno"
              >
                <IconeEstrela preenchida={estrelado} tamanho={16} />
                <span>{estrelas} estrelas recebidas</span>
              </button>

              <button
                type="button"
                className="botao-som-toggle"
                onClick={alternarSom}
                title={comSom ? "Efeitos sonoros e confetes ativos (clique para silenciar)" : "Efeitos sonoros e confetes desativados (clique para ativar)"}
                aria-label={comSom ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
              >
                {comSom ? <IconeSom tamanho={15} /> : <IconeSomMudo tamanho={15} />}
              </button>
            </div>
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
          <Link href="/alunos" className="botao botao-fraco">
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
