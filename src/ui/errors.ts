import { fr } from '../content/i18n/fr';
import { el } from './dom';

let shown = false;

/** Toute erreur de démarrage est affichée à l'écran, pas seulement en console. */
export function showFatalError(error: unknown): void {
  console.error(error);
  if (shown) return;
  shown = true;
  document.getElementById('loading')?.remove();
  const box = el('div', 'fatal');
  box.setAttribute('role', 'alert');
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const reload = el('button', 'btn btn-primary', fr.errors.reload);
  reload.addEventListener('click', () => location.reload());
  box.append(el('h1', undefined, fr.errors.boot), el('pre', undefined, detail), reload);
  document.body.append(box);
}

export function installErrorHandlers(): void {
  window.addEventListener('error', (e) => showFatalError(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason));
}
