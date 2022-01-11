import fs, { readFile } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { spawn } from 'child_process';
import { promisify } from 'util';

export function getModuleOutput(content: string, name: string) {
  return content
    .split(`${name}":\n`)[1]
    .split('/***/ })')[0]
    .replace(/\/\*\*\*\/.+/g, '')
    .replace(/\n{2,}/g, '\n');
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const executedCommand = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    executedCommand.on('error', (error) => {
      reject(error);
    });

    executedCommand.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(code === 1 ? 'Compilation failed' : 'Configuration or internal error'));
      }
    });
  });
}

async function removeBuildDir(fixturePath: string) {
  const buildDir = path.join(fixturePath, 'build');
  if (fs.existsSync(buildDir)) {
    await promisify(rimraf)(buildDir);
  }
}

export async function teardownWebpackVersion() {
  await runCommand('rm', ['-rf', './node_modules/webpack']);
}

export async function setupWebpackVersion(version: string) {
  // ensure we are clean
  await teardownWebpackVersion();

  // make specific webpack version the default
  await runCommand('cp', [
    '-r',
    `./node_modules/webpack-v${version.split('.')[0]} ./node_modules/webpack`,
  ]);

  // apply specific webpack version patch
  await runCommand('git', ['apply', '--ignore-whitespace', `patches/webpack+${version}.patch`]);
}

export async function webpackCompile(fixturePath: string) {
  await runCommand('node', [
    './node_modules/webpack/bin/webpack.js',
    `--config="${fixturePath}/webpack.config.js"`,
    '--no-stats',
  ]);

  // read the main bundle
  const source = await promisify(readFile)(`${fixturePath}/build/main.js`, 'utf8');
  let map;
  try {
    map = await promisify(readFile)(`${fixturePath}/build/main.js.map`, 'utf8');
  } catch (e) {
    // ignore
  }

  // after reading, delete the build folder
  await removeBuildDir(fixturePath);
  return { source, map };
}
