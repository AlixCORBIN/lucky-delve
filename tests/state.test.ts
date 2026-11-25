import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/content/balance';
import { createGame, reduce, type Action, type GameState } from '../src/core/state';
import { moveTargets } from '../src/core/rules/explore';
import { forge } from '../src/core/rules/loot';
import { comboOf } from '../src/core/rules/combat';
import { cellAt } from '../src/core/rules/floor';

const run = (s: GameState, ...actions: Action[]): GameState => actions.reduce(reduce, s);

describe('partie', () => {
  it('même graine = même étage et mêmes jets', () => {
    const a = run(createGame('graine'), { type: 'rollMove' });
    const b = run(createGame('graine'), { type: 'rollMove' });
    expect(a.floor).toEqual(b.floor);
    expect(a.phase).toEqual(b.phase);
  });

  it('étage : salles, flaques et sortie placées', () => {
    const { floor } = createGame('etage');
    expect(floor.cells.filter((c) => c === 'room')).toHaveLength(BALANCE.floor.rooms);
    expect(floor.cells.filter((c) => c === 'clover')).toHaveLength(BALANCE.floor.clovers);
    expect(cellAt(floor, floor.exit)).toBe('exit');
  });

  it('déplacement : lancer, choisir une case atteignable', () => {
    let s = run(createGame('move'), { type: 'rollMove' });
    const targets = moveTargets(s);
    expect(targets.length).toBeGreaterThan(0);
    const before = s;
    s = reduce(s, { type: 'moveHero', to: { x: 99, y: 99 } });
    expect(s).toBe(before);
    s = reduce(s, { type: 'moveHero', to: targets[0]! });
    expect(s.pos).toEqual(targets[0]);
    expect(s.turn).toBe(1);
  });

  it('une influence coûte des Trèfles et refuse sans Trèfles', () => {
    let s = run(createGame('cost'), { type: 'rollMove' });
    s = reduce(s, { type: 'rerollMove' });
    expect(s.hero.clovers).toBe(BALANCE.hero.clovers - BALANCE.costs.reroll);
    const broke: GameState = { ...s, hero: { ...s.hero, clovers: 0 } };
    expect(reduce(broke, { type: 'pushMove', index: 0, delta: 1 })).toBe(broke);
  });

  it('une action hors phase est ignorée', () => {
    const s = createGame('phase');
    expect(reduce(s, { type: 'strike' })).toBe(s);
  });

  it('jouer au hasard ne casse jamais la partie', () => {
    const actions: Action[] = [
      { type: 'rollMove' }, { type: 'spinWheel' }, { type: 'enterRoom' }, { type: 'rollHand' },
      { type: 'toggleSlot', index: 0 }, { type: 'strike' }, { type: 'spinReels' }, { type: 'takeLoot' },
      { type: 'rollTrap' }, { type: 'resolveTrap' }, { type: 'guessCard', guess: 'higher' }, { type: 'cashOut' },
      { type: 'nextFloor' },
    ];
    for (let seed = 0; seed < 30; seed++) {
      let s = createGame(`fuzz${seed}`);
      for (let step = 0; step < 400 && s.phase.kind !== 'over'; step++) {
        const t = moveTargets(s);
        s = t.length ? reduce(s, { type: 'moveHero', to: t[t.length - 1]! }) : actions.reduce(reduce, s);
        expect(s.hero.hp).toBeGreaterThanOrEqual(0);
        expect(s.hero.clovers).toBeGreaterThanOrEqual(0);
        expect(s.hero.karma).toBeLessThanOrEqual(BALANCE.karma.max);
      }
    }
  });
});

describe('règles', () => {
  it('combos façon poker', () => {
    expect(comboOf([3, 5, 1])).toBe(1);
    expect(comboOf([4, 4, 1])).toBe(BALANCE.combat.combos.pair);
    expect(comboOf([2, 2, 2])).toBe(BALANCE.combat.combos.triple);
  });

  it('la forge améliore la plus petite face', () => {
    const { dice, upgrades } = forge([{ faces: [1, 2, 3] }, { faces: [2, 2, 3] }], 2);
    expect(upgrades).toEqual([{ from: 1, to: 2 }, { from: 2, to: 3 }]);
    expect(dice[0]!.faces).toEqual([3, 2, 3]);
  });
});
