import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  OrthographicCamera,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Store } from '../core/store';
import type { BoardView } from '../ui/view';
import { createBoard3d } from './board3d';
import { createHero3d } from './hero3d';
import type { Models } from './models';
import { PALETTE } from './palette';

const VIEW_HEIGHT = 18.5;
export const TILE_SIZE = 4;

export interface Scene3dOptions {
  readonly container: HTMLElement;
  readonly store: Store;
  readonly models: Models;
  readonly onContextLost: () => void;
}

export function createScene3d({ container, store, models, onContextLost }: Scene3dOptions): BoardView {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.className = 'board-canvas';
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(PALETTE.night);

  const { width, height } = store.getState().board;
  const center = new Vector3(((width - 1) * TILE_SIZE) / 2, 0, ((height - 1) * TILE_SIZE) / 2);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  // Vue isométrique classique : 45° autour de Y, ~35° d'inclinaison.
  camera.position.copy(center).add(new Vector3(30, 30 * Math.SQRT1_2 * 1.15, 30));
  camera.lookAt(center);

  scene.add(new HemisphereLight(new Color(PALETTE.cream), new Color(PALETTE.plum), 1.6));
  scene.add(new AmbientLight(new Color(PALETTE.mist), 0.35));
  const sun = new DirectionalLight(new Color(PALETTE.cream), 2.2);
  sun.position.copy(center).add(new Vector3(-10, 25, 12));
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  const span = Math.max(width, height) * TILE_SIZE;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  scene.add(sun, sun.target);

  const board = createBoard3d({ scene, camera, canvas: renderer.domElement, store, models, tileSize: TILE_SIZE });
  const hero = createHero3d({ scene, store, models, tileSize: TILE_SIZE });

  function resize(): void {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // Sur écran étroit on élargit le cadre pour garder tout le plateau visible.
    const viewH = aspect < 1 ? VIEW_HEIGHT / aspect : VIEW_HEIGHT;
    camera.left = (-viewH * aspect) / 2;
    camera.right = (viewH * aspect) / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const timer = new Timer();
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.1);
    hero.update(dt);
    board.update(dt);
    renderer.render(scene, camera);
  });

  const handleLost = (event: Event): void => {
    event.preventDefault();
    onContextLost();
  };
  renderer.domElement.addEventListener('webglcontextlost', handleLost);

  return {
    setInteractive: (on) => board.setInteractive(on),
    dispose() {
      renderer.setAnimationLoop(null);
      timer.dispose();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleLost);
      board.dispose();
      hero.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
