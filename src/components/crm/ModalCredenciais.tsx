"use client";

import { useActionState, useEffect, useRef } from "react";
import { definirCredenciaisAction } from "@/app/adm/acoes";
import { ESTADO_INICIAL } from "@/app/adm/estado";
import { IconeChave } from "@/components/Icones";
import { useTravaDeFoco } from "@/lib/foco";
import type { AlunoNaTela } from "@/lib/tipos";

/**
 * O ADM define login e/ou senha de um aluno sem passar pelo código.
 *
 * O código de ativação continua sendo o caminho de primeira entrada; este
 * modal é para quando o ADM já sabe o que quer passar ao aluno. A senha
 * digitada aqui não é exibida de volta: quem a definiu já a tem.
 */
export function ModalCredenciais({
  aluno,
  onFechar,
}: {
  aluno: AlunoNaTela;
  onFechar: () => void;
}) {
  const [estado, formAction, salvando] = useActionState(
    definirCredenciaisAction,
    ESTADO_INICIAL,
  );
  const painelRef = useRef<HTMLDivElement | null>(null);
  useTravaDeFoco(painelRef);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div
        className="modal-credenciais"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credenciais-titulo"
        ref={painelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-credenciais-topo">
          <div>
            <span className="eyebrow">Credenciais</span>
            <h2 id="credenciais-titulo">{aluno.nome}</h2>
          </div>
          <button
            type="button"
            className="btn-acao-tabela"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <form action={formAction} className="formulario-corpo">
          <input type="hidden" name="alunoId" value={aluno.id} />

          <label className="campo-form">
            <span className="label-texto">Novo login (opcional)</span>
            <input
              type="text"
              name="username"
              className="input-texto"
              placeholder="Ex.: theo ou theo@estudante.sesisenai.org.br"
              autoComplete="off"
              autoFocus
            />
            <span className="campo-dica">
              Letras, números e os sinais . _ - @. Deixe vazio para manter o
              login atual.
            </span>
          </label>

          <div className="form-dupla">
            <label className="campo-form">
              <span className="label-texto">Nova senha (opcional)</span>
              <input
                type="password"
                name="novaSenha"
                className="input-texto"
                placeholder="8 a 100 caracteres"
                autoComplete="new-password"
              />
            </label>
            <label className="campo-form">
              <span className="label-texto">Confirmar senha</span>
              <input
                type="password"
                name="confirmarSenha"
                className="input-texto"
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
            </label>
          </div>

          <p className="campo-dica">
            Ao definir uma senha, o código de ativação pendente é invalidado.
            Sessões já abertas continuam valendo até expirar.
          </p>

          {estado.mensagem ? (
            <p
              className={`recado ${estado.ok ? "" : "recado-erro"}`.trim()}
              role="status"
              style={estado.ok ? { color: "var(--verde)" } : undefined}
            >
              {estado.mensagem}
            </p>
          ) : null}

          <div className="modal-credenciais-acoes">
            <button type="button" className="botao botao-secundario" onClick={onFechar}>
              Fechar
            </button>
            <button type="submit" className="botao botao-primario" disabled={salvando}>
              <IconeChave tamanho={15} />
              <span>{salvando ? "Salvando..." : "Salvar credenciais"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}