// Durées et courbes des menus, d'après le design system « DA Alix » (section Mouvement).
// Les animations du plateau (dés, roue, rouleaux, héros) ne passent pas par ici.

export const MOTION = {
  menuIn: 220,
  popoverIn: 200,
  stagger: 30,
  exitRatio: 0.8,
  overlap: 60,
  press: 0.97,
  popoverScale: 0.95,
  stretch: 1.12,
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  colorChange: 160,
} as const;

const exitOf = (ms: number): number => Math.round(ms * MOTION.exitRatio);

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applyMotionVars(root: HTMLElement): void {
  root.style.setProperty('--press-scale', String(MOTION.press));
  root.style.setProperty('--ease-out', MOTION.easeOut);
  root.style.setProperty('--ease-in-out', MOTION.easeInOut);
  root.style.setProperty('--color-change', `${MOTION.colorChange}ms`);
}

function run(el: Element, keyframes: Keyframe[], duration: number, easing: string, delay = 0): Promise<void> {
  const anim = el.animate(keyframes, { duration, easing, delay, fill: 'both' });
  return anim.finished.then(() => undefined, () => undefined);
}

/** Entrée d'un écran : chaque ligne arrive en fondu, décalée de 30 ms. */
export function enterRows(rows: readonly Element[]): Promise<void> {
  const reduce = reducedMotion();
  return Promise.all(
    rows.map((row, i) =>
      run(
        row,
        reduce
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        MOTION.menuIn,
        MOTION.easeOut,
        reduce ? 0 : i * MOTION.stagger,
      ),
    ),
  ).then(() => undefined);
}

/** Sortie d'un écran : 20 % plus courte que l'entrée. */
export function exitRows(rows: readonly Element[]): Promise<void> {
  const reduce = reducedMotion();
  return Promise.all(
    rows.map((row) =>
      run(
        row,
        reduce
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
        exitOf(MOTION.menuIn),
        MOTION.easeOut,
      ),
    ),
  ).then(() => undefined);
}

/** Les étapes se chevauchent : la suivante entre avant la fin de la sortie. */
export async function swap(out: readonly Element[], into: () => readonly Element[]): Promise<void> {
  const leaving = exitRows(out);
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : MOTION.overlap));
  await Promise.all([leaving, enterRows(into())]);
}

function originFrom(popover: HTMLElement, trigger: HTMLElement): string {
  const p = popover.getBoundingClientRect();
  const t = trigger.getBoundingClientRect();
  return `${t.left + t.width / 2 - p.left}px ${t.top + t.height / 2 - p.top}px`;
}

/** Popover : entre à 0,95 depuis son déclencheur, et repart vers lui. */
export function popoverIn(popover: HTMLElement, trigger: HTMLElement): Promise<void> {
  popover.style.transformOrigin = originFrom(popover, trigger);
  const scale = reducedMotion() ? 1 : MOTION.popoverScale;
  return run(popover, [{ opacity: 0, transform: `scale(${scale})` }, { opacity: 1, transform: 'none' }], MOTION.popoverIn, MOTION.easeOut);
}

export function popoverOut(popover: HTMLElement, trigger: HTMLElement): Promise<void> {
  popover.style.transformOrigin = originFrom(popover, trigger);
  const scale = reducedMotion() ? 1 : MOTION.popoverScale;
  return run(popover, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `scale(${scale})` }], exitOf(MOTION.popoverIn), MOTION.easeOut);
}

/** Petite pulsation de réussite. Sans mouvement : simple éclat d'opacité. */
export function pulse(el: Element): Promise<void> {
  const frames = reducedMotion()
    ? [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }]
    : [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }];
  return run(el, frames, 260, MOTION.easeOut);
}
