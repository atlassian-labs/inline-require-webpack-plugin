import webpack from 'webpack';
import { RawSource, SourceMapSource } from 'webpack-sources';
import { processSource } from './processor';
import type { SideEffectFree } from './types';

const PLUGIN_NAME = 'InlineRequireWebpackPlugin';

export interface InlineRequireWebpackPluginOptions {
  sourceMap?: boolean;
  cache?: boolean;
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

  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.afterOptimizeModuleIds.tap(
        PLUGIN_NAME,
        this.collectSideEffects.bind(this, compiler, compilation)
      );

      compilation.moduleTemplates.javascript.hooks.package.tap(
        PLUGIN_NAME,
        (moduleSource, module) => {
          const sourceMap = this.options.sourceMap ?? !!compiler.options.devtool;
          const original =
            sourceMap && moduleSource.sourceAndMap
              ? moduleSource.sourceAndMap()
              : {
                  source: moduleSource.source() as string,
                  map:
                    sourceMap && typeof moduleSource.map === 'function' ? moduleSource.map() : null,
                };
          const newSource = processSource(original.source, this.sideEffectFree);
          if (newSource === null) {
            return moduleSource;
          }
          return original.map
            ? new SourceMapSource(newSource, module.id, original.map, original.source, original.map)
            : new RawSource(newSource);
        }
      );
    });
  }
}

export { InlineRequireWebpackPlugin };
