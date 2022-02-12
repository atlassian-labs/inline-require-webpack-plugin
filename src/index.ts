import webpack from 'webpack';
import { RawSource, SourceMapSource, Source } from 'webpack-sources';
import { processSource } from './processor';
import type { SideEffectFree } from './types';

const PLUGIN_NAME = 'InlineRequireWebpackPlugin';

const excludeNull = Boolean as unknown as <T>(x: T | null) => x is T;

export interface InlineRequireWebpackPluginOptions {
  sourceMap?: boolean;
}

class InlineRequireWebpackPlugin {
  private readonly options: InlineRequireWebpackPluginOptions;

  private readonly sideEffectFree: SideEffectFree = new Map();

  constructor(options: Partial<InlineRequireWebpackPluginOptions> = {}) {
    this.options = { ...options };
  }

  collectSideEffects(
    compiler: webpack.Compiler,
    compilation: webpack.compilation.Compilation,
    modules: webpack.compilation.Module[]
  ) {
    for (const m of modules) {
      // @ts-expect-error v5 only id getter
      const id = compilation.chunkGraph ? compilation.chunkGraph.getModuleId(m) : m.id;
      if (id != null && !this.sideEffectFree.has(id) && 'libIdent' in m) {
        // @ts-expect-error libIdent missing in Module type
        const ident: string = m.libIdent({
          context: compiler.options.context,
        });

        // either the dependency has explicit sideEffect
        // or we assume only local js/ts modules being sideEffect free
        const isFree =
          m.factoryMeta && m.factoryMeta.sideEffectFree != null
            ? m.factoryMeta.sideEffectFree
            : !ident.includes('node_modules') && /\.[jt]sx?$/.test(ident);

        this.sideEffectFree.set(id, isFree);
      }
    }
  }

  async processFiles(
    compiler: webpack.Compiler,
    compilation: webpack.compilation.Compilation,
    chunkFiles: string[]
  ) {
    const sourceMap = this.options.sourceMap ?? !!compiler.options.devtool;

    const chunkAssets: string[] = Array.from(compilation.additionalChunkAssets || []);
    const files = [...chunkFiles, ...chunkAssets];

    const processed = files.map((file) => {
      // skip non-JS files
      if (!file.match(/\.m?[jt]sx?$/i)) return null;

      const asset: Source = compilation.assets[file];

      const original =
        sourceMap && asset.sourceAndMap
          ? asset.sourceAndMap()
          : {
              source: asset.source() as string,
              map: sourceMap && typeof asset.map === 'function' ? asset.map() : null,
            };

      const result = processSource(file, original, this.sideEffectFree);

      return {
        file,
        asset:
          result.map && original.map
            ? new SourceMapSource(result.source, file, result.map, original.source, original.map)
            : new RawSource(result.source),
      };
    });

    processed.filter(excludeNull).forEach(({ file, asset }) => {
      compilation.assets[file] = asset;
    });
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.afterOptimizeModuleIds.tap(
        PLUGIN_NAME,
        this.collectSideEffects.bind(this, compiler, compilation)
      );

      // Webpack v5 hook (as optimizeChunkAssets is deprecated)
      if ('processAssets' in compilation.hooks) {
        // @ts-expect-error v5 only hook
        compilation.hooks.processAssets.tapPromise(
          {
            name: PLUGIN_NAME,
            // @ts-expect-error v5 only const
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets: Record<string, Source>) => {
            const chunkFiles = Object.keys(assets);
            return this.processFiles(compiler, compilation, chunkFiles);
          }
        );
      } else {
        // Webpack v4 hook
        compilation.hooks.optimizeChunkAssets.tapPromise(PLUGIN_NAME, (chunks) => {
          const chunkFiles = Array.from(chunks).reduce(
            (acc, chunk) => acc.concat(Array.from(chunk.files || [])),
            [] as string[]
          );
          return this.processFiles(compiler, compilation, chunkFiles);
        });
      }
    });
  }
}

export { InlineRequireWebpackPlugin };
