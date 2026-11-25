import { CREDITS } from '../content/credits';
import { fr } from '../content/i18n/fr';
import { el } from './dom';
import { icon } from './icons';
import { enterRows, popoverIn, popoverOut } from './motion';

/** Popover des crédits : s'ouvre depuis le bouton qui l'a déclenché et y retourne. */
export function openCredits(trigger: HTMLElement): void {
  const layer = el('div', 'popover-layer');
  const panel = el('div', 'popover');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', fr.credits.title);

  const close = el('button', 'btn-icon');
  close.type = 'button';
  close.setAttribute('aria-label', fr.menu.close);
  close.append(icon('cross'));

  const head = el('div', 'popover-head');
  head.append(el('h2', undefined, fr.credits.title), close);
  const intro = el('p', 'muted', fr.credits.intro);
  const list = el('ul', 'credits');
  const rows = CREDITS.map((c) => {
    const li = el('li');
    const link = el('a', undefined, c.asset);
    link.href = c.url;
    link.target = '_blank';
    link.rel = 'noopener';
    li.append(link, el('span', 'muted', `${c.author} · ${c.license}`));
    return li;
  });
  list.append(...rows);
  panel.append(head, intro, list);
  layer.append(panel);
  document.body.append(layer);
  void popoverIn(panel, trigger);
  void enterRows(rows);
  close.focus();

  let closing = false;
  const dismiss = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onKey);
    await popoverOut(panel, trigger);
    layer.remove();
    trigger.focus();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') void dismiss();
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', () => void dismiss());
  layer.addEventListener('click', (e) => {
    if (e.target === layer) void dismiss();
  });
}
