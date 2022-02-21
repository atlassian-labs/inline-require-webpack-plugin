const baseConfig = require('../__utils__/webpack.config')(__dirname);

const { InlineRequireWebpackPlugin } = require('../../../build');

module.exports = {
  ...baseConfig,
  devtool: false,
  optimization: {
    ...baseConfig.optimization,
    concatenateModules: true,
    sideEffects: true,
    usedExports: true,
    minimize: false,
  },
  plugins: [new InlineRequireWebpackPlugin()],
};
