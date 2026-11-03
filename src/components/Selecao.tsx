"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { IconeSeta } from "@/components/Icones";

// Seleção própria (design-theo/references/biblioteca.md, peça B12).
//
// Por que existe: a regra da skill é "nunca o <select> nem o input date do
// sistema" — o print do macOS num diálogo foi o gatilho. O <select> nativo
// abre a lista do SISTEMA, que não segue o tema escuro do app, e no login
// (ilha escura) abria a lista clara do Windows/macOS por cima.
//
// O contrato imita o do <select> para a troca ser mecânica nos call sites:
//   value / defaultValue, onChange(valor), opcoes [{ valor, rotulo }]
// e ainda aceita `name`/`formHidden` para quem envia por <form> (o js que
// chama requestSubmit continua achando o input escondido).

export type Opcao = { valor: string; rotulo: string };

type Props = {
  opcoes: Opcao[];
  value?: string;
  defaultValue?: string;
  onChange?: (valor: string) => void;
  /** Rótulo acessível. Se ausente, use `ariaLabel` ou `id` apontando p/ um <label>. */
  rotulo?: string;
  ariaLabel?: string;
  /** Respeita `htmlFor` de um <label> existente (alguns usos já têm um). */
  id?: string;
  placeholder?: string;
  /** Nome do input escondido que acompanha formulários nativos. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Abre a busca quando há mais de 7 opções (B12, `data-busca`). */
  busca?: boolean;
  className?: string;
  compacta?: boolean;
  /** Estado de erro do formulário (B12: borda em --suave-vermelho). */
  invalido?: boolean;
};

export function Selecao({
  opcoes,
  value,
  defaultValue,
  onChange,
  rotulo,
  ariaLabel,
  id,
  placeholder = "Escolha",
  name,
  required,
  disabled,
  busca,
  className = "",
  compacta,
  invalido,
}: Props) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(defaultValue ?? "");
  const selecionado = controlado ? value! : interno;

  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [termo, setTermo] = useState("");
  const [media, setMedia] = useState<{ y: number; w: number; subir: boolean }>({ y: 0, w: 0, subir: false });

  const gatilho = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const campoBusca = useRef<HTMLInputElement>(null);
  const idAuto = useId();
  const idLista = `${idAuto}-lista`;
  const idRotulo = `${idAuto}-rotulo`;

  const usarBusca = busca ?? opcoes.length > 7;
  const filtradas = useMemo(() => {
    if (!usarBusca || !termo) return opcoes;
    // "sao" acha "São José": ignora acento e caixa.
    const alvo = termo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return opcoes.filter((o) =>
      o.rotulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(alvo),
    );
  }, [opcoes, termo, usarBusca]);

  const atual = opcoes.find((o) => o.valor === selecionado);

  function escolher(valor: string) {
    if (!controlado) setInterno(valor);
    onChange?.(valor);
    setAberto(false);
    gatilho.current?.focus();
  }

  function abrir() {
    if (disabled) return;
    const i = opcoes.findIndex((o) => o.valor === selecionado);
    setAtivo(i >= 0 ? i : 0);
    setTermo("");
    setAberto(true);
  }

  // Abre para cima quando falta espaço embaixo e sobra em cima (B12).
  useLayoutEffect(() => {
    if (!aberto || !gatilho.current) return;
    const r = gatilho.current.getBoundingClientRect();
    const precisa = Math.min(320, Math.max(160, opcoes.length * 36 + (usarBusca ? 52 : 8)));
    const cabeEmbaixo = window.innerHeight - r.bottom > precisa;
    setMedia({ y: cabeEmbaixo ? r.bottom + 6 : window.innerHeight - r.top + 6, w: r.width, subir: !cabeEmbaixo });
  }, [aberto, opcoes.length, usarBusca]);

  // Foco: a busca quando existe, senão a lista (setas andam com a lista focada).
  useEffect(() => {
    if (!aberto) return;
    if (usarBusca) campoBusca.current?.focus();
    else lista.current?.focus();
  }, [aberto, usarBusca]);

  // Fecha ao clicar fora e ao rolar a página (a lista é fixa ao gatilho).
  useEffect(() => {
    if (!aberto) return;
    function fora(e: PointerEvent) {
      const alvo = e.target as Node;
      if (gatilho.current?.contains(alvo) || lista.current?.contains(alvo)) return;
      setAberto(false);
    }
    function rolou() {
      setAberto(false);
    }
    document.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", rolou, true);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", rolou, true);
    };
  }, [aberto]);

  function teclado(e: React.KeyboardEvent) {
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setAberto(false);
      gatilho.current?.focus();
      return;
    }
    if (e.key === "Tab") {
      setAberto(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => {
        const n = filtradas.length;
        if (!n) return 0;
        return e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n;
      });
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setAtivo(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setAtivo(Math.max(0, filtradas.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const o = filtradas[ativo];
      if (o) escolher(o.valor);
      return;
    }
    // Letra inicial pula para a opção (B12).
    if (usarBusca) return;
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const letra = e.key.toLowerCase();
      const n = filtradas.length;
      for (let k = 1; k <= n; k++) {
        const o = filtradas[(ativo + k) % n];
        if (o?.rotulo.toLowerCase().startsWith(letra)) {
          setAtivo((ativo + k) % n);
          break;
        }
      }
    }
  }

  const subtxt = atual?.rotulo ?? (controlado && selecionado ? selecionado : "");

  return (
    <div className={`selecao ${compacta ? "compacta" : ""} ${className}`.trim()}>
      {rotulo ? (
        <span className="selecao-rotulo" id={idRotulo}>
          {rotulo}
        </span>
      ) : null}

      <button
        ref={gatilho}
        type="button"
        id={id}
        className="selecao-gatilho"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idLista : undefined}
        aria-labelledby={rotulo ? idRotulo : undefined}
        aria-label={!rotulo ? ariaLabel : undefined}
        aria-invalid={invalido || undefined}
        disabled={disabled}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={teclado}
        data-vazio={!subtxt || undefined}
      >
        <span className="selecao-texto">{subtxt || placeholder}</span>
        <IconeSeta tamanho={14} className="selecao-seta" />
      </button>

      {name ? <input type="hidden" name={name} value={selecionado} required={required} /> : null}

      {aberto ? (
        <div
          className={`selecao-painel ${media.subir ? "acima" : ""}`}
          style={
            media.subir
              ? { bottom: media.y, width: Math.max(media.w, 180) }
              : { top: media.y, width: Math.max(media.w, 180) }
          }
        >
          {usarBusca ? (
            <input
              ref={campoBusca}
              className="selecao-busca"
              type="text"
              value={termo}
              placeholder="Buscar…"
              onChange={(e) => {
                setTermo(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={teclado}
              aria-label="Buscar opção"
            />
          ) : null}

          <ul
            ref={lista}
            id={idLista}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${idAuto}-${ativo}`}
            aria-labelledby={rotulo ? idRotulo : undefined}
            onKeyDown={teclado}
          >
            {filtradas.length === 0 ? (
              <li className="selecao-vazio">Nada com esse nome</li>
            ) : (
              filtradas.map((o, i) => (
                <li
                  key={o.valor}
                  id={`${idAuto}-${i}`}
                  role="option"
                  aria-selected={o.valor === selecionado}
                  className={`selecao-item ${i === ativo ? "ativo" : ""}`}
                  onMouseEnter={() => setAtivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(o.valor)}
                >
                  <span>{o.rotulo}</span>
                  {o.valor === selecionado ? <span className="selecao-check" aria-hidden="true">✓</span> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}