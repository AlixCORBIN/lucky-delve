import alertTriangle from './icons/alert-triangle.svg?raw';
import arrowDown from './icons/arrow-down.svg?raw';
import arrowLeft from './icons/arrow-left.svg?raw';
import arrowUp from './icons/arrow-up.svg?raw';
import card from './icons/card.svg?raw';
import check from './icons/check.svg?raw';
import crown from './icons/crown.svg?raw';
import cross from './icons/cross.svg?raw';
import ghost from './icons/ghost.svg?raw';
import heart from './icons/heart.svg?raw';
import info from './icons/info.svg?raw';
import lock from './icons/lock.svg?raw';
import minus from './icons/minus.svg?raw';
import piggyBank from './icons/piggy-bank.svg?raw';
import play from './icons/play.svg?raw';
import plus from './icons/plus.svg?raw';
import search from './icons/search.svg?raw';
import sparkles from './icons/sparkles.svg?raw';
import star from './icons/star.svg?raw';
import unlock from './icons/unlock.svg?raw';
import walk from './icons/walk.svg?raw';

// Papicons (MIT, voir icons/LICENSE), SVG non modifiés, couleur héritée via currentColor.
// Sans équivalent exact : Trèfles → sparkles, Or → piggyBank, Karma → star.
const ICONS = {
  alertTriangle, arrowDown, arrowLeft, arrowUp, card, check, crown, cross, ghost, heart, info,
  lock, minus, piggyBank, play, plus, search, sparkles, star, unlock, walk,
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = ICONS[name];
  return span;
}
