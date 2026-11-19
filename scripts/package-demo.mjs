import { spawnSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const frontend = join(project, 'frontend');
const angularOutput = join(frontend, 'dist', 'package-build');
const windows = process.platform === 'win32';

function run(command, args, cwd = project) {
  const options = { cwd, stdio: 'inherit' };
  // npm and mvn are batch entry points on Windows. Their arguments below are fixed.
  const result = windows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], options)
    : spawnSync(command, args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], frontend);
run('npm', ['run', 'build', '--', '--base-href', '/gestion-catalogo/', '--output-path', 'dist/package-build'], frontend);
const browser = join(angularOutput, 'browser');
if (!existsSync(join(browser, 'index.html'))) {
  throw new Error('La compilación de Angular no generó browser/index.html.');
}

run('mvn', ['-B', 'clean']);
cpSync(browser, join(project, 'target', 'classes', 'static', 'gestion-catalogo'), { recursive: true });
run('mvn', ['-B', 'package']);
