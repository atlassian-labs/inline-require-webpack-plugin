require('@babel/register')({ extensions: ['.ts', '.js'] });

const path = require('path');

const rel = (paths) => path.resolve(__dirname, ...paths);

module.exports = (fixturePath) => ({
  mode: 'production',
  entry: rel([fixturePath, 'entry.js']),
  externals: {},
  output: {
    path: rel([fixturePath, 'build']),
    futureEmitAssets: false,
  },
  optimization: {
    moduleIds: 'named',
  },
});
