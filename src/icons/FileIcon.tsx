import { useEffect, useSyncExternalStore } from 'react';
import type { IconPack } from '../state/prefs';
import { loadPack, packVersion, resolveIcon, subscribePacks } from './packs';

/** Ícone de arquivo ou pasta do pacote escolhido. As cores vêm do próprio pacote (exceção prevista no Kessleru). */
export function FileIcon({ pack, path, dir = false, open = false, className = '' }: { pack: IconPack; path: string; dir?: boolean; open?: boolean; className?: string }) {
  useEffect(() => {
    void loadPack(pack);
  }, [pack]);
  useSyncExternalStore(subscribePacks, packVersion);
  const icon = resolveIcon(pack, path, dir, open);
  return (
    <span className={`ks-fileicon ${className}`.trim()} aria-hidden="true">
      {icon && <svg viewBox={`0 0 ${icon.w} ${icon.h}`} dangerouslySetInnerHTML={{ __html: icon.body }} />}
    </span>
  );
}
