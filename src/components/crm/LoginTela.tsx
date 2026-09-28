"use client";

import { useActionState, useState } from "react";
import {
  ativarAcessoAction,
  cadastroAction,
  loginAction,
  type EstadoAcaoCrm,
} from "@/app/acoes-crm";
import { Roseta } from "@/components/Roseta";
import { TemaToggle } from "@/components/TemaToggle";
import { aoSetasDasAbas } from "@/lib/abas";
import { DOMINIO_EMAIL_ESCOLA } from "@/lib/limites";

/**
 * Põe o domínio da escola no campo de usuário.
 *
 * O aluno digita só a parte local — `arthur_oliveira150` — e esquece o resto,
 * e aí o login dele deixa de ser o e-mail que a escola deu. No celular, digitar
 * `@estudante.sesisenai.org.br` são 26 caracteres a mais para errar.
 *
 * Não mexe em campo vazio (não há o que completar) nem em campo que já tem `@`
 * (o aluno digitou o endereço inteiro, ou escolheu outro usuário).
 */
function completarDominio(idCampo: string) {
  const campo = document.getElementById(idCampo) as HTMLInputElement | null;
  if (!campo) return;
  const valor = campo.value.trim();
  if (!valor || valor.includes("@")) {
    campo.focus();
    return;
  }
  campo.value = `${valor}@${DOMINIO_EMAIL_ESCOLA}`;
  campo.focus();
}

export function LoginTela() {
  const [modo, setModo] = useState<"login" | "cadastro" | "ativar">("login");

  const [estadoLogin, formActionLogin, carregandoLogin] = useActionState(loginAction, {
    ok: false,
  });

  const [estadoCadastro, formActionCadastro, carregandoCadastro] = useActionState(
    cadastroAction,
    { ok: false },
  );

  const [estadoAtivar, formActionAtivar, carregandoAtivar] = useActionState(
    ativarAcessoAction,
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
              : modo === "cadastro"
                ? "Crie seu acesso direto para montar seu perfil personalizado no portfólio."
                : "Você já está na lista da turma: use o código do seu professor para assumir o seu perfil."}
          </p>
        </header>

        {/* Abas Entrar / Criar Conta */}
        <div className="login-abas" role="tablist">
          <button
            type="button"
            id="login-tab-login"
            className={`login-aba-btn ${modo === "login" ? "login-aba-ativa" : ""}`}
            onClick={() => setModo("login")}
            onKeyDown={aoSetasDasAbas}
            role="tab"
            aria-selected={modo === "login"}
            aria-controls="login-painel-login"
            tabIndex={modo === "login" ? 0 : -1}
          >
            Entrar
          </button>
          <button
            type="button"
            id="login-tab-cadastro"
            className={`login-aba-btn ${modo === "cadastro" ? "login-aba-ativa" : ""}`}
            onClick={() => setModo("cadastro")}
            onKeyDown={aoSetasDasAbas}
            role="tab"
            aria-selected={modo === "cadastro"}
            aria-controls="login-painel-cadastro"
            tabIndex={modo === "cadastro" ? 0 : -1}
          >
            Criar Conta
          </button>
          <button
            type="button"
            id="login-tab-ativar"
            className={`login-aba-btn ${modo === "ativar" ? "login-aba-ativa" : ""}`}
            onClick={() => setModo("ativar")}
            onKeyDown={aoSetasDasAbas}
            role="tab"
            aria-selected={modo === "ativar"}
            aria-controls="login-painel-ativar"
            tabIndex={modo === "ativar" ? 0 : -1}
          >
            Tenho um Código
          </button>
        </div>

        <div
          id="login-painel-login"
          role="tabpanel"
          aria-labelledby="login-tab-login"
          style={{ display: modo === "login" ? "block" : "none" }}
        >
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
                placeholder="Seu usuário ou e-mail"
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
        </div>

        <div
          id="login-painel-cadastro"
          role="tabpanel"
          aria-labelledby="login-tab-cadastro"
          style={{ display: modo === "cadastro" ? "block" : "none" }}
        >
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
                  placeholder="Seu usuário ou e-mail"
                  required
                />
                {/* O e-mail institucional é o login natural do aluno, mas o
                    cadastro o recusava — quem tentasse não entendia o motivo.
                    O domínio vai escrito para o aluno não digitar o errado: o
                    `alunos.email` do perfil exige exatamente este sufixo. */}
                <span className="dica-campo">
                  Pode ser o seu e-mail da escola.{" "}
                  <button
                    type="button"
                    className="dica-acao"
                    onClick={() => completarDominio("cad-user")}
                  >
                    Completar com @{DOMINIO_EMAIL_ESCOLA}
                  </button>
                </span>
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
        </div>

        <div
          id="login-painel-ativar"
          role="tabpanel"
          aria-labelledby="login-tab-ativar"
          style={{ display: modo === "ativar" ? "block" : "none" }}
        >
          <form action={formActionAtivar} className="login-form">
            {estadoAtivar.mensagem ? (
              <p className="recado recado-erro" role="alert">
                {estadoAtivar.mensagem}
              </p>
            ) : null}

            <div className="campo">
              <label htmlFor="atv-codigo">Código de Ativação</label>
              <input
                id="atv-codigo"
                name="codigo"
                type="text"
                placeholder="SESI-XXXX-XXXX"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              {/* O código é ditado pelo professor. O alfabeto não tem I, L, O
                  nem U justamente para não haver dúvida em voz alta, e o que
                  o aluno digitar no lugar delas é dobrado de volta. */}
              <span className="dica-campo">
                Peça o código ao seu professor. Ele expira em 7 dias.
              </span>
            </div>

            <div className="campo">
              <label htmlFor="atv-user">Usuário de Login</label>
              <input
                id="atv-user"
                name="username"
                type="text"
                placeholder="Seu usuário ou e-mail"
                required
                autoComplete="username"
              />
              <span className="dica-campo">
                Pode ser o seu e-mail da escola.{" "}
                <button
                  type="button"
                  className="dica-acao"
                  onClick={() => completarDominio("atv-user")}
                >
                  Completar com @{DOMINIO_EMAIL_ESCOLA}
                </button>
              </span>
            </div>

            <div className="campo">
              <label htmlFor="atv-pass">Crie sua Senha</label>
              <input
                id="atv-pass"
                name="senha"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="botao botao-primario-grande w-full"
              disabled={carregandoAtivar}
            >
              {carregandoAtivar ? "Ativando..." : "Ativar meu acesso →"}
            </button>
          </form>
        </div>

        <footer className="login-rodape-card">
          <span>Ambiente Escolar Seguro · Rede SESI Tech 2026</span>
        </footer>
      </div>
    </div>
  );
}
