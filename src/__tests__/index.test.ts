import path from 'path';
// @ts-expect-error Missing type declarations
import validate from 'sourcemap-validator';

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
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'entry.js')).toMatchSnapshot();
    });

    it('should inline es modules imports at call site when hashed', async () => {
      const fixturePath = path.join(__dirname, 'es-import-hashed');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'ZieR')).toMatchSnapshot();
    });

    it('should leave side effects es modules imports as they are', async () => {
      const fixturePath = path.join(__dirname, 'side-effect-import');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'entry.js')).toMatchSnapshot();
    });

    it('should inline commonjs modules imports at call site', async () => {
      const fixturePath = path.join(__dirname, 'commonjs-import');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'entry.js')).toMatchSnapshot();
    });

    it('should inline dependency imports at call site if side effects false', async () => {
      const fixturePath = path.join(__dirname, 'dependency-import');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'entry.js')).toMatchSnapshot();
    });

    it('should preserve dependency imports at call site if potential side effects', async () => {
      const fixturePath = path.join(__dirname, 'side-effect-unk-import');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'foo.js')).toMatchSnapshot();
    });

    it('should inline concatenated modules', async () => {
      const fixturePath = path.join(__dirname, 'concatenated-import');
      const { source } = await webpackCompile(fixturePath);
      expect(getModuleOutput(source, 'entry.js')).toMatchSnapshot();
    });

    it('should generate valid source maps', async () => {
      const fixturePath = path.join(__dirname, 'source-maps');
      const { source, map = '' } = await webpackCompile(fixturePath);
      expect(JSON.parse(map)).toMatchSnapshot();
      expect(() => validate(source, map)).not.toThrow();
    });
  });
});
