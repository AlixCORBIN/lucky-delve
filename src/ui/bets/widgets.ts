import { fr } from '../../content/i18n/fr';
import { describeDie, type Die } from '../../core/destin';
import type { Action, GameState } from '../../core/state';
import { el } from '../dom';
import { icon, type IconName } from '../icons';

/** Ce qu'un écran de pari reçoit : l'état, l'état précédent de la même phase, et l'envoi d'actions. */
export interface BetContext {
  readonly state: GameState;
  readonly prev: GameState | null;
  readonly dispatch: (action: Action) => void;
  /** Mémoire d'animation propre au pari en cours (angle de roue, etc.). */
  readonly memo: Record<string, number>;
}

export interface BetView {
  readonly node: HTMLElement;
  /** Lancé une fois le nœud dans la page (animations qui partent d'un état précédent). */
  readonly after?: () => void;
}

export function panel(title: string, iconName: IconName | null, ...children: (Node | null | false)[]): HTMLElement {
  const box = el('section', 'bet');
  const head = el('h2', 'bet-title');
  if (iconName) head.append(icon(iconName));
  head.append(el('span', undefined, title));
  box.append(head);
  for (const c of children) if (c) box.append(c);
  return box;
}

export function row(className: string, ...children: (Node | null | false)[]): HTMLElement {
  const r = el('div', className);
  for (const c of children) if (c) r.append(c);
  return r;
}

export function action(
  label: string,
  onClick: () => void,
  opts: { icon?: IconName; variant?: 'primary' | 'ghost'; cost?: number; disabled?: boolean; small?: boolean; title?: string } = {},
): HTMLButtonElement {
  const b = el('button', `btn btn-${opts.variant ?? 'ghost'}${opts.small ? ' btn-small' : ''}`);
  b.type = 'button';
  if (opts.icon) b.append(icon(opts.icon));
  b.append(el('span', undefined, label));
  if (opts.cost !== undefined) {
    const c = el('span', 'cost');
    c.append(el('span', undefined, fr.bet.cost(opts.cost)), icon('sparkles'));
    b.append(c);
  }
  if (opts.title) b.title = opts.title;
  b.disabled = opts.disabled ?? false;
  b.addEventListener('click', onClick);
  return b;
}

/** Bouton d'influence : payé en Trèfles, grisé si on n'a pas de quoi payer. */
export function influence(
  ctx: BetContext,
  label: string,
  cost: number,
  act: Action,
  opts: { icon?: IconName; disabled?: boolean; small?: boolean } = {},
): HTMLButtonElement {
  const poor = ctx.state.hero.clovers < cost;
  return action(label, () => ctx.dispatch(act), {
    ...opts,
    cost,
    disabled: (opts.disabled ?? false) || poor,
    ...(poor ? { title: fr.bet.noClovers } : {}),
  });
}

export function dieFace(value: number | null, die: Die | null, rolled: boolean): HTMLElement {
  const d = el('div', `die${rolled ? ' rolling' : ''}${value === null ? ' blank' : ''}`);
  d.append(el('span', 'die-value', value === null ? '?' : String(value)));
  if (die) d.append(el('span', 'die-type', describeDie(die)));
  return d;
}

export interface OddsRow {
  readonly label: string;
  readonly probability: number;
  readonly active?: boolean;
  readonly struck?: boolean;
  readonly color?: string;
  readonly extra?: HTMLElement | null;
}

/** Liste des chances : chaque ligne a sa barre proportionnelle et son pourcentage exact. */
export function oddsList(rows: readonly OddsRow[]): HTMLElement {
  const list = el('ul', 'odds');
  for (const r of rows) {
    const li = el('li', `odds-row${r.active ? ' active' : ''}${r.struck ? ' struck' : ''}`);
    const bar = el('span', 'odds-bar');
    const fill = el('span', 'odds-fill');
    fill.style.width = `${Math.round(r.probability * 100)}%`;
    if (r.color) fill.style.background = r.color;
    bar.append(fill);
    li.append(el('span', 'odds-label', r.label), bar, el('span', 'odds-pct', fr.bet.chance(r.probability)));
    if (r.extra) li.append(r.extra);
    list.append(li);
  }
  return list;
}

export function hint(text: string): HTMLElement {
  return el('p', 'bet-hint', text);
}

export function karmaNote(full: boolean): HTMLElement | null {
  if (!full) return null;
  const n = el('p', 'bet-karma');
  n.append(icon('star'), el('span', undefined, fr.bet.karma));
  return n;
}

export const changed = <T>(a: readonly T[] | null | undefined, b: readonly T[] | null | undefined, i: number): boolean =>
  (a?.[i] ?? null) !== (b?.[i] ?? null);
