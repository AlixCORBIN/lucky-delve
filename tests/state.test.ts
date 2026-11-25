import { describe, expect, it } from 'vitest';
import { BOARD } from '../src/content/board';
import { createGame, reduce } from '../src/core/state';

describe('state', () => {
  it('déplace le héros sur une case du plateau', () => {
    const g = reduce(createGame('s', BOARD), { type: 'moveHero', to: { x: 0, y: 4 } });
    expect(g.hero).toEqual({ x: 0, y: 4 });
    expect(g.turn).toBe(1);
  });

  it('ignore une case hors plateau', () => {
    const g0 = createGame('s', BOARD);
    expect(reduce(g0, { type: 'moveHero', to: { x: 9, y: 0 } })).toBe(g0);
  });
});
