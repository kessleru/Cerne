// Carregamento do app: quatro blocos de commit que acendem em sequência e apagam juntos.
const BOXES = [1, 2, 3, 4];

export function CommitLoader({ size = 'md', label = 'Carregando' }: { size?: 'sm' | 'md'; label?: string }) {
  return (
    <div className={`ks-commitloader is-${size}`} role="status" aria-label={label}>
      {BOXES.map((n) => (
        <span key={n} className="ks-commitloader__box" aria-hidden="true">
          <span className={`ks-commitloader__fill is-${n}`} />
        </span>
      ))}
    </div>
  );
}
