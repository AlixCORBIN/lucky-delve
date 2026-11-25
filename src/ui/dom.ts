import { icon, type IconName } from './icons';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, iconName: IconName | null, variant: 'primary' | 'ghost'): HTMLButtonElement {
  const b = el('button', `btn btn-${variant}`);
  b.type = 'button';
  if (iconName) b.append(icon(iconName));
  b.append(el('span', undefined, label));
  return b;
}
