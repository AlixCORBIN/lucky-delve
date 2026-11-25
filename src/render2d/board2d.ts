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

  // Projection isométrique 2:1 : la case (x, y) devient un losange.
  const toScreen = (x: number, y: number): [number, number] => [
    layout.ox + (x - y) * layout.size,
    layout.oy + (x + y) * (layout.size / 2),
  ];

  function diamond(cx: number, cy: number, inset: number): void {
    if (!ctx) return;
    const s = layout.size * inset;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s / 2);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s / 2);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.fill();
  }

  function draw(): void {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { board, hero } = store.getState();
    const span = board.width + board.height;
    const size = Math.floor(Math.min((w * 0.9) / span, (h * 0.8) / (span / 2)));
    layout = { size, ox: w / 2 + ((board.height - board.width) * size) / 2, oy: h / 2 - (span / 2 - 1) * (size / 2) };
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.stone : PALETTE.mist;
        diamond(...toScreen(x, y), 0.96);
      }
    }
    const [hx, hy] = toScreen(hero.x, hero.y);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.ellipse(hx, hy, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const onClick = (event: PointerEvent): void => {
    if (!interactive || layout.size === 0) return;
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left - layout.ox) / layout.size;
    const py = (event.clientY - rect.top - layout.oy) / (layout.size / 2);
    const x = Math.round((px + py) / 2);
    const y = Math.round((py - px) / 2);
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
