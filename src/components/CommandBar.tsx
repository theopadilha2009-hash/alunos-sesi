"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fold } from "@/lib/busca";
import { corDaSala } from "@/lib/cores";
import { useTravaDeFoco } from "@/lib/foco";
import { Avatar } from "@/components/Avatar";
import {
  IconeBusca,
  IconeEscudo,
  IconeEstrela,
  IconeLink,
  IconeSolLua,
  IconeUsuario,
} from "@/components/Icones";
import { aplicarTema, salvarTema, type Tema } from "@/lib/tema";
import type { AlunoNaTela, Sala } from "@/lib/tipos";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  alunos: AlunoNaTela[];
  salas: Sala[];
  onSelecionarSala?: (salaId: string) => void;
  onAbrirCracha?: (aluno: AlunoNaTela) => void;
};

type ItemResultado =
  | {
      tipo: "aluno";
      id: string;
      titulo: string;
      subtitulo: string;
      sala?: string | null;
      cor?: string;
      estrelas?: number;
      objeto: AlunoNaTela;
    }
  | {
      tipo: "sala";
      id: string;
      titulo: string;
      subtitulo: string;
      cor: string;
      objeto: Sala;
    }
  | {
      tipo: "acao";
      id: string;
      titulo: string;
      subtitulo: string;
      icone: React.ReactNode;
      executar: () => void;
    };

export function CommandBar({
  aberto,
  onFechar,
  alunos,
  salas,
  onSelecionarSala,
  onAbrirCracha,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [indiceFoco, setIndiceFoco] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(dialogoRef);
  // onFechar chega inline do pai (identidade nova a cada render): em ref para o efeito
  // não re-executar e devolver o foco no meio da interação
  const fecharRef = useRef(onFechar);

  useEffect(() => {
    fecharRef.current = onFechar;
  });

  useEffect(() => {
    if (aberto) {
      setQuery("");
      setIndiceFoco(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [aberto]);

  // ESC fecha com o foco em qualquer lugar da página (o backdrop não recebe foco)
  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement as HTMLElement | null;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fecharRef.current();
    }

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnterior?.focus();
    };
  }, [aberto]);

  const acoesFixas: ItemResultado[] = useMemo(
    () => [
      {
        tipo: "acao",
        id: "acao-estrelados",
        titulo: "Ver Meus Estrelados",
        subtitulo: "Filtrar apenas os alunos que você favoritou",
        icone: <IconeEstrela preenchida tamanho={16} />,
        executar: () => {
          onSelecionarSala?.("★");
          onFechar();
        },
      },
      {
        tipo: "acao",
        id: "acao-todas-salas",
        titulo: "Ver Todos os Alunos",
        subtitulo: "Remover filtros e mostrar a turma completa",
        icone: <IconeUsuario tamanho={16} />,
        executar: () => {
          onSelecionarSala?.("Todas");
          onFechar();
        },
      },
      {
        tipo: "acao",
        id: "acao-tema",
        titulo: "Alternar Tema Claro / Escuro",
        subtitulo: "Muda o contraste de exibição do sistema",
        icone: <IconeSolLua tamanho={16} />,
        executar: () => {
          const atual = document.documentElement.getAttribute("data-theme") ?? "dark";
          const proximo: Tema = atual === "dark" ? "light" : "dark";
          aplicarTema(proximo);
          salvarTema(proximo);
          onFechar();
        },
      },
      {
        tipo: "acao",
        id: "acao-adm",
        titulo: "Ir para Painel do ADM",
        subtitulo: "Cadastrar alunos e gerenciar destaques",
        icone: <IconeEscudo tamanho={16} />,
        executar: () => {
          router.push("/adm");
          onFechar();
        },
      },
      {
        tipo: "acao",
        id: "acao-copiar-vitrine",
        titulo: "Copiar Link da Vitrine",
        subtitulo: "Compartilhe o diretório com a turma",
        icone: <IconeLink tamanho={16} />,
        executar: () => {
          if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(
              typeof window !== "undefined"
                ? `${window.location.origin}/alunos`
                : "https://alunos-sesi.vercel.app/alunos",
            );
          }
          onFechar();
        },
      },
    ],
    [onSelecionarSala, onFechar, router],
  );

  const resultados: ItemResultado[] = useMemo(() => {
    const q = fold(query).trim();
    if (!q) {
      // Exibe ações rápidas e top salas
      const topSalas: ItemResultado[] = salas.slice(0, 4).map((s) => ({
        tipo: "sala",
        id: `sala-${s.id}`,
        titulo: `Sala ${s.nome}`,
        subtitulo: "Filtrar vitrine por esta sala",
        cor: corDaSala(s.nome),
        objeto: s,
      }));
      return [...acoesFixas, ...topSalas];
    }

    const listaAlunos: ItemResultado[] = alunos
      .filter((a) => {
        const textoBusca = `${fold(a.nome)} ${fold(a.sala)} ${fold(a.github)} ${fold(a.bio)}`;
        return q.split(/\s+/).every((termo) => textoBusca.includes(termo));
      })
      .slice(0, 8)
      .map((a) => ({
        tipo: "aluno",
        id: `aluno-${a.id}`,
        titulo: a.nome,
        subtitulo: [a.sala, a.github ? `@${a.github}` : null, a.bio].filter(Boolean).join(" · "),
        sala: a.sala,
        cor: a.cor,
        estrelas: a.estrelas,
        objeto: a,
      }));

    const listaSalas: ItemResultado[] = salas
      .filter((s) => fold(s.nome).includes(q))
      .map((s) => ({
        tipo: "sala",
        id: `sala-${s.id}`,
        titulo: `Sala ${s.nome}`,
        subtitulo: "Filtrar por esta turma",
        cor: corDaSala(s.nome),
        objeto: s,
      }));

    const acoesFiltradas: ItemResultado[] = acoesFixas.filter(
      (a) => fold(a.titulo).includes(q) || fold(a.subtitulo).includes(q),
    );

    return [...listaAlunos, ...listaSalas, ...acoesFiltradas];
  }, [query, alunos, salas, acoesFixas]);

  useEffect(() => {
    setIndiceFoco(0);
  }, [resultados.length]);

  function selecionarItem(item: ItemResultado) {
    if (item.tipo === "aluno") {
      if (onAbrirCracha) {
        onAbrirCracha(item.objeto);
      } else {
        router.push(`/alunos/${item.objeto.slug}`);
      }
      onFechar();
    } else if (item.tipo === "sala") {
      onSelecionarSala?.(item.objeto.id);
      onFechar();
    } else if (item.tipo === "acao") {
      item.executar();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // ESC é tratado pelo listener global no document (fecha uma única vez)
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceFoco((i) => (i + 1) % Math.max(1, resultados.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceFoco((i) => (i - 1 + resultados.length) % Math.max(1, resultados.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultados[indiceFoco]) {
        selecionarItem(resultados[indiceFoco]);
      }
    }
  }

  if (!aberto) return null;

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div
        ref={dialogoRef}
        className="cmd-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmd-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cmd-titulo" className="sr-only">
          Busca rápida e comandos
        </h2>
        <div className="cmd-campo">
          <span className="cmd-icone" aria-hidden="true">
            <IconeBusca tamanho={16} />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="cmd-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar aluno, sala, competência ou comando..."
            aria-label="Comando ou busca rápida"
          />
          <kbd className="cmd-tecla">ESC</kbd>
        </div>

        <ul ref={listaRef} className="cmd-lista" role="listbox">
          {resultados.length === 0 ? (
            <li className="cmd-vazio">Nenhum resultado para "{query}"</li>
          ) : (
            resultados.map((item, idx) => {
              const selecionado = idx === indiceFoco;
              return (
                <li
                  key={item.id}
                  className={`cmd-item ${selecionado ? "cmd-item-ativo" : ""}`}
                  role="option"
                  aria-selected={selecionado}
                  onClick={() => selecionarItem(item)}
                  onMouseEnter={() => setIndiceFoco(idx)}
                >
                  {item.tipo === "aluno" ? (
                    <>
                      <Avatar
                        nome={item.titulo}
                        foto={item.objeto.foto_url}
                        className="mini-avatar"
                        style={{
                          background: `color-mix(in srgb, ${item.cor ?? "var(--accent)"} 25%, var(--surface-2))`,
                        }}
                      />
                      <div className="cmd-info">
                        <span className="cmd-titulo">{item.titulo}</span>
                        <span className="cmd-sub">{item.subtitulo}</span>
                      </div>
                      <span className="cmd-badge">Crachá 3D ↗</span>
                    </>
                  ) : item.tipo === "sala" ? (
                    <>
                      <span
                        className="cmd-icone-sala"
                        style={{ background: item.cor }}
                      />
                      <div className="cmd-info">
                        <span className="cmd-titulo">{item.titulo}</span>
                        <span className="cmd-sub">{item.subtitulo}</span>
                      </div>
                      <span className="cmd-badge">Filtrar</span>
                    </>
                  ) : (
                    <>
                      <span className="cmd-icone-acao">{item.icone}</span>
                      <div className="cmd-info">
                        <span className="cmd-titulo">{item.titulo}</span>
                        <span className="cmd-sub">{item.subtitulo}</span>
                      </div>
                      <span className="cmd-badge">Executar</span>
                    </>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <footer className="cmd-rodape">
          <span>Use <b>↑</b> <b>↓</b> para navegar</span>
          <span><b>Enter</b> para selecionar</span>
          <span><b>ESC</b> para fechar</span>
        </footer>
      </div>
    </div>
  );
}
