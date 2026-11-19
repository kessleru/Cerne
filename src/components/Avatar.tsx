import { useState } from 'react';
import type { Conta } from '../data/github/conta';
import { iniciais, useConta } from '../state/account';
import { Icon } from './Icon';

/** Foto do perfil do GitHub; sem foto (ou sem rede), as iniciais. Sem conta, o ícone de pessoa. */
export function Avatar({ conta, size = 28, className = '' }: { conta: Conta | null; size?: number; className?: string }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const src = conta?.avatar ? `${conta.avatar}${conta.avatar.includes('?') ? '&' : '?'}s=${size * 2}` : '';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (!conta) {
    return (
      <span className={`ks-avatar is-empty ${className}`.trim()} style={style} aria-hidden="true">
        <Icon name="user" size={Math.round(size * 0.55)} />
      </span>
    );
  }
  return (
    <span className={`ks-avatar ${className}`.trim()} style={style} aria-hidden="true">
      {src && falhou !== src ? (
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFalhou(src)} />
      ) : (
        iniciais(conta)
      )}
    </span>
  );
}

/** Botão de conta: "Entrar" sem token; foto e @login com token; aviso quando o token parou de valer. */
export function AccountButton({ onClick, compact = false }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; compact?: boolean }) {
  const e = useConta();
  if (e.status === 'anonimo' && compact) {
    return (
      <button type="button" className="ks-accountbtn is-anon is-icon" aria-label="Entrar no GitHub" data-tip="Entrar no GitHub: 5 000 chamadas por hora e repositórios privados" onClick={onClick}>
        <Icon name="user" />
      </button>
    );
  }
  if (e.status === 'anonimo') {
    return (
      <button type="button" className="ks-accountbtn is-anon" onClick={onClick}>
        <Icon name="user" />
        <span className="ks-accountbtn__name">Entrar</span>
      </button>
    );
  }
  const conta = e.conta;
  const invalido = e.status === 'invalido';
  const nome = conta ? `@${conta.login}` : 'Conferindo…';
  const label = invalido ? `Conta ${nome}: o token parou de funcionar` : `Conta ${nome}`;
  if (compact) {
    return (
      <button type="button" className={`ks-accountbtn is-icon${invalido ? ' is-warn' : ''}`} aria-label={label} data-tip={invalido ? 'O token parou de funcionar' : nome} onClick={onClick}>
        <Avatar conta={conta} size={26} />
      </button>
    );
  }
  return (
    <button type="button" className={`ks-accountbtn${invalido ? ' is-warn' : ''}`} aria-label={label} onClick={onClick}>
      <Avatar conta={conta} size={26} />
      <span className="ks-accountbtn__name">{nome}</span>
      {invalido && <span className="ks-accountbtn__dot" aria-hidden="true" />}
    </button>
  );
}
