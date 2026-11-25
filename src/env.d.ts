declare const __APP_VERSION__: string;
declare const __COMMIT__: string;

declare module 'virtual:model-urls' {
  const urls: Record<'knight' | 'floor_tile_large', string>;
  export default urls;
}
