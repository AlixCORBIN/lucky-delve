import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Plane,
  Raycaster,
  TorusGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import { moveTargets } from '../core/rules/explore';
import type { Cell, GameState, Tile } from '../core/state';
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

const solid = (color: string): MeshStandardMaterial => new MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 });
const flat = (color: string, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

export function createBoard3d({ scene, camera, canvas, store, models, tileSize }: Board3dOptions) {
  const { width, height } = store.getState().floor;
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

  // Géométries et matériaux partagés par toutes les cases.
  const geo = {
    room: new OctahedronGeometry(0.75),
    puddle: new CylinderGeometry(1.1, 1.2, 0.08, 7),
    leaf: new CylinderGeometry(0.32, 0.32, 0.1, 6),
    portal: new TorusGeometry(1.1, 0.22, 6, 14),
    disc: new CircleGeometry(tileSize * 0.4, 28),
  };
  const mat = {
    room: solid(PALETTE.berry),
    puddle: solid(PALETTE.sky),
    leaf: solid(PALETTE.clover),
    portal: solid(PALETTE.gold),
    target: flat(PALETTE.sky, 0.45),
    hover: flat(PALETTE.gold, 0.6),
  };

  const markers = new Group();
  scene.add(markers);
  const spinning: Object3D[] = [];

  function markerFor(cell: Cell): Object3D | null {
    if (cell === 'room') {
      const m = new Mesh(geo.room, mat.room);
      m.position.y = 1.5;
      m.castShadow = true;
      spinning.push(m);
      return m;
    }
    if (cell === 'clover') {
      const g = new Group();
      const puddle = new Mesh(geo.puddle, mat.puddle);
      puddle.position.y = 0.08;
      g.add(puddle);
      for (let i = 0; i < 3; i++) {
        const leaf = new Mesh(geo.leaf, mat.leaf);
        const a = (i / 3) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.3, 0.18, Math.sin(a) * 0.3);
        g.add(leaf);
      }
      return g;
    }
    if (cell === 'exit') {
      const m = new Mesh(geo.portal, mat.portal);
      m.position.y = 1.3;
      m.rotation.y = Math.PI / 4;
      m.castShadow = true;
      return m;
    }
    return null;
  }

  function buildMarkers(state: GameState): void {
    markers.clear();
    spinning.length = 0;
    state.floor.cells.forEach((cell, i) => {
      const m = markerFor(cell);
      if (!m) return;
      m.position.x = (i % width) * tileSize;
      m.position.z = Math.floor(i / width) * tileSize;
      markers.add(m);
    });
  }

  const targets = new Group();
  scene.add(targets);
  function buildTargets(state: GameState): void {
    targets.clear();
    for (const t of moveTargets(state)) {
      const d = new Mesh(geo.disc, mat.target);
      d.rotation.x = -Math.PI / 2;
      d.position.set(t.x * tileSize, 0.06, t.y * tileSize);
      targets.add(d);
    }
  }

  const hover = new Mesh(geo.disc, mat.hover);
  hover.rotation.x = -Math.PI / 2;
  hover.position.y = 0.07;
  hover.visible = false;
  scene.add(hover);

  buildMarkers(store.getState());
  buildTargets(store.getState());
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.floor !== previous.floor) buildMarkers(state);
    buildTargets(state);
    hover.visible = false;
  });

  const raycaster = new Raycaster();
  const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
  const pointer = new Vector2();
  const hit = new Vector3();
  let interactive = false;
  let time = 0;

  function tileAt(event: PointerEvent): Tile | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(floorPlane, hit)) return null;
    const x = Math.round(hit.x / tileSize);
    const y = Math.round(hit.z / tileSize);
    return x >= 0 && y >= 0 && x < width && y < height ? { x, y } : null;
  }

  const isTarget = (tile: Tile | null): tile is Tile =>
    tile !== null && moveTargets(store.getState()).some((t) => t.x === tile.x && t.y === tile.y);

  const onMove = (event: PointerEvent): void => {
    const tile = interactive ? tileAt(event) : null;
    const valid = isTarget(tile);
    hover.visible = valid;
    canvas.style.cursor = valid ? 'pointer' : '';
    if (valid) hover.position.set(tile.x * tileSize, hover.position.y, tile.y * tileSize);
  };
  const onClick = (event: PointerEvent): void => {
    if (!interactive) return;
    const tile = tileAt(event);
    if (isTarget(tile)) store.dispatch({ type: 'moveHero', to: tile });
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onClick);

  return {
    setInteractive(on: boolean) {
      interactive = on;
      if (!on) hover.visible = false;
    },
    update(dt: number) {
      time += dt;
      const s = 1 + Math.sin(time * 4) * 0.05;
      for (const t of targets.children) t.scale.setScalar(s);
      for (const m of spinning) {
        m.rotation.y += dt * 1.2;
        m.position.y = 1.5 + Math.sin(time * 2 + m.position.x) * 0.12;
      }
    },
    dispose() {
      unsubscribe();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onClick);
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mat)) m.dispose();
      scene.remove(markers, targets, hover, ...tiles);
    },
  };
}
