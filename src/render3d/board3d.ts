import {
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import type { Tile } from '../core/state';
import type { Store } from '../core/store';
import type { Models } from './models';
import { PALETTE } from './palette';

const TILE_FILL = 0.96;

interface Board3dOptions {
  readonly scene: Scene;
  readonly camera: Camera;
  readonly canvas: HTMLCanvasElement;
  readonly store: Store;
  readonly models: Models;
  readonly tileSize: number;
}

export function createBoard3d({ scene, camera, canvas, store, models, tileSize }: Board3dOptions) {
  const { width, height } = store.getState().board;
  const tiles: Object3D[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = models.floorTile.scene.clone();
      tile.position.set(x * tileSize, 0, y * tileSize);
      // Léger jour entre les dalles : la grille reste lisible pour choisir une case.
      tile.scale.set(TILE_FILL, 1, TILE_FILL);
      tile.traverse((o) => {
        o.receiveShadow = true;
      });
      scene.add(tile);
      tiles.push(tile);
    }
  }

  const marker = new Mesh(
    new CircleGeometry(tileSize * 0.38, 32),
    new MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.07;
  marker.visible = false;
  scene.add(marker);

  const raycaster = new Raycaster();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const pointer = new Vector2();
  const hit = new Vector3();
  let interactive = false;
  let pulse = 0;

  function tileAt(event: PointerEvent): Tile | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(floor, hit)) return null;
    const x = Math.round(hit.x / tileSize);
    const y = Math.round(hit.z / tileSize);
    return x >= 0 && y >= 0 && x < width && y < height ? { x, y } : null;
  }

  const onMove = (event: PointerEvent): void => {
    const tile = interactive ? tileAt(event) : null;
    const hero = store.getState().hero;
    const valid = tile !== null && (tile.x !== hero.x || tile.y !== hero.y);
    marker.visible = valid;
    canvas.style.cursor = valid ? 'pointer' : '';
    if (tile) marker.position.set(tile.x * tileSize, marker.position.y, tile.y * tileSize);
  };
  const onClick = (event: PointerEvent): void => {
    if (!interactive) return;
    const tile = tileAt(event);
    if (tile) store.dispatch({ type: 'moveHero', to: tile });
    marker.visible = false;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onClick);

  return {
    setInteractive(on: boolean) {
      interactive = on;
      if (!on) marker.visible = false;
    },
    update(dt: number) {
      pulse += dt;
      marker.scale.setScalar(1 + Math.sin(pulse * 4) * 0.04);
    },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onClick);
      marker.geometry.dispose();
      marker.material.dispose();
      for (const t of tiles) scene.remove(t);
    },
  };
}
