import { spawn } from 'node:child_process';

const serverProc = spawn('node', ['server/index.mjs'], {
  stdio: 'inherit',
  shell: true,
});

const clientProc = spawn('npx', ['vite', '--port', '5173'], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
});
