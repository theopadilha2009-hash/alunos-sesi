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

type BadgeExtraProps = {
  tamanho?: TamanhoBadge;
  className?: string;
  label?: string;
  title?: string;
};

export function BadgeExtra({
  tamanho = "padrao",
  className = "",
  label = "+ Fixado / Destaque",
  title = "Cargos e reconhecimentos adicionais",
}: BadgeExtraProps) {
  return (
    <span
      className={`badge-cargo badge-cargo-extra badge-${tamanho} ${className}`}
      title={title}
    >
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
  agruparExtras?: boolean;
};

export function LinhaCargos({
  aluno,
  role,
  showSala = true,
  tamanho = "padrao",
  className = "",
  agruparExtras = true,
}: LinhaCargosProps) {
  if (!aluno && !role) return null;

  const ehSuper = role === "super_adm";
  const ehAdm = role === "adm";
  const temRole = ehSuper || ehAdm;
  const temFixado = Boolean(aluno?.fixado);
  const temDestaque = Boolean(aluno?.destaque);

  // Quando agruparExtras estiver ativo e houver cargo principal mais múltiplos destaques:
  const agrupar = agruparExtras && temRole && temFixado && temDestaque;

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

      {agrupar ? (
        <BadgeExtra
          tamanho={tamanho}
          label={tamanho === "pequeno" ? "+ 2" : "+ Fixado / Destaque"}
          title="Aluno Fixado no Topo & Destaque Administrativo Oficial"
        />
      ) : (
        <>
          {temFixado ? <BadgeFixado tamanho={tamanho} /> : null}
          {temDestaque ? <BadgeDestaque tamanho={tamanho} /> : null}
        </>
      )}
    </div>
  );
}
