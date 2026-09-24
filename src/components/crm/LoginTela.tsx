"use client";

import { useActionState, useState } from "react";
import { cadastroAction, loginAction, type EstadoAcaoCrm } from "@/app/acoes-crm";
import { Roseta } from "@/components/Roseta";
import { TemaToggle } from "@/components/TemaToggle";

export function LoginTela() {
  const [modo, setModo] = useState<"login" | "cadastro">("login");

  const [estadoLogin, formActionLogin, carregandoLogin] = useActionState(loginAction, {
    ok: false,
  });

  const [estadoCadastro, formActionCadastro, carregandoCadastro] = useActionState(
    cadastroAction,
    { ok: false },
  );

  return (
    <div className="login-tela-container">
      <div className="login-mesh-glow" aria-hidden="true" />

      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.8rem" }}>
          <TemaToggle />
        </div>
        <header className="login-topo">
          <div className="login-marca">
            <Roseta tamanho={38} girando />
            <div>
              <span className="login-titulo-marca">ALUNOS SESI</span>
              <span className="login-sub-marca">CRM & PORTFÓLIO ESCOLAR</span>
            </div>
          </div>
          <p className="login-subtexto">
            {modo === "login"
              ? "Entre com sua conta para acessar seu portfólio, projetos e gerenciar criações."
              : "Crie seu acesso direto para montar seu perfil personalizado no portfólio."}
          </p>
        </header>

        {/* Abas Entrar / Criar Conta */}
        <div className="login-abas" role="tablist">
          <button
            type="button"
            className={`login-aba-btn ${modo === "login" ? "login-aba-ativa" : ""}`}
            onClick={() => setModo("login")}
            role="tab"
            aria-selected={modo === "login"}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`login-aba-btn ${modo === "cadastro" ? "login-aba-ativa" : ""}`}
            onClick={() => setModo("cadastro")}
            role="tab"
            aria-selected={modo === "cadastro"}
          >
            Criar Conta
          </button>
        </div>

        {modo === "login" ? (
          <form action={formActionLogin} className="login-form">
            {estadoLogin.mensagem ? (
              <p className="recado recado-erro" role="alert">
                {estadoLogin.mensagem}
              </p>
            ) : null}

            <div className="campo">
              <label htmlFor="login-user">Usuário</label>
              <input
                id="login-user"
                name="username"
                type="text"
                placeholder="Seu usuário"
                required
                autoComplete="username"
              />
            </div>

            <div className="campo">
              <label htmlFor="login-pass">Senha</label>
              <input
                id="login-pass"
                name="senha"
                type="password"
                placeholder="Sua senha"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="botao botao-primario-grande w-full"
              disabled={carregandoLogin}
            >
              {carregandoLogin ? "Entrando..." : "Acessar o CRM →"}
            </button>
          </form>
        ) : (
          <form action={formActionCadastro} className="login-form">
            {estadoCadastro.mensagem ? (
              <p className="recado recado-erro" role="alert">
                {estadoCadastro.mensagem}
              </p>
            ) : null}

            <div className="campo">
              <label htmlFor="cad-nome">Seu Nome Completo</label>
              <input
                id="cad-nome"
                name="nome"
                type="text"
                placeholder="Ex.: Theo Padilha"
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="cad-sala">Sua Sala / Turma</label>
              <input
                id="cad-sala"
                name="sala"
                type="text"
                placeholder="Ex.: DSM3"
                defaultValue="DSM3"
                required
              />
              {/* Só turma que já existe: sala nova quem cria é o ADM, pelo
                  painel. Antes o cadastro inseria em `salas` com nome livre. */}
              <span className="dica-campo">Use o nome de uma turma já cadastrada.</span>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label htmlFor="cad-user">Usuário de Login</label>
                <input
                  id="cad-user"
                  name="username"
                  type="text"
                  placeholder="Seu usuário"
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="cad-pass">Senha</label>
                <input
                  id="cad-pass"
                  name="senha"
                  type="password"
                  placeholder="Crie uma senha"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="botao botao-primario-grande w-full"
              disabled={carregandoCadastro}
            >
              {carregandoCadastro ? "Criando conta..." : "Criar Conta & Personalizar Perfil →"}
            </button>
          </form>
        )}

        <footer className="login-rodape-card">
          <span>Ambiente Escolar Seguro · Rede SESI Tech 2026</span>
        </footer>
      </div>
    </div>
  );
}
