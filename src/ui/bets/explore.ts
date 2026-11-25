import { BALANCE } from '../../content/balance';
import { fr } from '../../content/i18n/fr';
import { describeDie, sumOdds } from '../../core/destin';
import { moveDice, moveTargets, moveTotal } from '../../core/rules/explore';
import type { PhaseOf } from '../../core/state';
import { action, changed, dieFace, hint, influence, oddsList, panel, row, type BetContext, type BetView } from './widgets';

export function exploreBet(ctx: BetContext, phase: PhaseOf<'explore'>): BetView {
  const dice = moveDice();
  const names = dice.map(describeDie);
  const label = names.every((n) => n === names[0]) ? `${names.length}${names[0] ?? ''}` : names.join('+');
  const prevRoll = ctx.prev?.phase.kind === 'explore' ? ctx.prev.phase.roll : null;
  const total = phase.roll ? moveTotal(phase.roll) : null;
  const odds = oddsList(
    sumOdds(dice).map((o) => ({ label: String(o.value), probability: o.probability, active: o.value === total })),
  );
  odds.classList.add('odds-compact');

  if (!phase.roll) {
    return {
      node: panel(
        fr.explore.title,
        'walk',
        row('bet-dice', ...dice.map((d) => dieFace(null, d, false))),
        odds,
        hint(fr.explore.rules),
        row('bet-actions', action(fr.explore.roll(label), () => ctx.dispatch({ type: 'rollMove' }), { variant: 'primary', icon: 'play' })),
      ),
    };
  }

  const roll = phase.roll;
  const diceRow = row(
    'bet-dice',
    ...roll.map((v, i) => {
      const col = row('die-col', dieFace(v, dice[i] ?? null, changed(prevRoll, roll, i)));
      col.append(
        row(
          'die-tools',
          influence(ctx, '', BALANCE.costs.push, { type: 'pushMove', index: i, delta: -1 }, { icon: 'minus', small: true }),
          influence(ctx, '', BALANCE.costs.push, { type: 'pushMove', index: i, delta: 1 }, { icon: 'plus', small: true }),
        ),
      );
      return col;
    }),
  );
  return {
    node: panel(
      fr.explore.title,
      'walk',
      diceRow,
      odds,
      hint(fr.explore.pick(moveTargets(ctx.state).length ? (total ?? 0) : 0)),
      row(
        'bet-actions',
        influence(ctx, fr.explore.reroll, BALANCE.costs.reroll, { type: 'rerollMove' }, { disabled: phase.rerolled }),
      ),
    ),
  };
}
