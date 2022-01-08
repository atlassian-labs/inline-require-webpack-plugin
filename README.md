# Webpack Inline Require Plugin

Plugin for webpack...

## Usage

Import it from the package

```js
const { InlineRequireWebpackPlugin } = require('inline-require-webpack-plugin');
```

And add it to your webpack config:

```js
plugins: [new InlineRequireWebpackPlugin()];
```

## Support for ConcatenatedModule plugin

If your configuration has `optimization.concatenateModules` enabled, then you need to use `patch-package` to patch webpack ConcatenatedModulePlugin in order to let us safely replace variables that map to imported modules.

You can find Webpack patches in `/patches`, just grab the version relevant to your Webpack version.

## Development

TBD

## Contributions

Contributions to Webpack Deduplication Plugin are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Thanks

Big shotout to @shuhei for his [inline-requires-webpack-plugin](https://github.com/shuhei/inline-requires-webpack-plugin), which provided the initial rought implementation

## License

Copyright (c) 2022 Atlassian and others.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

<br/>

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks.png)](https://www.atlassian.com)
