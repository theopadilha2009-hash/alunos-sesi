"use client";

import { useActionState, useMemo, useState } from "react";
import { importarLista } from "@/app/adm/acoes";
import { ESTADO_INICIAL } from "@/app/adm/estado";
import { parseLista } from "@/lib/importar";

const EXEMPLO = `nome\tsala\tlinkedin\tgithub
Ana Silva\t3ºA\thttps://www.linkedin.com/in/ana-silva\tanasilva
Bruno Costa\t2ºB\t\tbrunocosta`;

export function ImportarLista() {
  const [lista, setLista] = useState("");
  const [estado, acao, pendente] = useActionState(importarLista, ESTADO_INICIAL);

  // A prévia roda aqui no navegador: o parser é puro e não fala com o
  // servidor, então o ADM vê o que vai acontecer antes de apertar o botão.
  const previa = useMemo(() => parseLista(lista), [lista]);
  const nomeSeparador =
    previa.separador === "\t"
      ? "tabulação"
      : previa.separador === ","
        ? "vírgula"
        : "ponto e vírgula";

  return (
    <section className="bloco">
      <header>
        <h2>Colar a lista da turma</h2>
        <span className="meta" style={{ fontSize: "0.8rem", color: "var(--faint)" }}>
          uma linha por aluno
        </span>
      </header>

      <div className="corpo">
        <p style={{ marginTop: 0, color: "var(--dim)", fontSize: "0.9rem" }}>
          Cole direto da planilha. A ordem esperada é{" "}
          <b>nome, sala, LinkedIn, GitHub</b> — mas se a primeira linha tiver
          cabeçalho, as colunas são ligadas pelo nome e a ordem deixa de
          importar. LinkedIn aceita a URL inteira ou só o handle.
        </p>

        <form action={acao}>
          <div className="campo">
            <label htmlFor="lista">Lista</label>
            <textarea
              id="lista"
              name="lista"
              value={lista}
              onChange={(e) => setLista(e.target.value)}
              placeholder={EXEMPLO}
              spellCheck={false}
            />
          </div>

          {lista.trim() ? (
            <>
              <div className="previa">
                <div>
                  <b>{previa.linhas.length}</b>
                  <span>entram</span>
                </div>
                <div>
                  <b>{previa.duplicadas}</b>
                  <span>duplicadas</span>
                </div>
                <div>
                  <b>{previa.erros.length}</b>
                  <span>com problema</span>
                </div>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--faint)", margin: "0 0 0.9rem" }}>
                Separador lido: {nomeSeparador}
                {previa.tinhaCabecalho ? " · cabeçalho detectado" : " · sem cabeçalho"}
              </p>

              {previa.linhas.length > 0 ? (
                <ul className="erros" style={{ color: "var(--dim)" }}>
                  {previa.linhas.slice(0, 3).map((l) => (
                    <li key={l.linha}>
                      <code>{l.nome}</code> — {l.sala}
                      {l.github ? ` · gh:${l.github}` : ""}
                      {l.linkedin ? " · in" : ""}
                    </li>
                  ))}
                  {previa.linhas.length > 3 ? (
                    <li>…e mais {previa.linhas.length - 3}</li>
                  ) : null}
                </ul>
              ) : null}
            </>
          ) : null}

          {estado.mensagem ? (
            <p className={`recado ${estado.ok ? "recado-ok" : "recado-erro"}`} role="status">
              {estado.mensagem}
            </p>
          ) : null}

          {estado.erros?.length ? (
            <ul className="erros">
              {estado.erros.map((e, i) => (
                <li key={`${e.linha}-${i}`}>
                  linha {e.linha}: <code>{e.motivo}</code> — {e.texto}
                </li>
              ))}
            </ul>
          ) : null}

          <p style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="submit"
              className="botao"
              disabled={pendente || previa.linhas.length === 0}
            >
              {pendente ? "Aplicando…" : `Aplicar ${previa.linhas.length || ""}`.trim()}
            </button>
            <button
              type="button"
              className="botao botao-fraco"
              onClick={() => setLista("")}
              disabled={pendente || !lista}
            >
              Limpar
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
