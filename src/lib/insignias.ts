/**
 * Insígnias: o que a turma já reconheceu no aluno.
 *
 * Derivadas, nunca declaradas. O aluno não escolhe a própria insígnia nem o ADM
 * concede na mão — ele conquista, e a insígnia aparece porque o número chegou lá.
 * Uma insígnia que se dá a si mesmo não é conquista, é enfeite, e o perfil já tem
 * enfeite de sobra no Estúdio.
 *
 * Por isso este módulo é puro: entra `estrelas` e `habilidades_votos`, sai a
 * lista. Mesmas entradas, mesma saída, sem banco no meio.
 *
 * ── Por que não há insígnia de desafio aqui ────────────────────────────────
 * `submissoes_desafios` (e a tabela `endossos`) é `revoke all` para `anon` e
 * `authenticated`: só a service_role lê. Derivar "concluiu o hackathon" exigiria
 * `clienteAdmin()` numa rota pública, e abrir a service_role para o visitante
 * anônimo é preço alto demais por um selo. As duas fontes usadas aqui —
 * `alunos.estrelas` e `alunos.habilidades_votos` — já são públicas, e o contador
 * de endossos é cache mantido por trigger sobre `public.endossos`, que é a
 * verdade. Quando houver insígnia de desafio, ela sai de uma view, não daqui.
 *
 * O JSONB `alunos.insignias` continua reservado e **sem escritor**: era o slot
 * que existia só no Studio. Gravar a insígnia que acabou de ser derivada criaria
 * a segunda verdade que este módulo existe para evitar — a lista ficaria parada
 * na data do último save, e o aluno veria o crachá que já perdeu (ou não veria o
 * que já ganhou) até editar o perfil de novo.
 */

/**
 * Ícone é um nome, não um componente: manter o módulo puro e testável.
 *
 * Os seis nomes são do vocabulário próprio das insígnias, não do catálogo
 * genérico de `components/icones.tsx`. São seis desenhos com significado
 * próprio — o selo é a parte que o aluno mostra — e reaproveitar um ícone de
 * interface para dois deles deixaria duas conquistas diferentes com a mesma
 * cara. Quem desenha é `components/Insignias.tsx`.
 */
export type IconeInsignia =
  | "estrela"
  | "pessoas"
  | "brilho"
  | "camadas"
  | "medalha"
  | "trofeu";

export interface Insignia {
  id: string;
  nome: string;
  descricao: string;
  icone: IconeInsignia;
  conquistada: boolean;
  /** `atual` já limitado ao alvo: barra de progresso que passa de 100% é bug. */
  progresso: { atual: number; alvo: number };
}

/** O mínimo que uma insígnia precisa saber do aluno. Não é `Aluno` de propósito. */
export interface PlacarDoAluno {
  estrelas: number;
  /** Nome da habilidade → nº de colegas que endossaram. */
  habilidades_votos?: Record<string, number> | null;
}

interface Regra {
  id: string;
  nome: string;
  descricao: string;
  icone: IconeInsignia;
  alvo: number;
  /** Quanto o aluno já tem, na mesma unidade do `alvo`. */
  medir: (placar: { estrelas: number; votos: number[] }) => number;
}

function inteiro(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
}

/**
 * A escada, na ordem em que aparece na tela: da primeira conquista à última.
 *
 * Ordem fixa, e não "conquistadas primeiro": o aluno que vê as mesmas seis caixas
 * sempre sabe onde olhar, e a caixa fechada com a barra andando é o que faz
 * alguém voltar ao perfil. Reordenar por conquista moveria a tela de baixo do
 * dono a cada estrela nova.
 */
const REGRAS: Regra[] = [
  {
    id: "estreia",
    nome: "Estreia",
    descricao: "Um colega marcou seu projeto com uma estrela.",
    icone: "estrela",
    alvo: 1,
    medir: ({ estrelas }) => estrelas,
  },
  {
    id: "endossado",
    nome: "Primeiros Endossos",
    descricao: "Três colegas confirmaram que você manda bem no que diz fazer.",
    icone: "pessoas",
    alvo: 3,
    medir: ({ votos }) => votos.reduce((soma, n) => soma + n, 0),
  },
  {
    id: "destaque",
    nome: "Destaque do Mural",
    descricao: "Cinco estrelas de colegas diferentes.",
    icone: "brilho",
    alvo: 5,
    medir: ({ estrelas }) => estrelas,
  },
  {
    id: "polivalente",
    nome: "Polivalente",
    descricao: "Endossado em três competências diferentes.",
    icone: "camadas",
    alvo: 3,
    medir: ({ votos }) => votos.filter((n) => n > 0).length,
  },
  {
    id: "referencia",
    nome: "Referência Técnica",
    descricao: "Cinco colegas endossaram a mesma competência sua.",
    icone: "medalha",
    alvo: 5,
    medir: ({ votos }) => (votos.length ? Math.max(...votos) : 0),
  },
  {
    id: "fenomeno",
    nome: "Fenômeno",
    descricao: "Quinze estrelas. A turma inteira já reparou.",
    icone: "trofeu",
    alvo: 15,
    medir: ({ estrelas }) => estrelas,
  },
];

/**
 * As seis insígnias do aluno, conquistadas ou não.
 *
 * Devolve a lista inteira, e não só as conquistadas: quem monta a tela precisa
 * das fechadas para mostrar o quanto falta. Filtrar por `conquistada` é uma
 * linha de quem chama — e é uma linha que só o teste pede, por isso não existe
 * um `idsDasInsignias()` exportado só para ele.
 *
 * Entrada torta não explode: `estrelas` ausente ou negativa vira 0, e contagem
 * de voto que não é número é ignorada. Este módulo já vai rodar em rota pública
 * com dado que veio do banco — se um dia a coluna vier suja, a página abre vazia
 * em vez de dar 500.
 */
export function insigniasDe(placar: PlacarDoAluno): Insignia[] {
  const estrelas = inteiro(placar?.estrelas);
  const votos = Object.values(placar?.habilidades_votos ?? {})
    .map(inteiro)
    .filter((n) => n > 0);
  const numeros = { estrelas, votos };

  return REGRAS.map((regra) => {
    const atual = Math.max(0, regra.medir(numeros));
    return {
      id: regra.id,
      nome: regra.nome,
      descricao: regra.descricao,
      icone: regra.icone,
      conquistada: atual >= regra.alvo,
      progresso: { atual: Math.min(atual, regra.alvo), alvo: regra.alvo },
    };
  });
}
