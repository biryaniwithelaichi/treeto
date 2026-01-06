const { spawn } = require('child_process');
const waitOn = require('wait-on');

async function startDev() {
  console.log('Starting Vite dev server...');

  const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
  });

  console.log('Waiting for Vite server...');

  await waitOn({
    resources: ['http://localhost:3000'],
    timeout: 30000
  });

  console.log('Starting Electron...');

  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_DEV: 'true' }
  });

  electron.on('close', () => {
    vite.kill();
    process.exit(0);
  });
}

startDev().catch(err => {
  console.error(err);
  process.exit(1);
});