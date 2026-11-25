import fredokaUrl from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?url';
import { BOARD } from './content/board';
import { fr } from './content/i18n/fr';
import { createGame } from './core/state';
import { createStore, type Store } from './core/store';
import { createBoard2d } from './render2d/board2d';
import { PALETTE } from './render3d/palette';
import { detectWebGL } from './render3d/webgl';
import { showFallbackBanner, type FallbackCause } from './ui/banner';
import { installErrorHandlers, showFatalError } from './ui/errors';
import { applyMotionVars } from './ui/motion';
import { mountScreens, mountVersion } from './ui/screens';
import type { BoardView } from './ui/view';
import './ui/styles.css';

function applyTheme(): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(PALETTE)) root.style.setProperty(`--${name}`, value);
  applyMotionVars(root);
  const face = new FontFace('Fredoka', `url(${fredokaUrl})`, { weight: '600' });
  face.load().then((f) => document.fonts.add(f), () => undefined);
}

function setLoading(text: string): void {
  const label = document.querySelector('#loading .loading-text');
  if (label) label.textContent = text;
}

function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' }).finished.then(
    () => loading.remove(),
    () => loading.remove(),
  );
}

async function create3d(container: HTMLElement, store: Store, onLost: () => void): Promise<BoardView> {
  // Import dynamique : three.js n'est chargé que si WebGL est disponible.
  setLoading(fr.loading.models);
  const [{ loadModels }, { createScene3d }] = await Promise.all([import('./render3d/models'), import('./render3d/scene')]);
  const models = await loadModels();
  return createScene3d({ container, store, models, onContextLost: onLost });
}

async function boot(): Promise<void> {
  installErrorHandlers();
  applyTheme();
  const params = new URLSearchParams(location.search);
  const seed = params.get('seed') ?? Date.now().toString(36);
  const store = createStore(createGame(seed, BOARD));
  const container = document.getElementById('board');
  const screens = document.getElementById('screens');
  if (!container || !screens) throw new Error('Structure HTML incomplète (#board, #screens)');

  let view: BoardView | null = null;
  let interactive = false;

  const fallbackTo2d = (cause: FallbackCause, detail?: string): void => {
    view?.dispose();
    view = createBoard2d(container, store);
    view.setInteractive(interactive);
    showFallbackBanner(cause, detail);
  };

  const forced2d = params.get('renderer') === '2d';
  const support = forced2d ? null : detectWebGL();
  if (!support) {
    fallbackTo2d(forced2d ? 'forced' : 'webgl');
  } else {
    try {
      view = await create3d(container, store, () => fallbackTo2d('lost'));
    } catch (error) {
      console.error(error);
      fallbackTo2d('load', error instanceof Error ? error.message : String(error));
    }
  }

  mountScreens(screens, store, (on) => {
    interactive = on;
    view?.setInteractive(on);
  });
  mountVersion();
  hideLoading();
}

boot().catch(showFatalError);
