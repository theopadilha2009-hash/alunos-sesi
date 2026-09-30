/**
 * Turmas oficiais de Desenvolvimento de Sistemas e Técnicos SESI SENAI.
 * Lista padronizada para registro, migração e agrupamento de estudantes.
 */
export const TURMAS_OFICIAIS = [
  "DSM3",
  "DSM3-25",
  "DS1-25",
  "DS2-25",
  "DS4-25",
  "DS1-26",
  "DS2-26",
  "DS1-24",
  "DS2-24",
] as const;

export type TurmaOficial = (typeof TURMAS_OFICIAIS)[number];
