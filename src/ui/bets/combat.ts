import { BALANCE } from '../../content/balance';
import { fr } from '../../content/i18n/fr';
import { MONSTERS } from '../../content/monsters';
import { chanceOf } from '../../core/destin';
import { enemyAttackOdds, fleeCost, fleeOutcomes, strikePreview } from '../../core/rules/combat';
import { karmaFull } from '../../core/rules/hero';
import type { PhaseOf } from '../../core/state';
import { el } from '../dom';
import { action, changed, dieFace, hint, influence, karmaNote, panel, row, type BetContext, type BetView } from './widgets';

function enemyCard(phase: PhaseOf<'combat'>): HTMLElement {
  const { enemy } = phase;
  const def = MONSTERS[enemy.id];
  const odds = enemyAttackOdds(enemy);
  const min = odds[0]?.value ?? 0;
  const max = odds[odds.length - 1]?.value ?? 0;
  const dice = `${def.attack.count}d${def.attack.sides}${def.attack.bonus ? `+${def.attack.bonus}` : ''}`;
  const hp = el('div', 'hpbar');
  const fill = el('span', 'hpbar-fill');
  fill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
  hp.append(fill, el('span', 'hpbar-text', `${enemy.hp} / ${enemy.maxHp}`));
  const card = el('div', `enemy${enemy.boss ? ' boss' : ''}`);
  const name = el('div', 'enemy-name', fr.monsters[enemy.id]);
  if (enemy.boss) name.append(el('span', 'tag', fr.combat.boss));
  card.append(name, hp, el('div', 'enemy-intent', fr.combat.intent(dice, min, max)));
  return card;
}

export function combatBet(ctx: BetContext, phase: PhaseOf<'combat'>): BetView {
  const { hero } = ctx.state;
  const full = karmaFull(hero);
  const title = fr.combat.round(phase.round);

  if (!phase.hand) {
    const fleeP = chanceOf(fleeOutcomes(ctx.state, phase.fleeSteps), (v) => v);
    const fleeRow = phase.enemy.boss
      ? null
      : row(
          'flee',
          action('', () => ctx.dispatch({ type: 'setFleeSteps', steps: phase.fleeSteps - 1 }), {
            icon: 'minus',
            small: true,
            disabled: phase.fleeSteps === 0,
          }),
          el('span', 'flee-stake', fr.combat.fleeStake(fleeCost(phase.fleeSteps))),
          action('', () => ctx.dispatch({ type: 'setFleeSteps', steps: phase.fleeSteps + 1 }), {
            icon: 'plus',
            small: true,
            disabled: phase.fleeSteps >= BALANCE.combat.flee.maxSteps || fleeCost(phase.fleeSteps + 1) > hero.gold,
          }),
          action(`${fr.combat.flee} · ${fr.bet.chance(fleeP)}`, () => ctx.dispatch({ type: 'flee' }), { small: true }),
        );
    return {
      node: panel(
        title,
        'ghost',
        enemyCard(phase),
        row('bet-dice', ...hero.dice.map((d) => dieFace(null, d, false))),
        karmaNote(full),
        row('bet-actions', action(fr.combat.roll, () => ctx.dispatch({ type: 'rollHand' }), { variant: 'primary', icon: 'play' })),
        fleeRow,
      ),
    };
  }

  const prevHand = ctx.prev?.phase.kind === 'combat' ? ctx.prev.phase.hand : null;
  const hand = phase.hand;
  const dice = row(
    'bet-dice',
    ...hand.map((v, i) => {
      const slot = phase.slots[i] ?? 'attack';
      const face = dieFace(v, hero.dice[i] ?? null, changed(prevHand, hand, i));
      const toggle = el('button', `die-slot slot-${slot}`);
      toggle.type = 'button';
      toggle.append(face, el('span', 'slot-label', slot === 'attack' ? fr.combat.attack : fr.combat.guard));
      toggle.addEventListener('click', () => ctx.dispatch({ type: 'toggleSlot', index: i }));
      return row(
        'die-col',
        toggle,
        row(
          'die-tools',
          influence(ctx, '', BALANCE.costs.push, { type: 'pushDie', index: i, delta: -1 }, { icon: 'minus', small: true }),
          influence(ctx, '', BALANCE.costs.reroll, { type: 'rerollDie', index: i }, { icon: 'sparkles', small: true }),
          influence(ctx, '', BALANCE.costs.push, { type: 'pushDie', index: i, delta: 1 }, { icon: 'plus', small: true }),
        ),
      );
    }),
  );
  const { attack, guard, combo } = strikePreview(phase);
  const preview = row('strike-preview', el('strong', undefined, fr.combat.preview(attack, guard)));
  const comboText = fr.combat.combo(combo);
  if (comboText) preview.append(el('span', 'tag tag-gold', comboText));
  return {
    node: panel(
      title,
      'ghost',
      enemyCard(phase),
      dice,
      preview,
      karmaNote(full),
      hint(fr.combat.hint),
      row('bet-actions', action(fr.combat.strike, () => ctx.dispatch({ type: 'strike' }), { variant: 'primary', icon: 'check' })),
    ),
  };
}
