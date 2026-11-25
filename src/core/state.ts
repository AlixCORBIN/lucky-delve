import { createStreams, type RngStreams } from './rng';

export interface Tile {
  readonly x: number;
  readonly y: number;
}

export interface GameState {
  readonly seed: string;
  readonly rng: RngStreams;
  readonly board: { readonly width: number; readonly height: number };
  readonly hero: Tile;
  readonly turn: number;
}

export type Action = { readonly type: 'moveHero'; readonly to: Tile };

export interface BoardConfig {
  readonly width: number;
  readonly height: number;
  readonly heroStart: Tile;
}

export function createGame(seed: string, board: BoardConfig): GameState {
  return {
    seed,
    rng: createStreams(seed),
    board: { width: board.width, height: board.height },
    hero: board.heroStart,
    turn: 0,
  };
}

export function isOnBoard(state: GameState, tile: Tile): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < state.board.width && tile.y < state.board.height;
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'moveHero': {
      const { to } = action;
      if (!isOnBoard(state, to)) return state;
      if (to.x === state.hero.x && to.y === state.hero.y) return state;
      return { ...state, hero: { x: to.x, y: to.y }, turn: state.turn + 1 };
    }
  }
}
