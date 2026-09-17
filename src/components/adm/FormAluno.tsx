"use client";

import { useActionState } from "react";
import { criarAluno } from "@/app/adm/acoes";
import { ESTADO_INICIAL } from "@/app/adm/estado";

export function FormAluno({ salas }: { salas: string[] }) {
  const [estado, acao, pendente] = useActionState(criarAluno, ESTADO_INICIAL);

  return (
    <section className="bloco">
      <header>
        <h2>Adicionar um aluno</h2>
      </header>
      <div className="corpo">
        <form action={acao}>
          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" name="nome" required minLength={2} maxLength={120} />
            </div>
            <div className="campo">
              <label htmlFor="sala">Sala</label>
              <input
                id="sala"
                name="sala"
                required
                list="salas-existentes"
                placeholder="3ºA"
              />
              <datalist id="salas-existentes">
                {salas.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="linkedin">LinkedIn</label>
              <input
                id="linkedin"
                name="linkedin"
                placeholder="linkedin.com/in/fulano"
              />
            </div>
            <div className="campo">
              <label htmlFor="github">GitHub</label>
              <input id="github" name="github" placeholder="fulano" />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="bio">Bio (opcional)</label>
            <input id="bio" name="bio" maxLength={280} placeholder="O que você curte fazer" />
          </div>

          {estado.mensagem ? (
            <p className={`recado ${estado.ok ? "recado-ok" : "recado-erro"}`} role="status">
              {estado.mensagem}
            </p>
          ) : null}

          <button type="submit" className="botao" disabled={pendente}>
            {pendente ? "Salvando…" : "Adicionar"}
          </button>
        </form>
      </div>
    </section>
  );
}
