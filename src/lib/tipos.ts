export type Sala = {
  id: string;
  nome: string;
  curso: string | null;
  turno: string | null;
  ordem: number;
};

export type RetratoSala = Sala & {
  alunos: number;
  com_linkedin: number;
  com_github: number;
  estrelas: number;
  completude: number;
};

export type ProjetoAluno = {
  id: string;
  titulo: string;
  descricao: string;
  link?: string;
  imagem?: string;
};

export type MidiaAluno = {
  url: string;
  tipo: "imagem" | "gif";
  legenda?: string;
};

export type StickerPerfil = {
  id: string;
  url: string;
  tipo: "gif" | "sticker";
  rotulo?: string;
  x: number; // porcentagem horizontal (0 a 100)
  y: number; // porcentagem vertical (0 a 100)
  tamanho?: number; // largura em px
  rotacao?: number; // rotação em graus
  alvo?: "banner" | "projeto";
  projetoId?: string;
};

export type DesafioHackathon = {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: "Robótica FLL" | "Desenvolvimento Web" | "Inteligência Artificial" | "Automação IoT" | "Design & UI/UX";
  prazo: string;
  recompensa: string;
  insigniaIcone: string;
  descricao: string;
  criterios: string[];
  submissoesCount: number;
  ativo: boolean;
};

export type SubmissaoDesafio = {
  id: string;
  desafioId: string;
  alunoId: string;
  alunoNome: string;
  alunoSala: string;
  tituloProjeto: string;
  linkProjeto: string;
  descricao: string;
  aprovado?: boolean;
  criadoEm: string;
};

export type Aluno = {
  id: string;
  nome: string;
  slug: string;
  sala_id: string | null;
  linkedin: string | null;
  github: string | null;
  instagram: string | null;
  bio: string | null;
  foto_url: string | null;
  fixado: boolean;
  destaque: boolean;
  estrelas: number;
  projetos?: ProjetoAluno[];
  midias?: MidiaAluno[];
  stickers?: StickerPerfil[];
  habilidades_votos?: Record<string, number>;
  insignias?: string[];
};

/** Aluno já com o nome da sala resolvido, do jeito que a tela consome. */
export type AlunoNaTela = Aluno & {
  sala: string | null;
  cor: string;
  habilidades?: string[];
};

export type UsuarioSessao = {
  id: string;
  username: string;
  role: "super_adm" | "adm" | "aluno";
  alunoId?: string | null;
  nome?: string | null;
  sala?: string | null;
  avatar?: string | null;
  email?: string | null;
};
