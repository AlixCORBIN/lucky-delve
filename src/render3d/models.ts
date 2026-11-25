import { TextureLoader, type AnimationClip, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import urls from 'virtual:model-urls';

export interface LoadedModel {
  readonly scene: Group;
  readonly animations: AnimationClip[];
}

export interface Models {
  readonly knight: LoadedModel;
  readonly floorTile: LoadedModel;
}

// L'artefact Claude interdit fetch() sur les data: URI et la compilation WebAssembly (CSP).
// On décode donc le base64 à la main, les modèles ne sont pas compressés en Meshopt,
// et les textures passent par <img> (blob: autorisé en img-src) au lieu de fetch + ImageBitmap.
function decodeDataUri(uri: string): ArrayBuffer {
  const binary = atob(uri.slice(uri.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function loadModels(): Promise<Models> {
  const loader = new GLTFLoader();
  loader.register((parser) => {
    parser.textureLoader = new TextureLoader(parser.options.manager);
    return { name: 'img_textures' };
  });
  const load = async (url: string): Promise<LoadedModel> => {
    const gltf = url.startsWith('data:') ? await loader.parseAsync(decodeDataUri(url), '') : await loader.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
  };
  const [knight, floorTile] = await Promise.all([load(urls.knight), load(urls.floor_tile_large)]);
  return { knight, floorTile };
}
