import { cookies } from "next/headers";
import type { Metadata } from "next";
import { CrmApp } from "@/components/crm/CrmApp";
import { LoginTela } from "@/components/crm/LoginTela";
import { obterSessao } from "@/lib/auth";
import {
  listarAlunos,
  listarDesafios,
  listarRetrato,
  listarSalas,
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

  const meusVotos = visitante ? await votosDoVisitante(visitante) : [];

  return (
    <CrmApp
      usuario={sessao}
      alunosIniciais={alunos}
      salas={salas}
      retrato={retrato}
      meusVotos={meusVotos}
      desafiosIniciais={desafios}
    />
  );
}
