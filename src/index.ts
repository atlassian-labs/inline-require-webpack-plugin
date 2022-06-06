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
    compilation: webpack.Compilation,
    modules: Iterable<webpack.Module>
  ) {
    for (const m of modules) {
      const id = compilation.chunkGraph ? compilation.chunkGraph.getModuleId(m) : m.id;
      if (id != null && !this.sideEffectFree.has(id) && 'libIdent' in m) {
        const contextDir = compiler.options.context;
        if (!contextDir) {
          throw new Error('No base directory set');
        }

        const ident: null | string = m.libIdent({
          context: contextDir,
        });

        // either the dependency has explicit sideEffect
        // or we assume only local js/ts modules being sideEffect free
        const isFree =
          // @ts-expect-error sideEffectFree is not defined in object
          m.factoryMeta && m.factoryMeta.sideEffectFree != null
            ? // @ts-expect-error sideEffectFree is not defined in object
              m.factoryMeta.sideEffectFree
            : ident != null && !ident.includes('node_modules') && /\.[jt]sx?$/.test(ident);

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
        (moduleSource: any, module: webpack.Module) => {
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
          const moduleId = module.id;
          if (moduleId == null) {
            throw new Error('Module has no ID set');
          }
          return original.map
            ? new SourceMapSource(newSource, String(moduleId), original.map, original.source, original.map)
            : new RawSource(newSource);
        }
      );
    });
  }
}

export { InlineRequireWebpackPlugin };
