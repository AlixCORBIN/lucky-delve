import { fr } from '../content/i18n/fr';
import type { Store } from '../core/store';
import { mountBetPanel } from './bets/panel';
import { openCredits } from './credits';
import { button, el } from './dom';
import { mountHud } from './hud';
import { enterRows, swap } from './motion';

type Screen = 'menu' | 'play';

export interface ScreensOptions {
  readonly store: Store;
  readonly setInteractive: (on: boolean) => void;
  readonly seedLabel: () => string;
  readonly newRun: () => void;
}

/** Menu principal et écran de jeu (ressources + panneau de pari), superposés au plateau. */
export function mountScreens(root: HTMLElement, { store, setInteractive, seedLabel, newRun }: ScreensOptions): void {
  let screen: Screen = 'menu';
  let rows: HTMLElement[] = [];
  let cleanup: (() => void) | null = null;

  function buildMenu(): HTMLElement[] {
    const panel = el('div', 'menu');
    const title = el('h1', 'title', fr.title);
    const tagline = el('p', 'tagline', fr.tagline);
    const play = button(fr.menu.play, 'play', 'primary');
    const credits = button(fr.menu.credits, 'info', 'ghost');
    play.addEventListener('click', () => void go('play'));
    credits.addEventListener('click', () => openCredits(credits));
    const actions = el('div', 'menu-actions');
    actions.append(play, credits);
    panel.append(title, tagline, actions);
    root.replaceChildren(panel);
    return [title, tagline, play, credits];
  }

  function buildPlay(): HTMLElement[] {
    const top = el('div', 'hud');
    const back = button(fr.menu.back, 'arrowLeft', 'ghost');
    back.addEventListener('click', () => void go('menu'));
    const hud = mountHud(store, seedLabel);
    const bet = mountBetPanel(store, newRun);
    top.append(back, hud.node, el('span', 'version-inline', versionText()));
    cleanup = () => {
      hud.dispose();
      bet.dispose();
    };
    root.replaceChildren(top, bet.node);
    return [top, bet.node];
  }

  async function go(next: Screen): Promise<void> {
    if (next === screen) return;
    screen = next;
    setInteractive(next === 'play');
    cleanup?.();
    cleanup = null;
    const old = rows;
    const oldNodes = [...root.children];
    await swap(old, () => {
      // L'ancien écran reste visible pendant sa sortie : on garde ses nœuds jusqu'à la fin.
      const fresh = next === 'menu' ? buildMenu() : buildPlay();
      root.prepend(...oldNodes.map((n) => {
        n.classList.add('leaving');
        return n;
      }));
      rows = fresh;
      return fresh;
    });
    root.querySelectorAll('.leaving').forEach((n) => n.remove());
  }

  rows = buildMenu();
  void enterRows(rows);
}

const versionText = (): string => `v${__APP_VERSION__} · ${__COMMIT__}`;

export function mountVersion(): void {
  const tag = el('div', 'version', versionText());
  document.body.append(tag);
}
