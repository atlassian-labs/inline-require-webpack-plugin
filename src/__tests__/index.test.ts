import path from 'path';
import {
  webpackCompile,
  getModuleOutput,
  teardownWebpackVersion,
  setupWebpackVersion,
} from './__utils__';

// Since webpack build can take longer than the default jest wait time
jest.setTimeout(300000);

describe('InlineRequirePlugin', () => {
  describe.each(['4.44.1', '5.24.0'])('with webpack v%s', (version) => {
    beforeAll(async () => {
      await setupWebpackVersion(version);
    });

    afterAll(async () => {
      await teardownWebpackVersion();
    });

    it('should inline es modules imports at call site', async () => {
      const fixturePath = path.join(__dirname, 'es-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'entry.js')).toMatchSnapshot();
    });

    it('should inline es modules imports at call site when hashed', async () => {
      const fixturePath = path.join(__dirname, 'es-import-hashed');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'ZieR')).toMatchSnapshot();
    });

    it('should leave side effects es modules imports as they are', async () => {
      const fixturePath = path.join(__dirname, 'side-effect-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'entry.js')).toMatchSnapshot();
    });

    it('should inline commonjs modules imports at call site', async () => {
      const fixturePath = path.join(__dirname, 'commonjs-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'entry.js')).toMatchSnapshot();
    });

    it('should inline dependency imports at call site if side effects false', async () => {
      const fixturePath = path.join(__dirname, 'dependency-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'entry.js')).toMatchSnapshot();
    });

    it('should preserve dependency imports at call site if potential side effects', async () => {
      const fixturePath = path.join(__dirname, 'side-effect-unk-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'foo.js')).toMatchSnapshot();
    });

    it('should inline concatenated modules', async () => {
      const fixturePath = path.join(__dirname, 'concatenated-import');
      const content = await webpackCompile(fixturePath);
      expect(getModuleOutput(content, 'entry.js')).toMatchSnapshot();
    });
  });
});
