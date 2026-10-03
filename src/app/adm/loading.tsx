export default function Carregando() {
  return (
    <div className="esq-pagina" role="status" aria-label="Carregando">
      <div className="esq esq-topo" />
      <div className="esq esq-linha" style={{ width: "30%" }} />
      <div className="esq-grade">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="esq esq-cartao" />
        ))}
      </div>
    </div>
  );
}
