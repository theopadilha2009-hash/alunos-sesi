"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { NumeroAnimado } from "@/components/NumeroAnimado";
import { Roseta } from "@/components/Roseta";
import {
  IconeCalendario,
  IconeCracha,
  IconeEditar,
  IconeEscudo,
  IconeEstrela,
  IconeLink,
  IconePortfolio,
  IconeProjetos,
  IconeSala,
  IconeSparkles,
  IconeTabela,
  IconeTrofeu,
  IconeUsuario,
} from "@/components/Icones";
import { corDaSala } from "@/lib/cores";
import { insigniasDe } from "@/lib/insignias";
import type {
  AlunoNaTela,
  DesafioHackathon,
  RetratoSala,
  Sala,
  SubmissaoDesafio,
  UsuarioSessao,
} from "@/lib/tipos";

/**
 * A primeira tela de quem entra: um retrato da vida escolar.
 *
 * Os números são todos derivados do que já existe — projetos do perfil,
 * insígnias, estrelas e endossos —, nunca inventados. O que a tela não tem
 * (aulas, notas, calendário letivo) não é desenhado pela metade: "Próximas
 * entregas" usa os desafios do mural, que é a agenda real da escola hoje.
 */

type AbaDestino = "portfolio" | "projetos" | "desafios" | "tabelas" | "adm";

type Props = {
  usuario: UsuarioSessao;
  aluno: AlunoNaTela | null;
  alunos: AlunoNaTela[];
  salas: Sala[];
  retrato: RetratoSala[];
  desafios: DesafioHackathon[];
  meusEnvios: SubmissaoDesafio[];
  onIrPara: (aba: AbaDestino) => void;
  onAbrirPerfil: () => void;
  onAbrirCracha: () => void;
};

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

function dataCurta(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formatadorData.format(data).replace(".", "");
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

function somarVotos(votos: Record<string, number> | null | undefined): number {
  return Object.values(votos ?? {}).reduce(
    (soma, n) => soma + (Number.isFinite(n) ? Math.max(0, n) : 0),
    0,
  );
}

function situacaoDoEnvio(
  envios: SubmissaoDesafio[],
  desafioId: string,
): { rotulo: string; classe: string } | null {
  const envio = envios.find((e) => e.desafioId === desafioId);
  if (!envio) return null;
  if (envio.aprovado === true) return { rotulo: "Aprovado", classe: "vg-selo--aprovado" };
  if (envio.aprovado === false) return { rotulo: "Rejeitado", classe: "vg-selo--rejeitado" };
  return { rotulo: "Aguardando", classe: "vg-selo--pendente" };
}

function Stat({
  tom,
  icone,
  valor,
  rotulo,
  dica,
}: {
  tom: "ciano" | "azul" | "amarelo" | "verde";
  icone: ReactNode;
  valor: number;
  rotulo: string;
  dica: string;
}) {
  return (
    <article className={`vg-stat vg-stat--${tom}`}>
      <div className="vg-stat-topo">
        <span className="vg-stat-icone" aria-hidden="true">
          {icone}
        </span>
        <span className="vg-stat-rotulo">{rotulo}</span>
      </div>
      <strong className="vg-stat-numero">
        <NumeroAnimado valor={valor} />
      </strong>
      <span className="vg-stat-dica">{dica}</span>
    </article>
  );
}

function Barra({ pct, rotulo }: { pct: number; rotulo: string }) {
  const limitado = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      className="vg-progresso"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={limitado}
    >
      <span style={{ width: `${limitado}%` }} />
    </div>
  );
}

export function VisaoGeral({
  usuario,
  aluno,
  alunos,
  salas,
  retrato,
  desafios,
  meusEnvios,
  onIrPara,
  onAbrirPerfil,
  onAbrirCracha,
}: Props) {
  const nome = aluno?.nome || usuario.nome || usuario.username;
  const salaDoAluno = aluno?.sala_id
    ? salas.find((s) => s.id === aluno.sala_id) ?? null
    : null;
  const retratoDaSala = aluno?.sala_id
    ? retrato.find((r) => r.id === aluno.sala_id) ?? null
    : null;

  const colegas = aluno
    ? alunos.filter((a) => a.aprovado && a.sala_id === aluno.sala_id).length
    : 0;

  const insignias = aluno
    ? insigniasDe({
        estrelas: aluno.estrelas,
        habilidades_votos: aluno.habilidades_votos,
      })
    : [];
  const conquistadas = insignias.filter((i) => i.conquistada);
  const proximas = insignias
    .filter((i) => !i.conquistada)
    .sort(
      (a, b) =>
        b.progresso.atual / b.progresso.alvo - a.progresso.atual / a.progresso.alvo,
    )
    .slice(0, 3);
  const pctConquistas = insignias.length
    ? Math.round((conquistadas.length / insignias.length) * 100)
    : 0;

  const aprovados = alunos.filter((a) => a.aprovado);
  const desafiosAtivos = desafios.filter((d) => d.ativo);
  const entregas = desafiosAtivos.slice(0, 3);
  const enviosRecentes = [...meusEnvios]
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
    .slice(0, 3);

  const totalProjetos = aprovados.reduce(
    (soma, a) => soma + (a.projetos?.length ?? 0),
    0,
  );
  const completudeMedia = retrato.length
    ? Math.round(retrato.reduce((soma, r) => soma + r.completude, 0) / retrato.length)
    : 0;

  return (
    <div className="visao-geral">
      <section className="vg-hero">
        <div className="vg-hero-texto">
          <h1 className="vg-titulo">Olá, {primeiroNome(nome)}.</h1>
          <p className="vg-sub">
            {aluno
              ? "Sua turma, suas conquistas e o que a escola tem para os próximos dias."
              : "Um retrato rápido das turmas, dos projetos e do que está aberto no mural."}
          </p>
          <div className="vg-chips">
            {aluno?.sala ? (
              <span className="vg-chip vg-chip-sala" style={{ "--vg-sala": aluno.corSala } as CSSProperties}>
                <span className="vg-ponto" aria-hidden="true" />
                {aluno.sala}
              </span>
            ) : null}
            {salaDoAluno?.curso ? <span className="vg-chip">{salaDoAluno.curso}</span> : null}
            {salaDoAluno?.turno ? <span className="vg-chip">{salaDoAluno.turno}</span> : null}
            {!aluno && usuario.role === "super_adm" ? (
              <span className="vg-chip">Administração</span>
            ) : null}
          </div>
        </div>

        <div className="vg-hero-acoes">
          <div className="vg-hero-botoes">
            {aluno ? (
              <>
                <button type="button" className="botao botao-primario" onClick={onAbrirCracha}>
                  <IconeCracha tamanho={15} />
                  <span>Ver meu crachá</span>
                </button>
                <button
                  type="button"
                  className="botao botao-secundario"
                  onClick={() => onIrPara("portfolio")}
                >
                  <IconePortfolio tamanho={15} />
                  <span>Ver portfólio</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="botao botao-primario"
                  onClick={() => onIrPara("adm")}
                >
                  <IconeEscudo tamanho={15} />
                  <span>Abrir painel ADM</span>
                </button>
                <button
                  type="button"
                  className="botao botao-secundario"
                  onClick={() => onIrPara("tabelas")}
                >
                  <IconeTabela tamanho={15} />
                  <span>Ver tabela de alunos</span>
                </button>
              </>
            )}
          </div>
          <div className="vg-hero-marca" aria-hidden="true">
            <Roseta tamanho={42} />
            <div>
              <strong>SESI SENAI</strong>
              <span>Joinville, SC</span>
            </div>
          </div>
        </div>
      </section>

      <section className="vg-stats" aria-label={aluno ? "Seus números" : "Números da escola"}>
        {aluno ? (
          <>
            <Stat
              tom="ciano"
              icone={<IconeProjetos tamanho={17} />}
              valor={aluno.projetos?.length ?? 0}
              rotulo="Projetos"
              dica="no seu portfólio"
            />
            <Stat
              tom="azul"
              icone={<IconeSparkles tamanho={17} />}
              valor={conquistadas.length}
              rotulo="Insígnias"
              dica={`de ${insignias.length} conquistas`}
            />
            <Stat
              tom="amarelo"
              icone={<IconeEstrela tamanho={17} />}
              valor={aluno.estrelas}
              rotulo="Estrelas"
              dica="recebidas da turma"
            />
            <Stat
              tom="verde"
              icone={<IconeUsuario tamanho={17} />}
              valor={somarVotos(aluno.habilidades_votos)}
              rotulo="Endossos"
              dica="em competências"
            />
          </>
        ) : (
          <>
            <Stat
              tom="ciano"
              icone={<IconeUsuario tamanho={17} />}
              valor={aprovados.length}
              rotulo="Alunos"
              dica="com perfil aprovado"
            />
            <Stat
              tom="azul"
              icone={<IconeSala tamanho={17} />}
              valor={salas.length}
              rotulo="Turmas"
              dica="cadastradas na escola"
            />
            <Stat
              tom="amarelo"
              icone={<IconeProjetos tamanho={17} />}
              valor={totalProjetos}
              rotulo="Projetos"
              dica="publicados pela turma"
            />
            <Stat
              tom="verde"
              icone={<IconeTrofeu tamanho={17} />}
              valor={desafiosAtivos.length}
              rotulo="Desafios"
              dica="abertos no mural"
            />
          </>
        )}
      </section>

      <div className="vg-grade">
        <div className="vg-coluna">
          {aluno ? (
            <section className="vg-painel">
              <div className="vg-painel-topo">
                <h2>Minha turma</h2>
                <button
                  type="button"
                  className="vg-link"
                  onClick={() => onIrPara("portfolio")}
                >
                  Ver portfólio
                </button>
              </div>

              <div className="vg-turma-identidade">
                <span
                  className="vg-turma-selo"
                  style={{ "--vg-sala": aluno.corSala } as CSSProperties}
                  aria-hidden="true"
                >
                  <IconeSala tamanho={18} />
                </span>
                <div className="vg-turma-texto">
                  <strong className="vg-turma-nome">{aluno.sala ?? "Sem turma"}</strong>
                  <span className="vg-turma-curso">
                    {salaDoAluno?.curso ?? "Curso não informado"}
                    {salaDoAluno?.turno ? ` · ${salaDoAluno.turno}` : ""}
                  </span>
                </div>
                <Avatar
                  nome={aluno.nome}
                  foto={aluno.foto_url}
                  className="vg-turma-avatar"
                  style={{ "--sala": aluno.cor } as CSSProperties}
                />
              </div>

              <div className="vg-metricas">
                <div className="vg-metrica">
                  <span>Colegas</span>
                  <strong>
                    <NumeroAnimado valor={colegas} />
                  </strong>
                </div>
                <div className="vg-metrica">
                  <span>Estrelas da turma</span>
                  <strong>
                    <NumeroAnimado valor={retratoDaSala?.estrelas ?? 0} />
                  </strong>
                </div>
                </div>

              <div className="vg-barra-bloco">
                <div className="vg-barra-rotulo">
                  <span>Completude da turma</span>
                  <span>{retratoDaSala?.completude ?? 0}%</span>
                </div>
                <Barra
                  pct={retratoDaSala?.completude ?? 0}
                  rotulo="Completude dos perfis da turma"
                />
              </div>
            </section>
          ) : (
            <section className="vg-painel">
              <div className="vg-painel-topo">
                <h2>A escola</h2>
                <button
                  type="button"
                  className="vg-link"
                  onClick={() => onIrPara("tabelas")}
                >
                  Ver alunos
                </button>
              </div>

              <div className="vg-metricas vg-metricas--quatro">
                <div className="vg-metrica">
                  <span>Turmas</span>
                  <strong>
                    <NumeroAnimado valor={salas.length} />
                  </strong>
                </div>
                <div className="vg-metrica">
                  <span>Alunos</span>
                  <strong>
                    <NumeroAnimado valor={aprovados.length} />
                  </strong>
                </div>
                <div className="vg-metrica">
                  <span>Projetos</span>
                  <strong>
                    <NumeroAnimado valor={totalProjetos} />
                  </strong>
                </div>
                <div className="vg-metrica">
                  <span>Completude média</span>
                  <strong>{completudeMedia}%</strong>
                </div>
              </div>

              <ul className="vg-turmas-lista">
                {retrato.slice(0, 4).map((r) => (
                  <li key={r.id} className="vg-turma-linha">
                    <span
                      className="vg-turma-cor"
                      style={{ "--vg-sala": corDaSala(r.nome) } as CSSProperties}
                      aria-hidden="true"
                    />
                    <div className="vg-turma-linha-texto">
                      <strong>{r.nome}</strong>
                      <span>{r.curso ?? "Curso não informado"}</span>
                    </div>
                    <span className="vg-turma-linha-numero">
                      {r.alunos} {r.alunos === 1 ? "aluno" : "alunos"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="vg-painel">
            <div className="vg-painel-topo">
              <h2>Próximas entregas</h2>
              <button
                type="button"
                className="vg-link"
                onClick={() => onIrPara("desafios")}
              >
                Ver mural
              </button>
            </div>

            {entregas.length ? (
              <ul className="vg-entregas-lista">
                {entregas.map((desafio) => {
                  const situacao = aluno
                    ? situacaoDoEnvio(meusEnvios, desafio.id)
                    : null;
                  return (
                    <li key={desafio.id} className="vg-entrega">
                      <span className="vg-entrega-icone" aria-hidden="true">
                        <IconeCalendario tamanho={16} />
                      </span>
                      <div className="vg-entrega-texto">
                        <strong>{desafio.titulo}</strong>
                        <span className="vg-entrega-meta">
                          {desafio.categoria}
                          <span className="vg-entrega-prazo">Prazo: {desafio.prazo}</span>
                        </span>
                      </div>
                      {situacao ? (
                        <span className={`vg-selo ${situacao.classe}`}>{situacao.rotulo}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="vg-vazio">
                Nenhum desafio aberto agora. O mural avisa quando a escola publicar
                um.
              </p>
            )}
          </section>

          {aluno && enviosRecentes.length ? (
            <section className="vg-painel">
              <div className="vg-painel-topo">
                <h2>Seus envios</h2>
                <button
                  type="button"
                  className="vg-link"
                  onClick={() => onIrPara("desafios")}
                >
                  Abrir mural
                </button>
              </div>
              <ul className="vg-envios-lista">
                {enviosRecentes.map((envio) => {
                  const rotulo =
                    envio.aprovado === true
                      ? "Aprovado"
                      : envio.aprovado === false
                        ? "Rejeitado"
                        : "Aguardando";
                  const classe =
                    envio.aprovado === true
                      ? "vg-selo--aprovado"
                      : envio.aprovado === false
                        ? "vg-selo--rejeitado"
                        : "vg-selo--pendente";
                  return (
                    <li key={envio.id} className="vg-envio">
                      <div className="vg-envio-texto">
                        <strong>{envio.tituloProjeto}</strong>
                        <span>
                          {envio.desafioTitulo ?? "Desafio"}
                          {envio.criadoEm ? ` · ${dataCurta(envio.criadoEm)}` : ""}
                        </span>
                      </div>
                      <span className={`vg-selo ${classe}`}>{rotulo}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="vg-coluna">
          {aluno ? (
            <section className="vg-painel">
              <div className="vg-painel-topo">
                <h2>Conquistas</h2>
                <button
                  type="button"
                  className="vg-link"
                  onClick={onAbrirPerfil}
                >
                  Ver todas
                </button>
              </div>

              <div className="vg-conquistas-topo">
                <div
                  className="vg-anel"
                  style={{ "--vg-pct": pctConquistas } as CSSProperties}
                  role="img"
                  aria-label={`${pctConquistas}% das insígnias conquistadas`}
                >
                  <div className="vg-anel-centro">
                    <strong>{pctConquistas}%</strong>
                    <span>das insígnias</span>
                  </div>
                </div>
                <div className="vg-conquistas-resumo">
                  <strong>
                    {conquistadas.length} de {insignias.length}
                  </strong>
                  <span>
                    {conquistadas.length === 1
                      ? "conquista já é sua"
                      : "conquistas já são suas"}
                  </span>
                </div>
              </div>

              {proximas.length ? (
                <ul className="vg-conquistas-lista">
                  {proximas.map((insignia) => (
                    <li key={insignia.id} className="vg-conquista">
                      <div className="vg-conquista-topo">
                        <span>{insignia.nome}</span>
                        <span>
                          {insignia.progresso.atual}/{insignia.progresso.alvo}
                        </span>
                      </div>
                      <Barra
                        pct={(insignia.progresso.atual / insignia.progresso.alvo) * 100}
                        rotulo={`Progresso da insígnia ${insignia.nome}`}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="vg-vazio">Você conquistou todas as insígnias.</p>
              )}
            </section>
          ) : null}

          <section className="vg-painel">
            <div className="vg-painel-topo">
              <h2>Atalhos</h2>
            </div>

            <div className="vg-atalhos-grade">
              {aluno ? (
                <>
                  <button type="button" className="vg-atalho" onClick={onAbrirCracha}>
                    <IconeCracha tamanho={17} />
                    <span>Meu crachá</span>
                  </button>
                  <button type="button" className="vg-atalho" onClick={onAbrirPerfil}>
                    <IconeEditar tamanho={17} />
                    <span>Meu perfil</span>
                  </button>
                  <a className="vg-atalho" href={`/u/${aluno.slug}`}>
                    <IconeLink tamanho={17} />
                    <span>Cartão NFC</span>
                  </a>
                  <a className="vg-atalho" href={`/alunos/${aluno.slug}`}>
                    <IconePortfolio tamanho={17} />
                    <span>Perfil público</span>
                  </a>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="vg-atalho"
                    onClick={() => onIrPara("adm")}
                  >
                    <IconeEscudo tamanho={17} />
                    <span>Painel ADM</span>
                  </button>
                  <button
                    type="button"
                    className="vg-atalho"
                    onClick={() => onIrPara("tabelas")}
                  >
                    <IconeTabela tamanho={17} />
                    <span>Tabela de alunos</span>
                  </button>
                  <button
                    type="button"
                    className="vg-atalho"
                    onClick={() => onIrPara("desafios")}
                  >
                    <IconeTrofeu tamanho={17} />
                    <span>Mural de desafios</span>
                  </button>
                  <a className="vg-atalho" href="/alunos">
                    <IconePortfolio tamanho={17} />
                    <span>Vitrine pública</span>
                  </a>
                </>
              )}
            </div>
          </section>

          {!aluno ? (
            <section className="vg-painel">
              <div className="vg-painel-topo">
                <h2>Turmas da escola</h2>
              </div>
              <p className="vg-vazio">
                {salas.length
                  ? `${salas.length} turmas cadastradas. Abra a tabela de alunos para gerenciar.`
                  : "Nenhuma turma cadastrada ainda."}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}