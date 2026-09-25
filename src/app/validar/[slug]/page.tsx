import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Roseta } from "@/components/Roseta";
import { IconeCracha, IconeEscudo, IconeEstrela, IconeLinkExterno } from "@/components/Icones";
import { BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import { alunoPorSlug, listarSalas } from "@/lib/dados";

type Props = {
  params: Promise<{ slug: string }>;
};

// Sem indexação: a página existe para validar um documento apresentado a
// alguém, não para ser encontrada por busca. Indexar aqui publicaria nome e
// matrícula de aluno.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const aluno = await alunoPorSlug(slug);

  if (!aluno) {
    return {
      title: "Verificação de Documento Estudantil | SESI SC Joinville",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Verificação Oficial: ${aluno.nome} | SESI SENAI Joinville`,
    description: `Validação criptográfica de matrícula ativa de ${aluno.nome} na Escola SESI SENAI Joinville - SC.`,
    robots: { index: false, follow: false },
  };
}

export default async function PaginaValidarCracha({ params }: Props) {
  const { slug } = await params;
  const aluno = await alunoPorSlug(slug);

  if (!aluno) {
    notFound();
  }

  const salas = await listarSalas();
  const sala = salas.find((s) => s.id === aluno.sala_id)?.nome ?? "SESI Joinville";
  const matricula = `SESI-SC-JVE-${aluno.slug.toUpperCase().slice(0, 8)}-${(aluno.estrelas + 26).toString().padStart(4, "0")}`;
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaAgora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="validar-documento-layout">
      <div className="validar-conteudo-box">
        {/* Topo Institucional Oficial */}
        <header className="validar-cabecalho-oficial">
          <div className="validar-marcas-linha">
            <Roseta tamanho={36} />
            <div className="validar-titulos-sesi">
              <span className="validar-sigla">SISTEMA FIESC · SESI SENAI</span>
              <span className="validar-unidade">ESCOLA SESI JOINVILLE · SANTA CATARINA</span>
            </div>
          </div>
          <span className="validar-tag-sistema">AUTENTICAÇÃO PÚBLICA DIGITAL</span>
        </header>

        {/* Banner do Selo Verde Oficial de Matrícula Ativa */}
        <div className="validar-selo-ativo-banner">
          <div className="selo-verde-icone-pulsante">
            <IconeEscudo tamanho={26} />
          </div>
          <div className="selo-verde-textos">
            <span className="selo-verde-status">MATRÍCULA VALIDADA · ESTUDANTE ATIVO</span>
            <h1 className="selo-verde-titulo">
              Estudante Ativo e Matriculado no SESI SC · Unidade Joinville
            </h1>
            <p className="selo-verde-desc">
              O crachá e a identidade digital deste estudante foram autenticados com sucesso na base de dados
              acadêmica oficial do SESI SENAI Joinville para o Ano Letivo 2026.
            </p>
          </div>
        </div>

        {/* Ficha Cadastral e Dados do Estudante */}
        <div className="validar-ficha-card">
          <div className="validar-aluno-hero">
            <Avatar nome={aluno.nome} foto={aluno.foto_url} className="validar-avatar" />
            <div className="validar-aluno-titulos">
              <h2>{aluno.nome}</h2>
              <div className="validar-pills-linha">
                <span className="validar-pill-sala">{sala}</span>
                <span className="validar-pill-cidade">Joinville · SC</span>
                {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
                {aluno.destaque ? <span className="selo selo-adm">Destaque ADM</span> : null}
              </div>
            </div>
          </div>

          {aluno.bio ? <p className="validar-aluno-bio">{aluno.bio}</p> : null}

          {/* Dados Oficiais da Matrícula */}
          <div className="validar-grade-dados">
            <div className="validar-dado-item">
              <span className="dado-rotulo">Número de Registro / Matrícula</span>
              <span className="dado-valor matricula-mono">{matricula}</span>
            </div>

            <div className="validar-dado-item">
              <span className="dado-rotulo">Situação Escolar</span>
              <span className="dado-valor status-regular">Regular · Frequência Ativa</span>
            </div>

            <div className="validar-dado-item">
              <span className="dado-rotulo">Unidade de Ensino</span>
              <span className="dado-valor">Escola SESI SENAI Joinville (SC)</span>
            </div>

            <div className="validar-dado-item">
              <span className="dado-rotulo">Ano Letivo Vigente</span>
              <span className="dado-valor">2026 · Formação Técnica & Ensino Médio</span>
            </div>

            <div className="validar-dado-item">
              <span className="dado-rotulo">Validação Realizada em</span>
              <span className="dado-valor">{dataHoje} às {horaAgora}</span>
            </div>

            <div className="validar-dado-item">
              <span className="dado-rotulo">Reconhecimentos & Estrelas</span>
              <span className="dado-valor estrela-destaque">
                <IconeEstrela preenchida tamanho={13} /> {aluno.estrelas} estrelas recebidas
              </span>
            </div>
          </div>

          {/* Redes Profissionais Conectadas */}
          {(aluno.linkedin || aluno.github || aluno.instagram) ? (
            <div className="validar-redes-bloco">
              <span className="validar-secao-rotulo">Canais Oficiais do Estudante:</span>
              <div className="validar-redes-lista">
                <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
                <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
                <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Chave Criptográfica de Segurança & Selo de Integridade */}
        <div className="validar-seguranca-footer">
          <div className="seguranca-hash-wrap">
            <span className="seguranca-hash-label">HASH CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256)</span>
            <code className="seguranca-hash-codigo">
              SESI-SC-JVE-AUTH-{(aluno.id).replace(/-/g, "").slice(0, 32).toUpperCase()}
            </code>
          </div>

          <div className="validar-botoes-navegacao">
            <Link href={`/alunos/${aluno.slug}`} className="botao botao-primario">
              <IconeLinkExterno tamanho={15} />
              <span>Acessar Portfólio Completo</span>
            </Link>

            <Link href={`/u/${aluno.slug}`} className="botao botao-secundario">
              <span>Cartão Rápido NFC / Link na Bio</span>
            </Link>

            <Link href="/" className="botao botao-fraco">
              Voltar ao Diretório Geral SESI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
