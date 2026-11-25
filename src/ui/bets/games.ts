import { BALANCE } from '../../content/balance';
import { fr } from '../../content/i18n/fr';
import { chanceOf, dieOutcomes } from '../../core/destin';
import { trapDie } from '../../core/rules/explore';
import { karmaFull } from '../../core/rules/hero';
import { guessOdds, potFor } from '../../core/rules/minigames';
import type { PhaseOf } from '../../core/state';
import { el } from '../dom';
import { action, dieFace, hint, influence, karmaNote, oddsList, panel, row, type BetContext, type BetView } from './widgets';

export function trapBet(ctx: BetContext, phase: PhaseOf<'trap'>): BetView {
  const { need, damage } = BALANCE.trap;
  const full = karmaFull(ctx.state.hero) && phase.roll === null;
  const die = trapDie();
  const success = chanceOf(dieOutcomes(die, full), (v) => v >= need);
  const prev = ctx.prev?.phase.kind === 'trap' ? ctx.prev.phase.roll : null;
  const rolled = phase.roll !== null && phase.roll !== prev;
  const odds = oddsList([
    { label: fr.events.trap(true), probability: success, color: 'var(--clover)', active: phase.roll !== null && phase.roll >= need },
    { label: fr.events.trap(false), probability: 1 - success, color: 'var(--coral)', active: phase.roll !== null && phase.roll < need },
  ]);
  const actions =
    phase.roll === null
      ? row('bet-actions', action(fr.trap.roll, () => ctx.dispatch({ type: 'rollTrap' }), { variant: 'primary', icon: 'play' }))
      : row(
          'bet-actions',
          influence(ctx, '', BALANCE.costs.push, { type: 'pushTrap', delta: -1 }, { icon: 'minus', small: true }),
          influence(ctx, '', BALANCE.costs.push, { type: 'pushTrap', delta: 1 }, { icon: 'plus', small: true }),
          influence(ctx, fr.explore.reroll, BALANCE.costs.reroll, { type: 'rerollTrap' }),
          action(fr.trap.resolve, () => ctx.dispatch({ type: 'resolveTrap' }), { variant: 'primary', icon: 'check' }),
        );
  return {
    node: panel(
      fr.trap.title,
      'alertTriangle',
      hint(fr.trap.rule(need, damage)),
      row('bet-dice', dieFace(phase.roll, die, rolled)),
      phase.roll === null ? odds : null,
      karmaNote(full),
      actions,
    ),
  };
}

const cardName = (v: number): string => fr.cards.names[v] ?? String(v);

function cardEl(value: number | null, back = false): HTMLElement {
  const c = el('div', `playing-card${back ? ' back' : ''}`);
  c.append(el('span', undefined, value === null ? '?' : cardName(value)));
  return c;
}

export function cardsBet(ctx: BetContext, phase: PhaseOf<'higherLower'>): BetView {
  const full = karmaFull(ctx.state.hero) && phase.peeked === null;
  const higher = guessOdds(ctx.state, phase, 'higher');
  const lower = guessOdds(ctx.state, phase, 'lower');
  const pot = potFor(phase.streak);
  const nextPot = potFor(phase.streak + 1);
  return {
    node: panel(
      fr.cards.title,
      'card',
      hint(fr.cards.rule),
      row('cards', cardEl(phase.current), cardEl(phase.peeked, phase.peeked === null)),
      row('cards-info', el('span', undefined, fr.cards.pot(pot)), el('span', 'muted', fr.cards.left(phase.deck.length))),
      karmaNote(full),
      row(
        'bet-actions',
        action(`${fr.cards.higher} · ${fr.bet.chance(higher)}`, () => ctx.dispatch({ type: 'guessCard', guess: 'higher' }), { variant: 'primary', icon: 'arrowUp' }),
        action(`${fr.cards.lower} · ${fr.bet.chance(lower)}`, () => ctx.dispatch({ type: 'guessCard', guess: 'lower' }), { variant: 'primary', icon: 'arrowDown' }),
      ),
      row(
        'bet-actions',
        influence(ctx, fr.cards.peek, BALANCE.costs.peek, { type: 'peekCard' }, { icon: 'search', disabled: phase.peeked !== null }),
        phase.streak > 0 ? action(fr.cards.cashOut(pot), () => ctx.dispatch({ type: 'cashOut' }), { icon: 'piggyBank' }) : null,
        el('span', 'muted', `→ ${nextPot}`),
      ),
    ),
  };
}

export function floorClearedBet(ctx: BetContext): BetView {
  return {
    node: panel(
      fr.end.floorTitle,
      'crown',
      hint(fr.end.floorText(BALANCE.bossHealBetweenFloors)),
      row('bet-actions', action(fr.end.next, () => ctx.dispatch({ type: 'nextFloor' }), { variant: 'primary', icon: 'arrowDown' })),
    ),
  };
}

export function overBet(ctx: BetContext, phase: PhaseOf<'over'>, newRun: () => void): BetView {
  const { hero, depth } = ctx.state;
  return {
    node: panel(
      phase.victory ? fr.end.winTitle : fr.end.loseTitle,
      phase.victory ? 'crown' : 'ghost',
      hint(phase.victory ? fr.end.winText(hero.gold) : fr.end.loseText(depth, hero.gold)),
      row('bet-actions', action(fr.end.again, newRun, { variant: 'primary', icon: 'play' })),
    ),
  };
}
