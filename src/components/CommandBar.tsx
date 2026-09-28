"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fold } from "@/lib/busca";
import { copiarTexto } from "@/lib/clipboard";
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
  /**
   * Quem está olhando pode abrir o painel. Falso para visitante anônimo e para
   * aluno — e é o que tira o item "Ir para Painel do ADM" da lista deles: o
   * `/adm` responde `notFound()` para quem não é ADM, então o item levava a um
   * 404 que ainda dizia "o recurso não existe", o que não é verdade.
   */
  ehAdm?: boolean;
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
  ehAdm = false,
  onSelecionarSala,
  onAbrirCracha,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [indiceFoco, setIndiceFoco] = useState(0);
  /**
   * Resultado da última ação, no lugar do subtítulo do item que a disparou.
   *
   * A paleta fechava no mesmo tick da cópia, então não havia onde escrever
   * nada — e uma recusa da área de transferência deixava a pessoa colando o
   * conteúdo antigo achando que tinha mandado o link. Agora o aviso mora aqui e
   * o fechamento espera quando a ação deu certo; quando falha, a paleta fica
   * aberta para o aviso ser lido.
   */
  const [avisoAcao, setAvisoAcao] = useState<{ id: string; texto: string; erro: boolean } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(dialogoRef);
  // onFechar chega inline do pai (identidade nova a cada render): em ref para o efeito
  // não re-executar e devolver o foco no meio da interação
  const fecharRef = useRef(onFechar);
  // O fechamento adiado depois de copiar com sucesso (para dar tempo de ler o
  // "Link copiado!"). Precisa ser cancelável: sem isto, fechar a paleta e
  // reabri-la dentro do 1,2 s deixava o timer antigo fechar a recém-aberta
  // debaixo de quem estava usando.
  const timerFecharRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fecharRef.current = onFechar;
  });

  useEffect(() => {
    if (aberto) {
      setQuery("");
      setIndiceFoco(0);
      setAvisoAcao(null);
      if (timerFecharRef.current) {
        clearTimeout(timerFecharRef.current);
        timerFecharRef.current = null;
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [aberto]);

  useEffect(
    () => () => {
      if (timerFecharRef.current) clearTimeout(timerFecharRef.current);
    },
    [],
  );

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

  const acoesFixas: ItemResultado[] = useMemo(() => {
    const acoes: ItemResultado[] = [
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
        // Assíncrona porque o resultado da cópia decide o que acontece depois.
        // As outras cinco telas que copiam já usam o retorno de `copiarTexto`;
        // esta era a única que o jogava fora (`void`), e a única em que a
        // pessoa não tinha como saber que nada foi copiado — o menu fechava no
        // mesmo tick e ela colava o conteúdo antigo da área de transferência.
        executar: async () => {
          const copiou = await copiarTexto(
            typeof window !== "undefined"
              ? `${window.location.origin}/alunos`
              : "https://alunos-sesi.vercel.app/alunos",
          );

          if (copiou) {
            setAvisoAcao({ id: "acao-copiar-vitrine", texto: "Link copiado!", erro: false });
            timerFecharRef.current = setTimeout(() => {
              timerFecharRef.current = null;
              fecharRef.current();
            }, 1200);
            return;
          }

          // Não fecha: o aviso é a única coisa que impede a pessoa de colar o
          // conteúdo errado, e o menu é onde ele cabe.
          setAvisoAcao({
            id: "acao-copiar-vitrine",
            texto: "Não deu para copiar. Abra /alunos e copie da barra de endereço.",
            erro: true,
          });
        },
      },
    ];

    // O painel é a única ação daqui que o servidor pode recusar: `/adm`
    // responde `notFound()` para quem não é ADM. Oferecê-la a visitante anônimo
    // e a aluno era mandar a pessoa para um 404 que ainda por cima afirmava que
    // o recurso "não existe ou foi removido" — ele existe, ela é que não tem
    // acesso.
    return ehAdm ? acoes : acoes.filter((a) => a.id !== "acao-adm");
  }, [onSelecionarSala, onFechar, router, ehAdm]);

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
              const aviso = avisoAcao?.id === item.id ? avisoAcao : null;
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
                        <span
                          className={`cmd-sub ${aviso ? (aviso.erro ? "cmd-sub-erro" : "cmd-sub-ok") : ""}`}
                        >
                          {aviso ? aviso.texto : item.subtitulo}
                        </span>
                      </div>
                      <span className="cmd-badge">
                        {aviso ? (aviso.erro ? "Não copiou" : "Pronto") : "Executar"}
                      </span>
                    </>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* Fora do `role="listbox"` de propósito: região viva dentro de uma
            listbox confunde o leitor de tela, e o aviso precisa ser anunciado —
            o texto muda no item focado, que é onde quem enxerga lê. */}
        <p className="sr-only" role="status">
          {avisoAcao?.texto ?? ""}
        </p>

        <footer className="cmd-rodape">
          <span>Use <b>↑</b> <b>↓</b> para navegar</span>
          <span><b>Enter</b> para selecionar</span>
          <span><b>ESC</b> para fechar</span>
        </footer>
      </div>
    </div>
  );
}
