import type { AnimationClip, Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import urls from 'virtual:model-urls';

export interface LoadedModel {
  readonly scene: Group;
  readonly animations: AnimationClip[];
}

export interface Models {
  readonly knight: LoadedModel;
  readonly floorTile: LoadedModel;
}

export async function loadModels(): Promise<Models> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const load = async (url: string): Promise<LoadedModel> => {
    const gltf = await loader.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
  };
  const [knight, floorTile] = await Promise.all([load(urls.knight), load(urls.floor_tile_large)]);
  return { knight, floorTile };
}
