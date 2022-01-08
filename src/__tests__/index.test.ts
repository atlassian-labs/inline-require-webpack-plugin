import path from 'path';
import { webpackCompile, removeBuildDir } from './__utils__';

// Since webpack build can take longer than the default jest wait time
jest.setTimeout(300000);

function getModuleOutput(content: string, name: string) {
  return content
    .split(`${name}":\n`)[1]
    .split('/***/ })')[0]
    .replace(/\/\*\*\*\/.+/g, '')
    .replace(/\n{2,}/g, '\n');
}

describe('InlineRequiresPlugin', () => {
  it('should inline es modules imports at call site', async () => {
    const fixturePath = path.join(__dirname, 'es-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'entry.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      __webpack_require__.r(__webpack_exports__);
      /* harmony import */ // (inlined) ./src/__tests__/es-import/foo.js
      /* harmony import */ // (inlined) ./src/__tests__/es-import/bar.js
      (() => {
        // Expected inline import:
        const foo = Object((__webpack_require__(\\"./src/__tests__/es-import/foo.js\\"))[/* default */ \\"a\\"])();
        // Expected inline import:
        const bar = new (__webpack_require__(\\"./src/__tests__/es-import/bar.js\\"))[/* Bar */ \\"b\\"]();
        return foo + bar + (__webpack_require__(\\"./src/__tests__/es-import/bar.js\\"))[/* BAZ */ \\"a\\"];
      })();
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should inline es modules imports at call site when hashed', async () => {
    const fixturePath = path.join(__dirname, 'es-import-hashed');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'ZieR')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      __webpack_require__.r(__webpack_exports__);
      /* harmony import */ // (inlined) qJZH
      /* harmony import */ // (inlined) TQxB
      (() => {
        // Expected inline import:
        const foo = Object((__webpack_require__(\\"qJZH\\"))[/* default */ \\"a\\"])();
        // Expected inline import:
        const bar = new (__webpack_require__(\\"TQxB\\"))[/* Bar */ \\"b\\"]();
        return foo + bar + (__webpack_require__(\\"TQxB\\"))[/* BAZ */ \\"a\\"];
      })();
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should leave side effects es modules imports as they are', async () => {
    const fixturePath = path.join(__dirname, 'side-effect-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'entry.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      __webpack_require__.r(__webpack_exports__);
      /* harmony import */ var _foo__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(\\"./src/__tests__/side-effect-import/foo.js\\");
      // Expected kept import
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should inline commonjs modules imports at call site', async () => {
    const fixturePath = path.join(__dirname, 'commonjs-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'entry.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      __webpack_require__.r(__webpack_exports__);
      /* harmony import */ // (inlined) ./src/__tests__/commonjs-import/foo.js
      /* harmony import */ var _foo__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n((__webpack_require__(\\"./src/__tests__/commonjs-import/foo.js\\")));
      (() => {
        // Expected inline import:
        const foo = Object((__webpack_require__(\\"./src/__tests__/commonjs-import/foo.js\\"))[\\"Foo\\"])();
        return foo;
      })();
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should inline dependency imports at call site if side effects false', async () => {
    const fixturePath = path.join(__dirname, 'dependency-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'entry.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      __webpack_require__.r(__webpack_exports__);
      /* harmony import */ // (inlined) ./node_modules/eslint-utils/index.mjs
      (() => {
        // Expected inline import:
        const foo = (__webpack_require__(\\"./node_modules/eslint-utils/index.mjs\\"))[/* ESM */ \\"a\\"];
        return foo;
      })();
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should preserve dependency imports at call site if potential side effects', async () => {
    const fixturePath = path.join(__dirname, 'side-effect-unk-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'foo.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      /* harmony import */ var querystring__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(\\"./node_modules/querystring-es3/index.js\\");
      /* harmony import */ var querystring__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(querystring__WEBPACK_IMPORTED_MODULE_0__);
      function Foo() {
        return Object(querystring__WEBPACK_IMPORTED_MODULE_0__[\\"encode\\"])();
      }
      /* harmony default export */ __webpack_exports__[\\"a\\"] = (Foo);
      "
    `);

    removeBuildDir(fixturePath);
  });

  it('should inline concatenated modules', async () => {
    const fixturePath = path.join(__dirname, 'concatenated-import');

    const content = await webpackCompile(fixturePath);

    expect(getModuleOutput(content, 'entry.js')).toMatchInlineSnapshot(`
      "
      \\"use strict\\";
      // ESM COMPAT FLAG
      __webpack_require__.r(__webpack_exports__);
      // EXTERNAL MODULE: ./src/__tests__/concatenated-import/bar.js
      // (inlined) ./src/__tests__/concatenated-import/bar.js
      // CONCATENATED MODULE: ./src/__tests__/concatenated-import/foo.js
      function Foo() {
        // Expected inline import:
        return (__webpack_require__(\\"./src/__tests__/concatenated-import/bar.js\\"))[\\"BAR\\"];
      }
      /* harmony default export */ var foo__WEBPACK_CONCATENATED_MODULE__ = (Foo);
      // CONCATENATED MODULE: ./src/__tests__/concatenated-import/entry.js
      (() => {
        // plain function call
        const foo = foo__WEBPACK_CONCATENATED_MODULE__();
        return foo;
      })();
      "
    `);

    removeBuildDir(fixturePath);
  });
});
