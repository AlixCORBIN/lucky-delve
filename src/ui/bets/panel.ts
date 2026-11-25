import type { GameState } from '../../core/state';
import type { Store } from '../../core/store';
import { el } from '../dom';
import { enterRows } from '../motion';
import { combatBet } from './combat';
import { exploreBet } from './explore';
import { cardsBet, floorClearedBet, overBet, trapBet } from './games';
import { lootBet } from './loot';
import { wheelBet } from './wheel';
import type { BetContext, BetView } from './widgets';

function build(ctx: BetContext, newRun: () => void): BetView {
  const { phase } = ctx.state;
  switch (phase.kind) {
    case 'explore':
      return exploreBet(ctx, phase);
    case 'roomWheel':
      return wheelBet(ctx, phase);
    case 'combat':
      return combatBet(ctx, phase);
    case 'loot':
      return lootBet(ctx, phase);
    case 'trap':
      return trapBet(ctx, phase);
    case 'higherLower':
      return cardsBet(ctx, phase);
    case 'floorCleared':
      return floorClearedBet(ctx);
    case 'over':
      return overBet(ctx, phase, newRun);
  }
}

/** Panneau de pari : reconstruit à chaque changement d'état, animé à chaque nouvelle phase. */
export function mountBetPanel(store: Store, newRun: () => void): { node: HTMLElement; dispose: () => void } {
  const host = el('div', 'bet-host');
  let memo: Record<string, number> = {};

  function render(state: GameState, previous: GameState | null): void {
    const samePhase = previous !== null && previous.phase.kind === state.phase.kind && previous.turn === state.turn;
    if (!samePhase) memo = {};
    const view = build({ state, prev: samePhase ? previous : null, dispatch: store.dispatch, memo }, newRun);
    host.replaceChildren(view.node);
    view.after?.();
    if (!samePhase) void enterRows([view.node]);
  }

  render(store.getState(), null);
  const unsubscribe = store.subscribe((s, p) => render(s, p));
  return { node: host, dispose: unsubscribe };
}
