import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Vitrine } from "@/components/Vitrine";
import { Rodape, Topo, Vazio } from "@/components/ds";
import {
  listarAlunos,
  listarRetrato,
  listarSalas,
  votosDoVisitante,
} from "@/lib/dados";
import { COOKIE_ADM, COOKIE_VISITANTE, abrirAssinado, podeAdmin } from "@/lib/sessao";
import { obterSessao } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Alunos · Escola SESI",
};

export default async function AlunosPage() {
  const jar = await cookies();
  const visitante = abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");
  // A vitrine é pública, mas quem a abre pode ser o ADM — e ele é a única
  // pessoa para quem o item "Ir para Painel do ADM" da paleta de comandos leva
  // a algum lugar. Sem isto o item era oferecido a visitante anônimo e a aluno,
  // e os dois batiam num 404 dizendo que o recurso não existe.
  const sessao = await obterSessao();
  const ehAdm = podeAdmin(jar.get(COOKIE_ADM)?.value, sessao?.role);

  try {
    const [alunos, salas, retrato] = await Promise.all([
      listarAlunos(),
      listarSalas(),
      listarRetrato(),
    ]);
    const meusVotos = visitante ? await votosDoVisitante(visitante) : [];

    return (
      <>
        <Topo />
        <main className="wrap" style={{ paddingBlock: "1.5rem" }}>
          <header className="escola-topo">
            <p className="eyebrow">Escola SESI SENAI · Joinville</p>
            <h1 className="escola-titulo">A turma</h1>
            <p className="escola-sub">
              Portfólios, competências e projetos reais dos estudantes de
              Desenvolvimento de Sistemas.
            </p>
          </header>
          <Vitrine
            alunos={alunos}
            salas={salas}
            retrato={retrato}
            meusVotos={meusVotos}
            ehAdm={ehAdm}
          />
        </main>
        <Rodape>Clique na estrela para guardar quem você quer acompanhar.</Rodape>
      </>
    );
  } catch (erro) {
    // Falha de leitura NÃO é lista vazia. Se as duas telas fossem iguais, um
    // banco fora do ar seria diagnosticado como "a turma ainda não tem
    // ninguém" — e alguém ia recadastrar 40 alunos à toa.
    console.error("[alunos] falha ao ler do Supabase:", erro);
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
}
