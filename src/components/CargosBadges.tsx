import { IconeEscudo, IconeEstrela, IconePin } from "@/components/Icones";

type TamanhoBadge = "pequeno" | "padrao" | "grande";

type BadgeTurmaProps = {
  sala?: string | null;
  corSala?: string | null;
  tamanho?: TamanhoBadge;
  className?: string;
};

export function BadgeTurma({
  sala,
  corSala = "var(--ciano, #3FC2BC)",
  tamanho = "padrao",
  className = "",
}: BadgeTurmaProps) {
  if (!sala) return null;
  const cor = corSala || "var(--ciano, #3FC2BC)";

  return (
    <span
      className={`badge-cargo badge-cargo-turma badge-${tamanho} ${className}`}
      style={{ ["--cor-turma" as string]: cor }}
      title={`Turma escolar ${sala}`}
    >
      <span className="badge-led-ponto" style={{ background: cor }} aria-hidden="true" />
      <span className="badge-cargo-texto">{sala}</span>
    </span>
  );
}

type BadgeCargoProps = {
  role?: "super_adm" | "adm" | "aluno" | string | null;
  tamanho?: TamanhoBadge;
  className?: string;
};

export function BadgeCargo({
  role,
  tamanho = "padrao",
  className = "",
}: BadgeCargoProps) {
  if (role === "super_adm") {
    return (
      <span
        className={`badge-cargo badge-cargo-super-adm badge-${tamanho} ${className}`}
        title="Super Administrador da Plataforma"
      >
        <IconeEscudo tamanho={tamanho === "pequeno" ? 10 : tamanho === "grande" ? 14 : 12} />
        <span className="badge-cargo-texto">Super ADM</span>
      </span>
    );
  }

  if (role === "adm") {
    return (
      <span
        className={`badge-cargo badge-cargo-adm badge-${tamanho} ${className}`}
        title="Administrador da Plataforma"
      >
        <IconeEscudo tamanho={tamanho === "pequeno" ? 10 : tamanho === "grande" ? 14 : 12} />
        <span className="badge-cargo-texto">ADM</span>
      </span>
    );
  }

  return null;
}

type BadgeFixadoProps = {
  tamanho?: TamanhoBadge;
  className?: string;
  label?: string;
};

export function BadgeFixado({
  tamanho = "padrao",
  className = "",
  label = "Fixado",
}: BadgeFixadoProps) {
  return (
    <span
      className={`badge-cargo badge-cargo-fixado badge-${tamanho} ${className}`}
      title="Estudante fixado em destaque oficial"
    >
      <IconePin tamanho={tamanho === "pequeno" ? 10 : tamanho === "grande" ? 14 : 11} />
      <span className="badge-cargo-texto">{label}</span>
    </span>
  );
}

type BadgeDestaqueProps = {
  tamanho?: TamanhoBadge;
  className?: string;
  label?: string;
};

export function BadgeDestaque({
  tamanho = "padrao",
  className = "",
  label = "Destaque",
}: BadgeDestaqueProps) {
  return (
    <span
      className={`badge-cargo badge-cargo-destaque badge-${tamanho} ${className}`}
      title="Estudante reconhecido em destaque"
    >
      <IconeEstrela preenchida tamanho={tamanho === "pequeno" ? 10 : tamanho === "grande" ? 14 : 11} />
      <span className="badge-cargo-texto">{label}</span>
    </span>
  );
}

type LinhaCargosProps = {
  aluno?: {
    sala?: string | null;
    corSala?: string | null;
    fixado?: boolean | null;
    destaque?: boolean | null;
  } | null;
  role?: "super_adm" | "adm" | "aluno" | string | null;
  showSala?: boolean;
  tamanho?: TamanhoBadge;
  className?: string;
};

export function LinhaCargos({
  aluno,
  role,
  showSala = true,
  tamanho = "padrao",
  className = "",
}: LinhaCargosProps) {
  if (!aluno && !role) return null;

  return (
    <div className={`linha-cargos-container linha-cargos-${tamanho} ${className}`}>
      {showSala && aluno?.sala ? (
        <BadgeTurma
          sala={aluno.sala}
          corSala={aluno.corSala}
          tamanho={tamanho}
        />
      ) : null}

      {role ? <BadgeCargo role={role} tamanho={tamanho} /> : null}

      {aluno?.fixado ? <BadgeFixado tamanho={tamanho} /> : null}

      {aluno?.destaque ? <BadgeDestaque tamanho={tamanho} /> : null}
    </div>
  );
}
