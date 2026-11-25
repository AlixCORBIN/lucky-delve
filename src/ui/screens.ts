import { fr } from '../content/i18n/fr';
import type { Store } from '../core/store';
import { openCredits } from './credits';
import { button, el } from './dom';
import { enterRows, pulse, swap } from './motion';

type Screen = 'menu' | 'play';

/** Menu principal et HUD de jeu, superposés au plateau. */
export function mountScreens(root: HTMLElement, store: Store, setInteractive: (on: boolean) => void): void {
  let screen: Screen = 'menu';
  let rows: HTMLElement[] = [];

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

  function buildHud(): HTMLElement[] {
    const bar = el('div', 'hud');
    const back = button(fr.menu.back, 'arrowLeft', 'ghost');
    back.addEventListener('click', () => void go('menu'));
    const hint = el('p', 'hud-hint', fr.hud.hint);
    const turn = el('span', 'hud-turn', fr.hud.turn(store.getState().turn));
    bar.append(back, hint, turn, el('span', 'version-inline', versionText()));
    root.replaceChildren(bar);
    return [back, hint, turn];
  }

  async function go(next: Screen): Promise<void> {
    if (next === screen) return;
    screen = next;
    setInteractive(next === 'play');
    const old = rows;
    const oldNodes = [...root.children];
    await swap(old, () => {
      // L'ancien écran reste visible pendant sa sortie : on garde ses nœuds jusqu'à la fin.
      const fresh = next === 'menu' ? buildMenu() : buildHud();
      root.prepend(...oldNodes.map((n) => {
        n.classList.add('leaving');
        return n;
      }));
      rows = fresh;
      return fresh;
    });
    root.querySelectorAll('.leaving').forEach((n) => n.remove());
  }

  store.subscribe((state) => {
    const turn = root.querySelector('.hud-turn');
    if (!turn) return;
    turn.textContent = fr.hud.turn(state.turn);
    void pulse(turn);
  });

  rows = buildMenu();
  void enterRows(rows);
}

const versionText = (): string => `v${__APP_VERSION__} · ${__COMMIT__}`;

export function mountVersion(): void {
  const tag = el('div', 'version', versionText());
  document.body.append(tag);
}
