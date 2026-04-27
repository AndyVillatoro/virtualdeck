// Unsets ELECTRON_RUN_AS_NODE so Electron starts as a full GUI app, not a Node.js CLI.
// That variable may be set system-wide on some machines (e.g. by build tooling).
const path = require('path');
const { spawn } = require('child_process');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const root = path.join(__dirname, '..');
const cli = path.join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');

const proc = spawn(process.execPath, [cli, 'dev'], { env, stdio: 'inherit', cwd: root });
proc.on('close', (code) => process.exit(code ?? 0));
