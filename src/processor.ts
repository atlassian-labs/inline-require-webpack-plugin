import type { ProcessedSource, SideEffectFree } from './types';

const importPattern =
  /var (\w+_WEBPACK_[A-Z]+_MODULE_\w+) = ([/*#\w]*)(__webpack_require__[^;,]+);/g;

function checkSideEffectFree(sideEffectFree: SideEffectFree, requireExpression: string) {
  // check if module has sideEffects false
  const [, importedModule] = requireExpression.match(/["']([^"']+)["']/) || [];
  return sideEffectFree.get(importedModule) || false;
}

function collectRequires(src: string, sideEffectFree: SideEffectFree) {
  // Collect require variables
  const requireVariables = new Map<string, ProcessedSource>();

  const matches = src.matchAll(importPattern);
  for (const match of matches) {
    const variableName = match[1];
    let requireExpression = match[3];

    // if referencing another require var, inline it
    requireExpression = requireExpression.replace(
      /\w+_WEBPACK_[A-Z]+_MODULE_\w+/,
      (s) => requireVariables.get(s) || s
    );

    if (!checkSideEffectFree(sideEffectFree, requireExpression)) {
      continue;
    }

    requireVariables.set(variableName, requireExpression);
  }
  return requireVariables;
}

export function processSource(
  originalSource: string,
  sideEffectFree: SideEffectFree
): ProcessedSource {
  let newSource = originalSource;
  const requireVariables = collectRequires(originalSource, sideEffectFree);

  if (requireVariables.size === 0) {
    return null;
  }

  // Replace variable names.
  for (const [variableName, requireExpression] of requireVariables.entries()) {
    // strip top level var declarations
    const declarationlessOutput = newSource.replace(
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
      newSource = reflessOutput;
    }
  }

  // nothing has changed
  if (newSource === originalSource) {
    return null;
  }

  return newSource;
}
