export type WebGLSupport = 'webgl2' | 'webgl' | null;

export function detectWebGL(): WebGLSupport {
  for (const kind of ['webgl2', 'webgl'] as const) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext(kind) as WebGLRenderingContext | WebGL2RenderingContext | null;
      if (ctx) {
        ctx.getExtension('WEBGL_lose_context')?.loseContext();
        return kind;
      }
    } catch {
      // Certains navigateurs lèvent au lieu de renvoyer null : on tente le suivant.
    }
  }
  return null;
}
