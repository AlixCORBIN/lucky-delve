import { BALANCE } from '../../content/balance';
import { fr } from '../../content/i18n/fr';
import { ROOM_WHEEL, type RoomKind } from '../../content/rooms';
import { oddsOf, wheelOutcomes } from '../../core/destin';
import { roomScore } from '../../core/rules/explore';
import { karmaFull } from '../../core/rules/hero';
import type { PhaseOf } from '../../core/state';
import { el } from '../dom';
import { reducedMotion } from '../motion';
import { action, hint, influence, karmaNote, oddsList, panel, row, type BetContext, type BetView } from './widgets';

export const ROOM_COLORS: Readonly<Record<RoomKind, string>> = {
  monster: 'var(--coral)',
  treasure: 'var(--gold)',
  trap: 'var(--stone)',
  higherLower: 'var(--berry)',
  spring: 'var(--sky)',
};

const SPIN_MS = 1800;

export function wheelBet(ctx: BetContext, phase: PhaseOf<'roomWheel'>): BetView {
  const full = karmaFull(ctx.state.hero) && phase.result === null;
  // Les chances affichées viennent de wheelOutcomes, la fonction même du tirage.
  const odds = oddsOf(wheelOutcomes(ROOM_WHEEL, phase.removed, full, roomScore));
  const total = ROOM_WHEEL.reduce((sum, s, i) => sum + (phase.removed.includes(i) ? 0 : s.weight), 0);

  let start = 0;
  const stops: string[] = [];
  const centers: number[] = [];
  ROOM_WHEEL.forEach((slice, i) => {
    const size = phase.removed.includes(i) ? 0 : (slice.weight / total) * 360;
    stops.push(`${ROOM_COLORS[slice.value]} ${start}deg ${start + size}deg`);
    centers.push(start + size / 2);
    start += size;
  });

  const disc = el('div', 'wheel-disc');
  disc.style.background = `conic-gradient(${stops.join(', ')})`;
  const wheel = el('div', 'wheel');
  wheel.append(disc, el('div', 'wheel-pointer'));

  const rows = ROOM_WHEEL.map((slice, i) => {
    const removable = phase.result === null && !phase.removed.includes(i) && phase.removed.length < ROOM_WHEEL.length - 1;
    return {
      label: fr.rooms[slice.value],
      probability: odds.find((o) => o.value === i)?.probability ?? 0,
      color: ROOM_COLORS[slice.value],
      active: phase.result === i,
      struck: phase.removed.includes(i),
      extra: removable ? influence(ctx, fr.wheel.remove, BALANCE.costs.removeSlice, { type: 'removeSlice', index: i }, { small: true }) : null,
    };
  });

  const actions =
    phase.result === null
      ? row('bet-actions', action(fr.wheel.spin, () => ctx.dispatch({ type: 'spinWheel' }), { variant: 'primary', icon: 'play' }))
      : row(
          'bet-actions',
          influence(ctx, '', BALANCE.costs.nudgeWheel, { type: 'nudgeWheel', delta: -1 }, { icon: 'minus', disabled: phase.nudged, small: true }),
          influence(ctx, '', BALANCE.costs.nudgeWheel, { type: 'nudgeWheel', delta: 1 }, { icon: 'plus', disabled: phase.nudged, small: true }),
          influence(ctx, fr.wheel.respin, BALANCE.costs.respinWheel, { type: 'respinWheel' }, { disabled: phase.respun }),
          action(fr.wheel.enter, () => ctx.dispatch({ type: 'enterRoom' }), { variant: 'primary', icon: 'check' }),
        );

  const node = panel(
    fr.wheel.title,
    'star',
    row('wheel-layout', wheel, oddsList(rows)),
    karmaNote(full),
    hint(phase.result === null ? fr.wheel.hintBefore : fr.wheel.hintAfter),
    actions,
  );

  const from = ctx.memo.wheel ?? 0;
  let to = from;
  const prevResult = ctx.prev?.phase.kind === 'roomWheel' ? ctx.prev.phase.result : null;
  if (phase.result !== null) {
    const desired = -(centers[phase.result] ?? 0);
    const small = phase.nudged && prevResult !== null && phase.respun === (ctx.prev?.phase.kind === 'roomWheel' && ctx.prev.phase.respun);
    to = small
      ? desired + 360 * Math.round((from - desired) / 360)
      : desired + 360 * Math.ceil((from + 3 * 360 - desired) / 360);
  }
  ctx.memo.wheel = to;
  disc.style.transform = `rotate(${from}deg)`;

  return {
    node,
    after() {
      if (to === from) return;
      if (reducedMotion()) {
        disc.style.transform = `rotate(${to}deg)`;
        return;
      }
      // Suspense : le résultat et les boutons n'apparaissent qu'une fois la roue arrêtée.
      node.classList.add('suspense');
      const spin = disc.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], {
        duration: Math.abs(to - from) > 360 ? SPIN_MS : 350,
        easing: 'cubic-bezier(0.15, 0.75, 0.2, 1)',
        fill: 'forwards',
      });
      const done = (): void => node.classList.remove('suspense');
      spin.finished.then(done, done);
    },
  };
}
