/* eslint-disable class-methods-use-this */

import type { Compiler, Module } from 'webpack';
import webpack from 'webpack';
import { RawSource, SourceMapSource, Source } from 'webpack-sources';

const PLUGIN_NAME = 'InlineRequireWebpackPlugin';

const webpackModuleHeader = '(function(module, __webpack_exports__, __webpack_require__) {';
const importPattern =
  /var (\w+_WEBPACK_[A-Z]+_MODULE_\w+) = ([/*#\w]*)(__webpack_require__[^;,]+);/g;

const sideEffectFree = new Map<string | number, boolean>();

function checkSideEffectFree(requireExpression: string) {
  // check if module has sideEffects false
  const [, importedModule] = requireExpression.match(/["']([^"']+)["']/) || [];
  return sideEffectFree.get(importedModule) || false;
}

function collectRequires(src: string) {
  // Collect require variables
  const requireVariables = new Map<
    string,
    { variableName: string; requireExpression: string; isSideEffectFree: boolean }
  >();

  const matches = src.matchAll(importPattern);
  for (const match of matches) {
    const variableName = match[1];
    let requireExpression = match[3];

    // if referencing another require var, inline it
    requireExpression = requireExpression.replace(
      /\w+_WEBPACK_[A-Z]+_MODULE_\w+/,
      (s) => requireVariables.get(s)?.requireExpression || s
    );

    requireVariables.set(variableName, {
      variableName,
      requireExpression,
      isSideEffectFree: checkSideEffectFree(requireExpression),
    });
  }
  return requireVariables;
}

function toString(input: string | ArrayBuffer) {
  return typeof input === 'string'
    ? input
    : String.fromCharCode.apply(null, new Uint16Array(input) as any);
}

export interface InlineRequireWebpackPluginOptions {
  sourceMap?: boolean;
}

class InlineRequireWebpackPlugin {
  private readonly options: InlineRequireWebpackPluginOptions;

  constructor(options: Partial<InlineRequireWebpackPluginOptions> = {}) {
    this.options = { ...options };
  }

  apply(compiler: Compiler) {
    const sourceMap = this.options.sourceMap ?? !!compiler.options.devtool;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      function collectSideEffects(modules: webpack.compilation.Module[]) {
        for (const m of modules) {
          // @ts-ignore v5 only id getter
          const id = compilation.chunkGraph ? compilation.chunkGraph.getModuleId(m) : m.id;
          if (id != null && !sideEffectFree.has(id) && 'libIdent' in m) {
            const ident: string = (m as any).libIdent({
              context: compiler.options.context,
            });

            // either the dependency has explicit sideEffect
            // or we assume only local js/ts modules being sideEffect free
            const isFree =
              m.factoryMeta && m.factoryMeta.sideEffectFree != null
                ? m.factoryMeta.sideEffectFree
                : !ident.includes('node_modules') && /\.[jt]sx?$/.test(ident);

            sideEffectFree.set(id, isFree);
          }
        }
      }

      compilation.hooks.afterOptimizeModuleIds.tap(PLUGIN_NAME, collectSideEffects);

      function manipulateAsset(old: Source, file: string) {
        const sourceAndMap =
          sourceMap && old.sourceAndMap
            ? old.sourceAndMap()
            : {
                source: old.source(),
                map: sourceMap && typeof old.map === 'function' ? old.map() : null,
              };

        const src = toString(sourceAndMap.source)
          .split(webpackModuleHeader)
          .map((v) => {
            // Collect require variables
            const requireVariables = collectRequires(v);
            let output = v;

            // Replace variable names.
            for (const [
              variableName,
              { requireExpression, isSideEffectFree },
            ] of requireVariables.entries()) {
              // eslint-disable-next-line no-continue
              if (!isSideEffectFree) continue;

              // strip top level var declarations
              const declarationlessOutput = output.replace(
                new RegExp(`var ${variableName}[^\\w]([^;]+);`),
                (m, p0) => `// (inlined) ${(p0.match(/"([^"]+)/) || [])[1]}`
              );

              // replace inline variable references with require expression
              const reflessOutput = declarationlessOutput.replace(
                new RegExp(`([^\\w])${variableName}([^\\w])`, 'g'),
                `$1(${requireExpression})$2`
              );

              if (reflessOutput !== declarationlessOutput) {
                // import var is being used somewhere, confirm replacements
                output = reflessOutput;
              }
            }

            return output;
          })
          .join(webpackModuleHeader);

        return sourceAndMap.map
          ? new SourceMapSource(src, file, sourceAndMap.map)
          : new RawSource(src);
      }

      // Webpack v5 hook (as optimizeChunkAssets is deprecated)
      if ('processAssets' in compilation.hooks) {
        // @ts-ignore v5 only hook
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            // @ts-ignore v5 only const
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT,
          },
          (assets: Record<string, Source>) => {
            Object.keys(assets).forEach((file) => {
              compilation.updateAsset(file, (old) => manipulateAsset(old, file));
            });
          }
        );
      } else {
        // Webpack v4 hook
        compilation.hooks.optimizeChunkAssets.tap(PLUGIN_NAME, (chunks) => {
          for (const chunk of chunks) {
            for (const file of chunk.files) {
              compilation.updateAsset(file, (old) => manipulateAsset(old, file));
            }
          }
        });
      }
    });
  }
}

export { InlineRequireWebpackPlugin };
