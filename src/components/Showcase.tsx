// Carrossel da página inicial: famosos numa faixa, projetos de pessoas na outra. Para com movimento reduzido.
import { useMemo, useState } from 'react';
import { AREAS_ESTUDO, FAMOSOS, VITRINE, extDaLinguagem, type Entrada } from '../data/catalogo';
import { FileIcon } from '../icons/FileIcon';
import { usePrefs } from '../state/prefs';
import { OwnerAvatar, misturar, novaSemente } from './Explore';

// ---------- carrossel ----------
// 24 por faixa já passa da largura de uma tela 4K; mais que isso só pesa (cada item vai duas vezes)
const POR_FAIXA = 24;
export function Marquee({ onOpen }: { onOpen: (slug: string) => void }) {
  // faixa de cima: famosos; de baixo: projetos de pessoas (os de README mais completo), em sentidos opostos
  const [semente] = useState(novaSemente); // cada visita mostra outros projetos
  const [a, b] = useMemo(() => {
    // um pouco de cada área, alternando, para mostrar a variedade
    const pessoas: Entrada[] = [];
    const filas = AREAS_ESTUDO.map((a) => misturar(VITRINE.filter((e) => e.area === a.id), semente));
    for (let i = 0; pessoas.length < POR_FAIXA && filas.some((f) => i < f.length); i++) for (const f of filas) if (f[i] && pessoas.length < POR_FAIXA) pessoas.push(f[i]!);
    const famosos = misturar(FAMOSOS, semente);
    return pessoas.length >= 10 ? [famosos.slice(0, POR_FAIXA), pessoas] : [famosos.slice(0, POR_FAIXA), famosos.slice(POR_FAIXA, POR_FAIXA * 2)];
  }, [semente]);
  return (
    <section className="ks-marquee" aria-label="Repositórios no catálogo">
      <Faixa itens={a} onOpen={onOpen} />
      <Faixa itens={b} onOpen={onOpen} reversa />
    </section>
  );
}

function Faixa({ itens, onOpen, reversa = false }: { itens: Entrada[]; onOpen: (slug: string) => void; reversa?: boolean }) {
  const { icons } = usePrefs();
  const lista = (dup: boolean) =>
    itens.map((e) => (
      <li key={(dup ? 'd' : '') + e.repo} aria-hidden={dup || undefined}>
        <button type="button" className="ks-marquee__item" tabIndex={dup ? -1 : 0} onClick={() => onOpen(e.repo)} data-tip={e.nota}>
          <OwnerAvatar repo={e.repo} size={22} />
          <span>{e.repo}</span>
          <FileIcon pack={icons} path={`x.${extDaLinguagem(e.lang)}`} className="ks-chip__icon" />
        </button>
      </li>
    ));
  return (
    <div className={`ks-marquee__track${reversa ? ' is-reverse' : ''}`}>
      <ul style={{ '--n': itens.length } as React.CSSProperties}>
        {lista(false)}
        {lista(true)}
      </ul>
    </div>
  );
}
