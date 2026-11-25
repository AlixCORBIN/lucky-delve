import { AnimationMixer, LoopOnce, Vector3, type AnimationAction, type Scene } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Store } from '../core/store';
import type { Models } from './models';

interface Hero3dOptions {
  readonly scene: Scene;
  readonly store: Store;
  readonly models: Models;
  readonly tileSize: number;
}

const WALK_SPEED = 7;
const HERO_SCALE = 1.6;

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function createHero3d({ scene, store, models, tileSize }: Hero3dOptions) {
  const hero = cloneSkinned(models.knight.scene);
  hero.scale.setScalar(HERO_SCALE);
  hero.traverse((o) => {
    o.castShadow = true;
  });
  const start = store.getState().hero;
  hero.position.set(start.x * tileSize, 0, start.y * tileSize);
  hero.rotation.y = Math.PI / 4;
  scene.add(hero);

  const mixer = new AnimationMixer(hero);
  const clip = (name: string): AnimationAction | null => {
    const c = models.knight.animations.find((a) => a.name === name);
    return c ? mixer.clipAction(c) : null;
  };
  const idle = clip('Idle');
  const walk = clip('Walking_A');
  const cheer = clip('Cheer');
  cheer?.setLoop(LoopOnce, 1);
  if (cheer) cheer.clampWhenFinished = false;
  idle?.play();

  let current = idle;
  const fadeTo = (next: AnimationAction | null): void => {
    if (!next || next === current) return;
    next.reset().play();
    if (current) next.crossFadeFrom(current, 0.2, false);
    current = next;
  };
  mixer.addEventListener('finished', () => fadeTo(idle));

  let from = new Vector3();
  let to = new Vector3();
  let progress = 1;
  let duration = 0;

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.hero === previous.hero) return;
    from = hero.position.clone();
    to = new Vector3(state.hero.x * tileSize, 0, state.hero.y * tileSize);
    duration = from.distanceTo(to) / WALK_SPEED;
    progress = 0;
    hero.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    fadeTo(walk);
  });

  return {
    update(dt: number) {
      mixer.update(dt);
      if (progress >= 1) return;
      progress = Math.min(1, progress + dt / Math.max(duration, 0.01));
      hero.position.lerpVectors(from, to, easeInOut(progress));
      if (progress >= 1) fadeTo(cheer ?? idle);
    },
    dispose() {
      unsubscribe();
      mixer.stopAllAction();
      scene.remove(hero);
    },
  };
}
