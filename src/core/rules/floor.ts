import { BALANCE } from '../../content/balance';
import { drawIndex } from '../destin';
import type { RngState } from '../rng';
import type { Cell, Floor, Tile } from './types';

export const indexOf = (floor: Floor, t: Tile): number => t.y * floor.width + t.x;
export const cellAt = (floor: Floor, t: Tile): Cell | undefined =>
  isOnFloor(floor, t) ? floor.cells[indexOf(floor, t)] : undefined;
export const sameTile = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y;
export const distance = (a: Tile, b: Tile): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function isOnFloor(floor: Floor, t: Tile): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < floor.width && t.y < floor.height;
}

export function setCell(floor: Floor, t: Tile, cell: Cell): Floor {
  const cells = [...floor.cells];
  cells[indexOf(floor, t)] = cell;
  return { ...floor, cells };
}

/** Étage : départ dans un coin, sortie (boss) dans le coin opposé, salles et flaques tirées sur le flux `map`. */
export function generateFloor(rng: RngState): [Floor, RngState] {
  const { width, height, rooms, clovers } = BALANCE.floor;
  const start = { x: 0, y: 0 };
  const exit = { x: width - 1, y: height - 1 };
  const cells: Cell[] = Array.from({ length: width * height }, () => 'floor');
  cells[exit.y * width + exit.x] = 'exit';
  // Les cases voisines du départ restent libres : le premier jet ne tombe pas forcément sur une salle.
  const free: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const t = { x: i % width, y: Math.floor(i / width) };
    if (cells[i] === 'floor' && distance(t, start) > 1) free.push(i);
  }
  let s = rng;
  const place = (count: number, cell: Cell): void => {
    for (let n = 0; n < count && free.length > 0; n++) {
      const [pick, next] = drawIndex(s, free.length);
      s = next;
      const [index] = free.splice(pick, 1);
      if (index !== undefined) cells[index] = cell;
    }
  };
  place(rooms, 'room');
  place(clovers, 'clover');
  return [{ width, height, cells, start, exit }, s];
}

/**
 * Cases d'arrivée possibles pour un jet de `steps` :
 * - toute case à exactement `steps` pas (il faut « tomber pile », y compris sur la sortie et les flaques) ;
 * - toute salle cachée à `steps` pas ou moins : on s'arrête à la porte.
 * Si aucune case n'est à la bonne distance (jet trop grand), on garde les plus lointaines.
 */
export function reachable(floor: Floor, from: Tile, steps: number): Tile[] {
  const tiles: Tile[] = [];
  let farthest = 0;
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const d = distance(from, { x, y });
      if (d > 0 && d <= steps) farthest = Math.max(farthest, d);
    }
  }
  const target = Math.min(steps, farthest);
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const t = { x, y };
      const d = distance(from, t);
      if (d === 0) continue;
      if (d === target || (d <= steps && cellAt(floor, t) === 'room')) tiles.push(t);
    }
  }
  return tiles;
}
