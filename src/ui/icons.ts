import alertTriangle from './icons/alert-triangle.svg?raw';
import arrowLeft from './icons/arrow-left.svg?raw';
import cross from './icons/cross.svg?raw';
import info from './icons/info.svg?raw';
import play from './icons/play.svg?raw';

// Papicons (MIT, voir icons/LICENSE), SVG non modifiés, couleur héritée via currentColor.
const ICONS = { alertTriangle, arrowLeft, cross, info, play } as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = ICONS[name];
  return span;
}
