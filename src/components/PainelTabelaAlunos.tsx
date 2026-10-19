"use client";

import { useMemo, useState } from "react";
import { IconeBusca } from "@/components/Icones";
import { TabelaAlunos } from "@/components/TabelaAlunos";
import { ESTRELADOS, TODAS, filtrarAlunos } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import type { AlunoNaTela, Sala } from "@/lib/tipos";

type Props = {
  alunos: AlunoNaTela[];
  salas: Sala[];
  meusVotos: string[];
  ocupado: string | null;
  onEstrelar: (id: string, ev?: React.MouseEvent) => void;
  onAbrirCracha: (aluno: AlunoNaTela) => void;
  onSelecionarAluno?: (aluno: AlunoNaTela) => void;
};

// Os filtros que esta aba prometeu desde o primeiro cabeçalho e nunca teve
// (o texto antigo foi reescrito para prometer menos — comentário de
// 1160 no CrmApp). Moram AQUI e não no estado do CrmApp de propósito: os
// filtros da Portfólio vazaram para esta aba uma vez e produziam uma tabela
// filtrada sem controle nenhum na tela. Cada aba dona dos seus filtros.
export function PainelTabelaAlunos({
  alunos,
  salas,
  meusVotos,
  ocupado,
  onEstrelar,
  onAbrirCracha,
  onSelecionarAluno,
}: Props) {
  const [busca, setBusca] = useState("");
  const [sala, setSala] = useState<string>(TODAS);
  const [soFixados, setSoFixados] = useState(false);
  const [comRedes, setComRedes] = useState(false);

  const naTela = useMemo(() => {
    // `salaId` a partir de `sala_id`: o campo do banco é snake_case e o
    // filtro de sala da lib lê `salaId` — mesmo casamento que o CrmApp faz
    // na aba Portfólio.
    const porBuscaESala = filtrarAlunos(
      alunos.map((a) => ({ ...a, salaId: a.sala_id })),
      { sala, query: busca },
    );
    return porBuscaESala.filter((a) => {
      if (soFixados && !a.fixado) return false;
      if (comRedes && !(a.linkedin || a.github || a.instagram)) return false;
      return true;
    });
  }, [alunos, busca, sala, soFixados, comRedes]);

  const ativo = (valor: boolean) => (valor ? " frutiger-chip-ativo" : "");

  return (
    <>
      <div className="frutiger-filtros">
        <div className="frutiger-busca">
          <IconeBusca tamanho={15} />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar estudante, sala, @github…"
            aria-label="Buscar estudante por nome, sala, bio ou rede"
          />
        </div>

        <div className="frutiger-chips" role="group" aria-label="Filtrar por sala">
          <button
            type="button"
            className={`frutiger-chip${sala === TODAS ? " frutiger-chip-ativo" : ""}`}
            aria-pressed={sala === TODAS}
            onClick={() => setSala(TODAS)}
          >
            Todas as salas
            <span className="frutiger-chip-conta">{alunos.length}</span>
          </button>

          {salas.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`frutiger-chip${sala === s.id ? " frutiger-chip-ativo" : ""}`}
              style={{ ["--sala-cor" as string]: corDaSala(s.nome) }}
              aria-pressed={sala === s.id}
              onClick={() => setSala(sala === s.id ? TODAS : s.id)}
            >
              <span className="ponto-sala" />
              {s.nome}
            </button>
          ))}

          <span className="frutiger-chip-divisoria" aria-hidden="true" />

          <button
            type="button"
            className={`frutiger-chip${sala === ESTRELADOS ? " frutiger-chip-ativo" : ""}`}
            aria-pressed={sala === ESTRELADOS}
            onClick={() => setSala(sala === ESTRELADOS ? TODAS : ESTRELADOS)}
          >
            ★ Estrelados
          </button>
          <button
            type="button"
            className={`frutiger-chip${ativo(soFixados)}`}
            aria-pressed={soFixados}
            onClick={() => setSoFixados(!soFixados)}
          >
            Fixados
          </button>
          <button
            type="button"
            className={`frutiger-chip${ativo(comRedes)}`}
            aria-pressed={comRedes}
            onClick={() => setComRedes(!comRedes)}
          >
            Com redes
          </button>
        </div>

        {/* A contagem prova que o filtro pegou — sem ela, "poucos resultados"
            lê como dado sumido. */}
        <p className="frutiger-contagem" role="status">
          {naTela.length} de {alunos.length} estudantes
        </p>
      </div>

      <TabelaAlunos
        alunos={naTela}
        meusVotos={meusVotos}
        ocupado={ocupado}
        onEstrelar={onEstrelar}
        onAbrirCracha={onAbrirCracha}
        onSelecionarAluno={onSelecionarAluno}
      />
    </>
  );
}
