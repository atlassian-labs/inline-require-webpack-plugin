const baseConfig = require('../__utils__/webpack.config')(__dirname);

const { InlineRequireWebpackPlugin } = require('../..');

module.exports = {
  ...baseConfig,
  devtool: false,
  optimization: {
    ...baseConfig.optimization,
    concatenateModules: false,
    minimize: false,
  },
  plugins: [new InlineRequireWebpackPlugin()],
};
