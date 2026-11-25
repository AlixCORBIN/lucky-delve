import { fr } from '../content/i18n/fr';
import { el } from './dom';
import { icon } from './icons';

export type FallbackCause = keyof typeof fr.fallback.causes;

/** Bandeau discret : signale le mode 2D, la cause et l'aide sont repliées. */
export function showFallbackBanner(cause: FallbackCause, detail?: string): void {
  document.querySelector('.banner')?.remove();
  const banner = el('details', 'banner');
  banner.setAttribute('role', 'status');
  const summary = el('summary');
  summary.append(icon('alertTriangle'), el('strong', undefined, fr.fallback.banner), el('span', 'banner-why', fr.fallback.why));
  const body = el('div', 'banner-text');
  body.append(el('span', undefined, fr.fallback.causes[cause]));
  if (detail) body.append(el('code', undefined, detail));
  banner.append(summary, body);
  document.body.append(banner);
}
