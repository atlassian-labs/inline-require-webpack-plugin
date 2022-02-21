const baseConfig = require('../__utils__/webpack.config')(__dirname);

const { InlineRequireWebpackPlugin } = require('../../../build');

module.exports = {
  ...baseConfig,
  devtool: 'source-map',
  optimization: {
    ...baseConfig.optimization,
    concatenateModules: true,
    moduleIds: 'hashed',
    sideEffects: true,
    usedExports: true,
    minimize: true,
  },
  plugins: [
    new InlineRequireWebpackPlugin(),
    // Profile
    // new (require('webpack').debug.ProfilingPlugin)(),
  ],
};
