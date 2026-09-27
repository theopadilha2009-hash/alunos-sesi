"use client";

/**
 * O "Remover" do painel `/adm`, com confirmação.
 *
 * O `PainelAlunos` é Server Component — cada botão é um `<form>` apontando para
 * uma Server Action, sem estado no cliente. `confirm` só existe no browser, daí
 * este recorte mínimo.
 *
 * Sem ele, o botão ficava a ~6px de "Destacar", com 24px de altura, disparando
 * um DELETE de verdade no primeiro toque errado — e sem desfazer. O CRM
 * (`PainelAdmIntegrado`) já confirmava; o painel não. O texto é o mesmo dos dois
 * lugares de propósito.
 */
export function BotaoRemover({
  id,
  nome,
  acao,
}: {
  id: string;
  nome: string;
  acao: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(`Tem certeza que deseja excluir ${nome}? Esta ação é irreversível.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="mini botao-perigo" title="Remove o aluno">
        Remover
      </button>
    </form>
  );
}
