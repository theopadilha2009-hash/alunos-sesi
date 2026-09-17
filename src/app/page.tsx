import Link from "next/link";
import { Roseta } from "@/components/Roseta";
import { Rodape, Topo } from "@/components/ds";

export default function Capa() {
  return (
    <>
      <Topo />

      <main>
        <div className="wrap capa">
          <div>
            <p className="eyebrow">Diretório da turma</p>
            <h1>
              Quem é quem,
              <br />
              <span className="vazado">e onde encontrar.</span>
            </h1>
            <p className="lede">
              O LinkedIn e o GitHub de cada aluno, com nome e sala. Para você
              conhecer a turma, achar quem mexe com o quê e aparecer para quem
              está contratando.
            </p>
          </div>
          <div className="capa-arte">
            <Roseta tamanho={220} girando />
          </div>
        </div>

        <div className="wrap">
          <div className="portas">
            <Link href="/alunos" className="porta">
              <b>Os alunos</b>
              <span>
                A lista completa, com busca, filtro por sala e os mais
                estrelados. É aberta para todo mundo.
              </span>
              <em>Entrar →</em>
            </Link>

            <Link href="/adm" className="porta">
              <b>Painel do ADM</b>
              <span>
                Cadastrar aluno, colar a lista da turma inteira de uma vez,
                fixar e dar destaque. Só abre com o link do ADM.
              </span>
              <em>Acesso restrito →</em>
            </Link>
          </div>
        </div>
      </main>

      <Rodape>Um aluno ajuda o outro a ser encontrado.</Rodape>
    </>
  );
}
