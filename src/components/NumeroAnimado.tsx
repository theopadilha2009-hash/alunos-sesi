"use client";

import { useEffect, useRef, useState } from "react";

const formato = new Intl.NumberFormat("pt-BR");

type Props = {
  valor: number;
  /** Duração da primeira contagem (do zero). Mudanças de valor usam ~60%. */
  duracaoMs?: number;
  className?: string;
};

// O Théo pediu números que CONTAM em vez de só aparecerem (19/10/2026): na
// primeira vez que o valor entra na tela ele sobe do zero; mudança posterior
// (ex.: estrelar) anima do valor anterior ao novo. SSR e primeiro paint
// mostram o valor final — sem layout shift, sem mismatch; a contagem só
// assume depois do mount.
export function NumeroAnimado({ valor, duracaoMs = 1100, className = "" }: Props) {
  const [mostrado, setMostrado] = useState(valor);
  const [visivel, setVisivel] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const anterior = useRef(valor);
  const primeira = useRef(true);
  const frame = useRef<number | null>(null);

  // A contagem espera o número existir na tela (uma vez só).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Fora da tela: congela no que está; `anterior` e `primeira` só avançam
    // quando a contagem roda de verdade, senão o número que entra depois
    // perderia a contagem do zero.
    if (!visivel) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const de = primeira.current ? 0 : anterior.current;
    const duracao = primeira.current ? duracaoMs : Math.round(duracaoMs * 0.6);
    primeira.current = false;
    anterior.current = valor;

    if (reduzir || de === valor) {
      setMostrado(valor);
      return;
    }

    let inicio: number | null = null;
    const passo = (agora: number) => {
      if (inicio === null) inicio = agora;
      const t = Math.min((agora - inicio) / duracao, 1);
      const facil = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      setMostrado(Math.round(de + (valor - de) * facil));
      frame.current = t < 1 ? requestAnimationFrame(passo) : null;
    };
    frame.current = requestAnimationFrame(passo);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [valor, visivel, duracaoMs]);

  return (
    <span ref={ref} className={`numero-animado ${className}`.trim()}>
      {formato.format(mostrado)}
    </span>
  );
}
