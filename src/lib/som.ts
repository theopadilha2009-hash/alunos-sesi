/**
 * Efeitos festivos: som de estrela e confetes.
 *
 * Os dois são opcionais. O gate mora aqui — mute persistido (`sesi.som`, mesmo
 * padrão de `tema.ts`) e `prefers-reduced-motion` — e o `canvas-confetti` só é
 * baixado quando o efeito realmente vai tocar. Quem quiser oferecer um botão
 * de ligar/desligar chama `definirSom`; UI não mora neste módulo.
 */

/** Chave do mute no localStorage. Ausente = ligado. */
export const CHAVE_SOM = "sesi.som";

/**
 * O usuário deixou som e confetes ligados? Padrão é ligado; storage bloqueado
 * (modo privado) também cai no padrão.
 */
export function somLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE_SOM) !== "desligado";
  } catch {
    return true;
  }
}

/** Liga/desliga som e confetes. Persiste para as próximas visitas. */
export function definirSom(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE_SOM, ligado ? "ligado" : "desligado");
  } catch {
    // idem tema: a escolha vale só nesta navegação
  }
}

/** O sistema pediu menos animação? `matchMedia` pode não existir em teste. */
function movimentoReduzido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Síntese de áudio cristalino usando Web Audio API.
 * 100% nativo do navegador, sem downloads de arquivos de áudio externos,
 * zero latência e com volume suave calibrado.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Toca um acorde pentatônico suave e cristalino ao votar/estrelar */
export function tocarSomEstrela() {
  if (!somLigado()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const agora = ctx.currentTime;
    // Frequências harmoniosas (Dó5, Mi5, Sol5, Si5)
    const notas = [523.25, 659.25, 783.99, 987.77];

    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, agora + i * 0.04);

      gain.gain.setValueAtTime(0.0001, agora + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.045 / (i + 1), agora + i * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(agora + i * 0.04);
      osc.stop(agora + i * 0.04 + 0.36);
    });
  } catch {
    // Silencia em navegadores sem permissão de áudio
  }
}

/** Dispara uma explosão festiva de confetes com as cores oficiais do SESI */
export function dispararConfetes(x?: number, y?: number) {
  if (typeof window === "undefined") return;
  if (!somLigado()) return;
  // Reduzir movimento desliga o confete antes de baixar o chunk da lib
  if (movimentoReduzido()) return;

  const coresSesi = ["#3fc2bc", "#38b95d", "#f3b544", "#d74d42", "#02609e"];

  // Converte coordenadas absolutas de tela para fração 0 a 1 do viewport
  const origemX = x !== undefined ? x / window.innerWidth : 0.5;
  const origemY = y !== undefined ? y / window.innerHeight : 0.5;

  void import("canvas-confetti")
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { x: origemX, y: origemY },
        colors: coresSesi,
        ticks: 160,
        gravity: 1.1,
        scalar: 0.85,
        disableForReducedMotion: true,
      });
    })
    .catch(() => {
      // sem o chunk o efeito não acontece; nada quebra por isso
    });
}