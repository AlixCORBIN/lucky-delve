import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

function commitHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

// Models live in public/models. The single-file artifact cannot fetch them,
// so in that mode they are inlined as data URIs through a virtual module.
function modelUrls(inline: boolean): Plugin {
  const id = 'virtual:model-urls';
  return {
    name: 'model-urls',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load(resolved) {
      if (resolved !== '\0' + id) return null;
      const names = ['knight', 'floor_tile_large'];
      const entries = names.map((name) => {
        const url = inline
          ? `data:model/gltf-binary;base64,${readFileSync(`public/models/${name}.glb`).toString('base64')}`
          : `models/${name}.glb`;
        return `${JSON.stringify(name)}: ${JSON.stringify(url)}`;
      });
      return `export default { ${entries.join(', ')} };`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    publicDir: single ? false : 'public',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __COMMIT__: JSON.stringify(commitHash()),
    },
    plugins: [modelUrls(single), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? Number.MAX_SAFE_INTEGER : 4096,
      chunkSizeWarningLimit: 1200,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
