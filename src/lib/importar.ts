/**
 * Parser da lista colada no painel do ADM.
 *
 * A entrada é texto solto vindo de planilha, então o parser é deliberadamente
 * tolerante: aceita tabulação, vírgula ou ponto e vírgula, com ou sem linha de
 * cabeçalho, e aceita link completo ou só o handle. Quem normaliza o link é o
 * `links.ts` — aqui a gente só separa os campos e diz o que não deu para ler.
 *
 * Sem imports de propósito: testado direto pelo `node --test`.
 */

export type Separador = "\t" | "," | ";";

export type LinhaBruta = {
  /** Número da linha no texto colado, começando em 1 — é o que o ADM vê. */
  linha: number;
  nome: string;
  sala: string;
  linkedin: string;
  github: string;
};

export type ErroLinha = { linha: number; texto: string; motivo: string };

export type ResultadoParse = {
  linhas: LinhaBruta[];
  erros: ErroLinha[];
  duplicadas: number;
  separador: Separador;
  tinhaCabecalho: boolean;
};

const SEPARADORES: Separador[] = ["\t", ",", ";"];

const COLUNA_NOME = ["nome", "aluno", "aluna", "name"];
const COLUNA_SALA = ["sala", "turma", "classe", "room"];
const COLUNA_LINKEDIN = ["linkedin", "in"];
const COLUNA_GITHUB = ["github", "git", "gh"];

function chave(s: string): string {
  return s.trim().toLowerCase();
}

/** Escolhe o separador que mais aparece na linha. Sem nenhum, assume tab. */
export function detectarSeparador(linha: string): Separador {
  let melhor: Separador = "\t";
  let maior = 0;
  for (const sep of SEPARADORES) {
    const n = linha.split(sep).length - 1;
    if (n > maior) {
      maior = n;
      melhor = sep;
    }
  }
  return melhor;
}

function acharColuna(cabecalhos: string[], candidatos: string[]): number {
  return cabecalhos.findIndex((h) => candidatos.includes(chave(h)));
}

/**
 * Lê a lista colada.
 *
 * Cabeçalho é opcional, mas quando existe ele manda: as colunas são ligadas
 * pelo nome, então "github, nome, sala" funciona igual a "nome, sala, github".
 * Sem cabeçalho, a ordem posicional é nome, sala, linkedin, github.
 */
export function parseLista(texto: string): ResultadoParse {
  const cruas = String(texto ?? "").split(/\r?\n/);
  const uteis = cruas
    .map((t, i) => ({ texto: t, linha: i + 1 }))
    .filter((l) => l.texto.trim() !== "");

  if (uteis.length === 0) {
    return {
      linhas: [],
      erros: [],
      duplicadas: 0,
      separador: "\t",
      tinhaCabecalho: false,
    };
  }

  const separador = detectarSeparador(uteis[0].texto);

  let mapa: { nome: number; sala: number; linkedin: number; github: number } = {
    nome: 0,
    sala: 1,
    linkedin: 2,
    github: 3,
  };

  let inicio = 0;
  const primeira = uteis[0].texto.split(separador).map(chave);
  const iNome = acharColuna(primeira, COLUNA_NOME);
  const iSala = acharColuna(primeira, COLUNA_SALA);
  const tinhaCabecalho = iNome >= 0 && iSala >= 0;

  if (tinhaCabecalho) {
    mapa = {
      nome: iNome,
      sala: iSala,
      linkedin: acharColuna(primeira, COLUNA_LINKEDIN),
      github: acharColuna(primeira, COLUNA_GITHUB),
    };
    inicio = 1;
  }

  const linhas: LinhaBruta[] = [];
  const erros: ErroLinha[] = [];
  const vistas = new Set<string>();
  let duplicadas = 0;

  for (let i = inicio; i < uteis.length; i++) {
    const { texto: bruto, linha } = uteis[i];
    const celulas = bruto.split(separador).map((c) => c.trim());
    const pega = (idx: number) => (idx >= 0 ? (celulas[idx] ?? "") : "");

    const nome = pega(mapa.nome);
    const sala = pega(mapa.sala);
    const linkedin = pega(mapa.linkedin);
    const github = pega(mapa.github);

    if (!nome) {
      erros.push({ linha, texto: bruto, motivo: "sem nome" });
      continue;
    }
    if (!sala) {
      erros.push({ linha, texto: bruto, motivo: "sem sala" });
      continue;
    }
    if (nome.length < 2) {
      erros.push({ linha, texto: bruto, motivo: "nome curto demais" });
      continue;
    }

    const assinatura = `${chave(nome)}|${chave(sala)}`;
    if (vistas.has(assinatura)) {
      duplicadas++;
      continue;
    }
    vistas.add(assinatura);

    linhas.push({ linha, nome, sala, linkedin, github });
  }

  return { linhas, erros, duplicadas, separador, tinhaCabecalho };
}
