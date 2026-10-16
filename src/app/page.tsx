import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { CrmApp } from "@/components/crm/CrmApp";
import { LoginTela } from "@/components/crm/LoginTela";
import { Roseta } from "@/components/Roseta";
import { obterSessao } from "@/lib/auth";
import {
  alunoIdDoUsuario,
  listarAcessos,
  listarAlunos,
  listarDesafios,
  listarRetrato,
  listarSalas,
  listarSubmissoes,
  submissoesDoAluno,
  votosDoVisitante,
} from "@/lib/dados";
import { COOKIE_VISITANTE, abrirAssinado } from "@/lib/sessao";

// A raiz é a tela de login/CRM: não tem nada para o Google indexar. Quem é
// público e indexável é a vitrine, em /alunos.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaPrincipal() {
  const sessao = await obterSessao();

  // Sem sessão, a abertura é a landing: o visitante de fora — que só tem o
  // link da raiz — vê o que é o programa e para onde ir, em vez de cair num
  // formulário de usuário e senha sem contexto (p1/p4 do PDF do Théo eram
  // essa porta cega). O login fica AO LADO, no mesmo lugar de sempre: nada do
  // fluxo de autenticação se move, o que muda é o que cerca o formulário.
  // Estilos inline de propósito — classe nova aqui seria órfã do teste.
  if (!sessao) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 26rem), 1fr))",
          gap: "2rem",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "76rem",
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 3rem)",
          minHeight: "100svh",
        }}
      >
        <section style={{ display: "grid", gap: "1rem", justifyItems: "start" }}>
          <Roseta tamanho={56} />
          <h1
            style={{
              fontSize: "clamp(2.2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              margin: 0,
            }}
          >
            Alunos SESI SENAI
          </h1>
          <p
            style={{
              color: "var(--dim)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              maxWidth: "34rem",
              margin: 0,
            }}
          >
            Portfólios, crachás digitais e projetos reais dos estudantes de
            Desenvolvimento de Sistemas do SESI SENAI Joinville.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/alunos" className="botao botao-primario">
              Ver a turma
            </Link>
          </div>
        </section>
        <LoginTela />
      </div>
    );
  }

  // Usuário autenticado: carrega os dados e abre o CRM Escolar
  const jar = await cookies();
  const visitante = abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");

  const [alunos, salas, retrato, desafios] = await Promise.all([
    // O ADM precisa ver a fila de moderação dentro do CRM — é ali que está o
    // botão de aprovar. Para os outros papéis, pendente não existe.
    listarAlunos({ incluirPendentes: sessao.role === "super_adm" }),
    listarSalas(),
    listarRetrato(),
    listarDesafios(),
  ]);

  // Em paralelo: são quatro consultas independentes entre si. Em série, cada
  // uma esperava a anterior terminar, e a tela só saía depois da soma das
  // quatro — o painel do ADM é quem mais paga, porque é o único que dispara
  // todas.
  const [comAcesso, submissoes, meusVotos, meusEnvios] = await Promise.all([
    // Quem já tem login, para o painel só oferecer o código a quem precisa.
    // Só o ADM consulta: não é dado da vitrine.
    sessao.role === "super_adm" ? listarAcessos() : [],
    // Os envios do mural viram fila de moderação. A RLS da 004 fechou a leitura
    // para a anon key, então nem a vitrine puxa: só o ADM, por aqui.
    sessao.role === "super_adm" ? listarSubmissoes() : [],
    visitante ? votosDoVisitante(visitante) : [],
    // O mural mostra ao aluno onde cada envio dele parou — sem isto ele submete
    // um projeto e nunca mais sabe se alguém olhou.
    sessao.alunoId ? submissoesDoAluno(sessao.alunoId) : [],
  ]);

  return (
    <CrmApp
      usuario={sessao}
      // Do BANCO, não do token: um login anterior ao vínculo anda com
      // `alunoId` vazio até relogar, e o card do usuário precisa do aluno.
      meuAlunoId={
        sessao.alunoId ??
        (sessao.role === "super_adm" ? await alunoIdDoUsuario(sessao.id) : null)
      }
      alunosIniciais={alunos}
      salas={salas}
      retrato={retrato}
      meusVotos={meusVotos}
      desafiosIniciais={desafios}
      comAcesso={comAcesso}
      submissoesIniciais={submissoes}
      meusEnvios={meusEnvios}
    />
  );
}
