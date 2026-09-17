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

export type Aluno = {
  id: string;
  nome: string;
  slug: string;
  sala_id: string | null;
  linkedin: string | null;
  github: string | null;
  bio: string | null;
  foto_url: string | null;
  fixado: boolean;
  destaque: boolean;
  estrelas: number;
};

/** Aluno já com o nome da sala resolvido, do jeito que a tela consome. */
export type AlunoNaTela = Aluno & {
  sala: string | null;
  cor: string;
};
