export default function Carregando() {
  return (
    <div className="esq-pagina" role="status" aria-label="Carregando">
      <div className="esq esq-topo" />
      <div className="esq esq-linha" style={{ width: "38%" }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="esq-fileira">
          <div className="esq esq-avatar" />
          <div className="esq-pilha">
            <div className="esq esq-linha" style={{ width: "70%" }} />
            <div className="esq esq-linha" style={{ width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
