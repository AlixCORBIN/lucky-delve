import { BALANCE } from '../../content/balance';
import { fr } from '../../content/i18n/fr';
import { LOOT_KINDS, MULTIPLIERS, RARITIES } from '../../content/loot';
import { oddsOf, reelOutcomes } from '../../core/destin';
import { karmaFull } from '../../core/rules/hero';
import { LOOT_SCORES, REELS, lootOf } from '../../core/rules/loot';
import type { PhaseOf } from '../../core/state';
import { el } from '../dom';
import { reducedMotion } from '../motion';
import { action, hint, influence, karmaNote, oddsList, panel, row, type BetContext, type BetView } from './widgets';

const symbolLabel = (reel: number, symbol: number): string => {
  if (reel === 0) return fr.loot.rarity[RARITIES[symbol] ?? 'common'];
  if (reel === 1) return fr.loot.kind[LOOT_KINDS[symbol] ?? 'gold'];
  return `×${MULTIPLIERS[symbol] ?? 1}`;
};

export function lootBet(ctx: BetContext, phase: PhaseOf<'loot'>): BetView {
  const full = karmaFull(ctx.state.hero);
  const prevSymbols = ctx.prev?.phase.kind === 'loot' ? ctx.prev.phase.symbols : null;
  const spinning: HTMLElement[] = [];

  const reels = REELS.map((reel, i) => {
    const symbol = phase.symbols?.[i];
    const locked = phase.locked[i] ?? false;
    // Mêmes chances que le tirage, Karma compris (un rouleau bloqué n'est pas tiré).
    const odds = oddsOf(reelOutcomes(reel, full && !locked, LOOT_SCORES[i] ?? (() => 0)));
    const window = el('div', `reel-window${locked ? ' locked' : ''}`);
    const skull = i === 0 && symbol !== undefined && RARITIES[symbol] === 'skull';
    const face = el('div', `reel-symbol${skull ? ' skull' : ''}`, symbol === undefined ? '?' : symbolLabel(i, symbol));
    window.append(face);
    if (symbol !== undefined && (prevSymbols?.[i] ?? null) !== symbol) spinning.push(face);
    const col = el('div', 'reel');
    col.append(el('div', 'reel-name', fr.loot.reels[i] ?? ''), window);
    if (phase.symbols && !phase.respun) {
      col.append(action(locked ? fr.loot.locked : fr.loot.lock, () => ctx.dispatch({ type: 'toggleLock', index: i }), { icon: locked ? 'lock' : 'unlock', small: true }));
    }
    col.append(
      oddsList(
        reel.map((o) => ({
          label: symbolLabel(i, o.value),
          probability: odds.find((k) => k.value === o.value)?.probability ?? 0,
          active: symbol === o.value,
        })),
      ),
    );
    return col;
  });

  let actions: HTMLElement;
  let result: HTMLElement | null = null;
  if (!phase.symbols) {
    actions = row('bet-actions', action(fr.loot.spin, () => ctx.dispatch({ type: 'spinReels' }), { variant: 'primary', icon: 'play' }));
  } else {
    const loot = lootOf(phase.symbols);
    result = el('p', 'loot-result', loot.rarity === 'skull' ? fr.loot.skull : `${fr.loot.kind[loot.kind]} ${loot.amount}`);
    actions = row(
      'bet-actions',
      influence(ctx, fr.loot.respin, BALANCE.costs.lockRespin, { type: 'respinReels' }, { disabled: phase.respun || phase.locked.every(Boolean) }),
      action(fr.loot.take, () => ctx.dispatch({ type: 'takeLoot' }), { variant: 'primary', icon: 'check' }),
    );
  }

  const node = panel(fr.loot.title, 'piggyBank', row('reels', ...reels), result, karmaNote(full && !phase.symbols), phase.symbols && !phase.respun ? hint(fr.loot.hint) : null, actions);
  return {
    node,
    after() {
      if (spinning.length === 0 || reducedMotion()) return;
      node.classList.add('suspense');
      const anims = spinning.map((face, n) =>
        face.animate(
          [{ transform: 'translateY(-120%)', opacity: 0 }, { transform: 'translateY(20%)', opacity: 1, offset: 0.8 }, { transform: 'none', opacity: 1 }],
          { duration: 500 + n * 250, easing: 'ease-out', fill: 'backwards' },
        ).finished,
      );
      const done = (): void => node.classList.remove('suspense');
      Promise.all(anims).then(done, done);
    },
  };
}
