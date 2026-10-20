import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { BadgeDestaque, BadgeFixado } from "@/components/CargosBadges";
import { Rodape, Topo, Vazio } from "@/components/ds";
import {
  IconeEstrela,
  IconeLink,
  IconeSparkles,
  IconeUsuario,
} from "@/components/Icones";
import { NumeroAnimado } from "@/components/NumeroAnimado";
import { chaveDaSala, corDaSala, corDoAluno, decodificarSegmento } from "@/lib/cores";
import { listarAlunos, listarSalas } from "@/lib/dados";
import { corHabilidade } from "@/lib/habilidades";

type Props = PageProps<"/turmas/[nome]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nome: bruto } = await params;
  // O segmento chega percent-encoded (ver `decodificarSegmento`): sem isso o
  // título e a descrição anunciavam `3%C2%BAB%20...` no lugar do nome.
  const nome = decodificarSegmento(bruto);
  return {
    title: `${nome} · Turma · Alunos SESI`,
    description: `Os portfólios e crachás digitais dos alunos da turma ${nome} na Escola SESI.`,
    // Mesma exposição da vitrine, que já é indexada e lista os mesmos nomes.
    robots: { index: true, follow: true },
  };
}

export default async function TurmaPage({ params }: Props) {
  const { nome: bruto } = await params;
  const nome = decodificarSegmento(bruto);

  let sala: Awaited<ReturnType<typeof listarSalas>>[number] | undefined;
  let alunos: Awaited<ReturnType<typeof listarAlunos>> = [];
  try {
    // A identidade de turma é `chaveDaSala` (trim + caixa alta), NÃO o `fold` de
    // busca — o mesmo motivo do `garantirSala`: "dsm3" e "DSM3" abrem a mesma
    // turma, e "3A" NÃO é a turma "3ºA".
    const salas = await listarSalas();
    sala = salas.find((s) => chaveDaSala(s.nome) === chaveDaSala(nome));

    // Mesmo gate da vitrine: `listarAlunos` já devolve só aprovados. O filtro de
    // sala fica aqui em vez de uma query nova — uma fonte só para as três telas
    // que leem alunos, e o cache de 15 s vale para as duas.
    const salaId = sala?.id;
    if (salaId) {
      alunos = (await listarAlunos())
        .filter((a) => a.sala_id === salaId)
        .sort((a, b) => b.estrelas - a.estrelas || a.nome.localeCompare(b.nome));
    }
  } catch (erro) {
    // Falha de leitura NÃO é turma vazia — mesmo desenho da `/alunos`: um banco
    // fora do ar não pode virar "ninguém publicado" na tela.
    console.error("[turmas] falha ao ler do Supabase:", erro);
    return (
      <>
        <Topo />
        <main className="wrap" style={{ paddingBlock: "3rem" }}>
          <Vazio titulo="Não conseguimos carregar a turma agora.">
            O banco de dados não respondeu. Tente de novo em alguns instantes —
            isto não é a lista vazia, é falha de leitura.
          </Vazio>
        </main>
        <Rodape>Se persistir, avise o ADM.</Rodape>
      </>
    );
  }

  // FORA do try, e é a lição do primeiro deploy: `notFound()` lança um erro de
  // roteamento, e dentro do catch acima ele era engolido — turma inexistente
  // virava 200 com a tela de "banco fora do ar".
  if (!sala) notFound();

  const cor = corDaSala(sala.nome);
  const totalEstrelas = alunos.reduce((soma, a) => soma + (a.estrelas || 0), 0);
  const competencias = new Set(
    alunos.flatMap((a) => a.habilidades ?? []),
  ).size;
  const comLinkedin = alunos.filter((a) => a.linkedin).length;
  const pctLinkedin = alunos.length
    ? Math.round((100 * comLinkedin) / alunos.length)
    : 0;

    return (
      <>
        <Topo voltar={{ href: "/alunos", texto: "← A turma" }} />
        <main className="wrap" style={{ paddingBlock: "1.5rem" }}>
          <header className="escola-topo">
            <p className="eyebrow">Escola SESI SENAI · Joinville</p>
            <h1 className="escola-titulo">
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "0.6em",
                  height: "0.6em",
                  borderRadius: "50%",
                  background: cor,
                }}
              />{" "}
              {sala.nome}
            </h1>
            <p className="escola-sub">
              {sala.curso ?? "Curso não informado"}
              {sala.turno ? ` · ${sala.turno}` : ""} ·{" "}
              {alunos.length === 1 ? "1 aluno" : `${alunos.length} alunos`}, em
              ordem de estrelas.
            </p>
          </header>

          <section className="retrato" aria-label="Números da turma">
            <div
              className="numero card-metrica"
              style={{ ["--tom-metrica" as string]: "var(--accent)" }}
            >
              <div className="card-metrica-topo">
                <div className="card-metrica-icone" aria-hidden="true">
                  <IconeUsuario tamanho={15} />
                </div>
                <span>alunos</span>
              </div>
              <b><NumeroAnimado valor={alunos.length} /></b>
              <div
                className="metrica-barra"
                style={{ width: "100%", background: "var(--accent)" }}
              />
            </div>
            <div
              className="numero card-metrica"
              style={{ ["--tom-metrica" as string]: "var(--amarelo)" }}
            >
              <div className="card-metrica-topo">
                <div className="card-metrica-icone" aria-hidden="true">
                  <IconeEstrela tamanho={15} />
                </div>
                <span>estrelas</span>
              </div>
              <b><NumeroAnimado valor={totalEstrelas} /></b>
              <div
                className="metrica-barra"
                style={{ width: "100%", background: "var(--amarelo)" }}
              />
            </div>
            <div
              className="numero card-metrica"
              style={{ ["--tom-metrica" as string]: "var(--azul-claro)" }}
            >
              <div className="card-metrica-topo">
                <div className="card-metrica-icone" aria-hidden="true">
                  <IconeSparkles tamanho={15} />
                </div>
                <span>competências</span>
              </div>
              <b><NumeroAnimado valor={competencias} /></b>
              <div
                className="metrica-barra"
                style={{ width: "100%", background: "var(--azul-claro)" }}
              />
            </div>
            <div
              className="numero card-metrica"
              style={{ ["--tom-metrica" as string]: "var(--verde)" }}
            >
              <div className="card-metrica-topo">
                <div className="card-metrica-icone" aria-hidden="true">
                  <IconeLink tamanho={15} />
                </div>
                <span>com LinkedIn</span>
              </div>
              <b><NumeroAnimado valor={pctLinkedin} />%</b>
              <div
                className="metrica-barra"
                style={{ width: `${pctLinkedin}%`, background: "var(--verde)" }}
              />
            </div>
          </section>

          {alunos.length === 0 ? (
            <Vazio titulo="Ninguém publicado nesta turma ainda.">
              Quando o ADM aprovar o primeiro aluno dela, ele aparece aqui.
            </Vazio>
          ) : (
            <ul className="grade">
              {alunos.map((a) => (
                <li
                  key={a.id}
                  className="aluno"
                  data-fixado={a.fixado ? "" : undefined}
                  style={{
                    ["--sala" as string]: corDoAluno(a.cor_perfil, sala.nome),
                    ["--sala-cor" as string]: cor,
                  }}
                >
                  <div className="aluno-cabeca">
                    <Avatar nome={a.nome} foto={a.foto_url} />
                    <div>
                      <h3 className="aluno-nome">
                        <Link href={`/alunos/${a.slug}`}>{a.nome}</Link>
                      </h3>
                      <span className="aluno-sala">
                        <span className="ponto" style={{ background: cor }} />
                        {sala.nome}
                      </span>
                    </div>
                  </div>

                  {a.bio ? <p className="aluno-bio">{a.bio}</p> : null}

                  {a.habilidades && a.habilidades.length > 0 ? (
                    <div className="aluno-habilidades">
                      {a.habilidades.slice(0, 3).map((hab) => (
                        <span
                          key={hab}
                          className="tag-habilidade"
                          style={{ ["--cor-tag" as string]: corHabilidade(hab) }}
                        >
                          {hab}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="aluno-pes">
                    {a.fixado ? <BadgeFixado tamanho="pequeno" /> : null}
                    {a.destaque ? <BadgeDestaque tamanho="pequeno" /> : null}
                    {/* Contagem, não botão: aqui não há voto — a estrela
                        interativa vive na vitrine e no perfil. */}
                    <span style={{ color: "var(--dim)", fontSize: "0.85rem" }}>
                      ★ {a.estrelas}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
        <Rodape>Clique no aluno para abrir o portfólio completo.</Rodape>
      </>
    );
}
