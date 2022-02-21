const baseConfig = require('../__utils__/webpack.config')(__dirname);

const { InlineRequireWebpackPlugin } = require('../../../build');

module.exports = {
  ...baseConfig,
  devtool: false,
  optimization: {
    ...baseConfig.optimization,
    concatenateModules: false,
    moduleIds: 'hashed',
    minimize: false,
  },
  plugins: [new InlineRequireWebpackPlugin()],
};
