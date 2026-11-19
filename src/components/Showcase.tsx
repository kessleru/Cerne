// Carrossel da página inicial: famosos numa faixa, projetos de pessoas na outra. Para com movimento reduzido.
import { useMemo } from 'react';
import { FAMOSOS, extDaLinguagem, useEstudo, type Entrada } from '../data/catalogo';
import { FileIcon } from '../icons/FileIcon';
import { usePrefs } from '../state/prefs';
import { OwnerAvatar } from './Explore';

// ---------- carrossel ----------
export function Marquee({ onOpen }: { onOpen: (slug: string) => void }) {
  // faixa de cima: famosos; de baixo: projetos de pessoas (os de README mais completo), em sentidos opostos
  const estudo = useEstudo();
  const [a, b] = useMemo(() => {
    const pessoas = estudo?.lista.slice(0, 40) ?? [];
    return pessoas.length >= 10 ? [FAMOSOS.slice(0, 40), pessoas] : [FAMOSOS.slice(0, 40), FAMOSOS.slice(40)];
  }, [estudo]);
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
