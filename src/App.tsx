import { useCallback, useEffect, useState } from 'react';
import { withOpenTransition } from './anim/motion';
import { Entry } from './components/Entry';
import { Workspace, type Session } from './components/Workspace';
import { buildPath, homePath, parseLocation, type RepoLink } from './lib/route';

function fromLocation(): Session | null {
  const l = parseLocation(location.pathname, location.hash);
  return l ? { owner: l.owner, repo: l.repo, ref: l.ref, path: l.path, lines: l.lines } : null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(fromLocation);

  const open = useCallback((l: RepoLink) => {
    const s: Session = { owner: l.owner, repo: l.repo, ref: l.ref ?? null, path: l.path ?? null, lines: l.lines ?? null };
    history.pushState(null, '', buildPath(s));
    withOpenTransition(() => setSession(s));
  }, []);

  const exit = useCallback(() => {
    history.pushState(null, '', homePath());
    setSession(null);
  }, []);

  useEffect(() => {
    const on = () => {
      const s = fromLocation();
      setSession((cur) => (!s ? null : cur && cur.owner === s.owner && cur.repo === s.repo ? cur : s));
    };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);

  return session ? <Workspace key={`${session.owner}/${session.repo}`} session={session} onExit={exit} /> : <Entry onOpen={open} />;
}
