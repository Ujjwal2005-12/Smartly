/**
 * Cross-platform script to run both frontend and backend concurrently.
 * Compatible with Windows PowerShell, cmd, macOS, and Linux.
 */
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('----------------------------------------------------');
console.log(' Starting Smartly: Access Flow Control Management');
console.log(' Frontend: http://localhost:3000');
console.log(' Backend:  http://localhost:5000/api');
console.log('----------------------------------------------------');

const backend = spawn(npmCmd, ['--prefix', 'backend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\nShutting down Smartly services...');
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

