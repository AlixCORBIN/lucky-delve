import { fr } from '../content/i18n/fr';
import { el } from './dom';
import { icon } from './icons';

export function showFallbackBanner(reason: string | null): void {
  const banner = el('div', 'banner');
  banner.setAttribute('role', 'status');
  const text = el('div', 'banner-text');
  text.append(el('strong', undefined, fr.fallback.banner), el('span', undefined, fr.fallback.help));
  if (reason) text.append(el('code', undefined, reason));
  banner.append(icon('alertTriangle'), text);
  document.body.append(banner);
}
