import { cookies } from "next/headers";
import type { Metadata } from "next";
import { CrmApp } from "@/components/crm/CrmApp";
import { LoginTela } from "@/components/crm/LoginTela";
import { obterSessao } from "@/lib/auth";
import {
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

  // Se não estiver logado, a abertura vai DIRETO para o Login e Senha
  if (!sessao) {
    return <LoginTela />;
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
