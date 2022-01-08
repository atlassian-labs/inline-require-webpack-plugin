import fs, { readFile } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { exec } from 'child_process';
import { promisify } from 'util';

export async function webpackCompile(fixturePath: string) {
  const { stdout, stderr } = await promisify(exec)(
    `npm run test:webpack-util -- --config="${fixturePath}/webpack.config.js"`
  );
  if (stderr) throw stderr;
  const output = await promisify(readFile)(`${fixturePath}/build/main.js`, 'utf8');
  return output;
}

export function removeBuildDir(fixturePath: string) {
  const buildDir = path.join(fixturePath, 'build');
  if (fs.existsSync(buildDir)) {
    rimraf.sync(buildDir);
  }
}
