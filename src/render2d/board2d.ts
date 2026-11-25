import type { Store } from '../core/store';
import { PALETTE } from '../render3d/palette';
import type { BoardView } from '../ui/view';

// Filet de sécurité minimal : formes unies, aucune animation. Voir CLAUDE.md.
export function createBoard2d(container: HTMLElement, store: Store): BoardView {
  const canvas = document.createElement('canvas');
  canvas.className = 'board-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  let interactive = false;
  let layout = { size: 0, ox: 0, oy: 0 };

  function draw(): void {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { board, hero } = store.getState();
    const size = Math.floor(Math.min(w / (board.width + 2), h / (board.height + 2)));
    layout = { size, ox: (w - size * board.width) / 2, oy: (h - size * board.height) / 2 };
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.stone : PALETTE.mist;
        ctx.fillRect(layout.ox + x * size + 1, layout.oy + y * size + 1, size - 2, size - 2);
      }
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(layout.ox + (hero.x + 0.5) * size, layout.oy + (hero.y + 0.5) * size, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const onClick = (event: PointerEvent): void => {
    if (!interactive || layout.size === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - layout.ox) / layout.size);
    const y = Math.floor((event.clientY - rect.top - layout.oy) / layout.size);
    store.dispatch({ type: 'moveHero', to: { x, y } });
  };

  canvas.addEventListener('pointerup', onClick);
  const unsubscribe = store.subscribe(draw);
  const observer = new ResizeObserver(draw);
  observer.observe(container);
  draw();

  return {
    setInteractive(on) {
      interactive = on;
    },
    dispose() {
      unsubscribe();
      observer.disconnect();
      canvas.removeEventListener('pointerup', onClick);
      canvas.remove();
    },
  };
}
