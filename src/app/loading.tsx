export default function Carregando() {
  return (
    <div className="esq-pagina" role="status" aria-label="Carregando">
      <div className="esq esq-topo" />
      <div className="esq esq-titulo" />
      <div className="esq-grade">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="esq esq-cartao" />
        ))}
      </div>
    </div>
  );
}
