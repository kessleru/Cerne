// Fontes servidas por nós (@fontsource), nunca do Google Fonts.
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './kessleru/tokens.css';
import './kessleru/bundle.css';
import './kessleru/extensoes.css';
import './kessleru/extensoes-ui.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preloadGsapWhenIdle } from './anim/motion';
import App from './App';
import { toast } from './components/parts';
import { aoAtualizar, registrarPwa } from './pwa';
import { startPrefsSync } from './state/applyPrefs';
import { startEditorThemeSync } from './state/editorTheme';

startPrefsSync();
startEditorThemeSync();
registrarPwa();
aoAtualizar((recarregar) => toast('Versão nova disponível', { action: { label: 'Recarregar', run: recarregar } }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// GSAP só depois da primeira tela
requestAnimationFrame(() => requestAnimationFrame(preloadGsapWhenIdle));
