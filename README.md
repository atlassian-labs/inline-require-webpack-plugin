<h1 align="center">inline-require-webpack-plugin</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/inline-require-webpack-plugin"><img src="https://img.shields.io/npm/v/inline-require-webpack-plugin.svg"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
</p>

This plugin enables an advanced runtime performance optimisation where evaluation cost of a module dependencies is shifted from the module initialisation phase to where each dependency is consumed.

This technique has been successfully leveraged by other bundlers ([eg FB Metro](https://reactnative.dev/docs/ram-bundles-inline-requires)) and proved to be quite effective on large applications, especially on 2-4 CPUs clients (with TTI improvements up to 400ms on P90).

It is an alternative to feeding Webpack with CommonJS modules and introducing a Babel plugin like `@babel/plugin-transform-modules-commonjs`.
The main advantage is that Webpack is not aware of this optimisation while processing the source code, so all ESM benefits (eg treeshaking) and other plugins optimisations are not affected.

## Usage

After installing it from the package

```
npm i -D inline-require-webpack-plugin
```

Import the plugin and add it to Webpack config `plugins` array

```js
const { InlineRequireWebpackPlugin } = require('inline-require-webpack-plugin');
// ...
module.exports = {
  // ... webpack config
  plugins: [
    // ... all other plugins
    new InlineRequireWebpackPlugin()
  ];
}
```

### Support for ConcatenatedModule plugin

If your configuration has `optimization.concatenateModules` enabled (defaults to `true` on prod builds), then you need to use `patch-package` to patch Webpack `ConcatenatedModulePlugin` in order to safely replace variables that map to imported modules.

You can find Webpack patches in `/patches`, grabbing the version relevant to your Webpack version (v4 or v5).

## Documentation

### From ESM top level requires to CommonJS-like inline requires

When Inline Require Plugin gets added to the Webpack config, it transforms such output before it get passed to the minification phase, manipulating it so that such top level requires are moved to their usage location.
As an example, this how Webpack outputs ES modules normally:

```js
var React = __webpack_require__('react')['default'];
var DragDropContext = __webpack_require__('react-beautiful-dnd')['DragDropContext'];
var MyComponent = __webpack_require__('./my-component')['default'];
var useOnDragEnd = __webpack_require__('./my-hooks')['onDragEnd'];

const MyApp = () => {
  const onDragEnd = useOnDragEnd();
  return React.createElement(DragDropContext, { onDragEnd }, React.createElement(MyComponent));
};
__webpack_exports__['MyApp'] = MyApp;
```

After adding `InlineRequireWebpackPlugin` the output will be:

```js
var React = __webpack_require__('react')['default'];
// import 'react-beautiful-dnd'
// import './my-component'
// import './my-hooks'

const MyApp = () => {
  const onDragEnd = __webpack_require__('./my-hooks')['onDragEnd']();
  return React.createElement(
    __webpack_require__('react-beautiful-dnd')['DragDropContext'],
    { onDragEnd },
    React.createElement(__webpack_require__('./my-component')['default'])
  );
};
__webpack_exports__['MyApp'] = MyApp;
```

### Quirks of inline requires

Such optimisation is not without risks. Indeed, if applied to everything, it does break ESM side effects. Given the output will evaluate imports only when needed, if some module requires a side effect to be triggered, then it might run too late and cause errors. Because of this risk, the plugin only optimises 3rd party dependencies that have explicit `sideEffect: false` in their `package.json`, but still aggressively applies it for all project files (as leveraging side effects is a bad pattern that should be avoided anyway).

## Development and testing

The test suite is powered by Jest and will run for both Webpack v4 and v5 thanks to npm aliases, and is accessible via

```
npm run test
```

## Contributions

Contributions to Webpack Deduplication Plugin are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Thanks

Big shotout to @shuhei for his [inline-requires-webpack-plugin](https://github.com/shuhei/inline-requires-webpack-plugin), which demostrated a similar plugin was somewhat possible.

## License

Copyright (c) 2022 Atlassian and others.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

<br/>

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks.png)](https://www.atlassian.com)
