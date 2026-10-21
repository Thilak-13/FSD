import path from 'path';
import fs from 'fs';
import net from 'net';
import { spawn, execSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

// ANSI Terminal Colors
const cyan = '\x1b[36m';
const magenta = '\x1b[35m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

function formatOutput(prefix, color, data) {
  const text = data.toString();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${bold}[${prefix}]${reset} ${line}`);
    }
  }
}

let backendProcess = null;
let frontendProcess = null;
let mongodProcess = null;
let isShuttingDown = false;

function terminate(proc) {
  if (!proc || proc.killed || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // Process already terminated
  }
}

function handleShutdown(signalOrCode = 'SIGINT') {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${yellow}${bold}[runner] Received ${signalOrCode}. Shutting down services cleanly...${reset}`);

  terminate(backendProcess);
  terminate(frontendProcess);
  terminate(mongodProcess);

  setTimeout(() => {
    console.log(`${green}[runner] All services stopped.${reset}`);
    process.exit(typeof signalOrCode === 'number' ? signalOrCode : 0);
  }, 500);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

console.log(`${green}${bold}====================================================${reset}`);
console.log(`${green}${bold}   PayVerify Orchestrator - Full-Stack App Runner   ${reset}`);
console.log(`${green}${bold}   Backend:  http://localhost:5000/api              ${reset}`);
console.log(`${green}${bold}   Frontend: http://localhost:5173                  ${reset}`);
console.log(`${green}${bold}====================================================${reset}\n`);

// Optional persistent mode: start local mongod on port 27017 with persistent dbpath
if (process.env.PERSIST_DB === 'true') {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { MongoBinary } = require(path.resolve(backendDir, 'node_modules/mongodb-memory-server-core'));
  const dbPath = path.resolve(backendDir, 'data/db');
  fs.mkdirSync(dbPath, { recursive: true });
  const bin = await MongoBinary.getPath({});
  mongodProcess = spawn(bin, ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    const ready = await new Promise((res) => {
      const sock = net.createConnection(27017, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); res(true); });
      sock.once('error', () => { sock.destroy(); res(false); });
    });
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
}

// 1. Start Backend on port 5000
const isDev = (process.env.NODE_ENV || 'development') === 'development';
backendProcess = spawn(process.execPath, ['src/server.js'], {
  cwd: backendDir,
  env: {
    ...process.env,
    PORT: process.env.PORT || '5000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    USE_MEMORY_DB: isDev ? (process.env.USE_MEMORY_DB || 'true') : 'false',
    ...(process.env.PERSIST_DB === 'true' ? { MONGODB_URI: 'mongodb://127.0.0.1:27017/payverify' } : {}),
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});

backendProcess.stdout.on('data', (d) => formatOutput('backend', cyan, d));
backendProcess.stderr.on('data', (d) => formatOutput('backend', red, d));

backendProcess.on('exit', (code, signal) => {
  if (!isShuttingDown) {
    console.error(`${red}${bold}[backend] Process exited prematurely with code ${code} (${signal})${reset}`);
    handleShutdown(code || 1);
  }
});

// 2. Start Frontend (Vite) on port 5173
const vitePath = path.resolve(rootDir, 'node_modules/vite/bin/vite.js');
if (fs.existsSync(vitePath)) {
  frontendProcess = spawn(process.execPath, [vitePath], {
    cwd: rootDir,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} else {
  const isWin = process.platform === 'win32';
  frontendProcess = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: rootDir,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: isWin,
  });
}

frontendProcess.stdout.on('data', (d) => formatOutput('frontend', magenta, d));
frontendProcess.stderr.on('data', (d) => formatOutput('frontend', red, d));

frontendProcess.on('exit', (code, signal) => {
  if (!isShuttingDown) {
    console.error(`${red}${bold}[frontend] Process exited prematurely with code ${code} (${signal})${reset}`);
    handleShutdown(code || 1);
  }
});
