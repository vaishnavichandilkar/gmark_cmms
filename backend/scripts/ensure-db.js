const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PG_PORT = 5432;
const PG_DATA_DIR = 'C:\\Users\\DELL\\Downloads\\PostgreSQL\\18\\data';
const PG_CTL_PATH = 'D:\\pgsql\\bin\\pg_ctl.exe';
const POSTMASTER_PID_FILE = path.join(PG_DATA_DIR, 'postmaster.pid');

function isPortOpen(port, host = '127.0.0.1', timeout = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, maxWaitMs = 12000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (await isPortOpen(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function cleanStalePid() {
  if (fs.existsSync(POSTMASTER_PID_FILE)) {
    try {
      const content = fs.readFileSync(POSTMASTER_PID_FILE, 'utf8');
      const pid = parseInt(content.split('\n')[0].trim(), 10);
      let isAlive = false;
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 0);
          isAlive = true;
        } catch (e) {
          isAlive = false;
        }
      }
      if (!isAlive) {
        console.log(`[ensure-db] Cleaning stale postmaster.pid (PID ${pid} not running)...`);
        fs.unlinkSync(POSTMASTER_PID_FILE);
      }
    } catch (e) {
      try {
        fs.unlinkSync(POSTMASTER_PID_FILE);
      } catch (_) {}
    }
  }
}

async function main() {
  if (process.platform !== 'win32' || process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.log('[ensure-db] Non-Windows or cloud environment detected. Skipping local postgres starter.');
    process.exit(0);
  }

  // 1. Check if PostgreSQL is already active
  const alreadyRunning = await isPortOpen(PG_PORT);
  if (alreadyRunning) {
    console.log(`[ensure-db] PostgreSQL is already active on port ${PG_PORT}.`);
    process.exit(0);
  }

  console.log(`[ensure-db] PostgreSQL is offline on port ${PG_PORT}. Starting database server...`);

  // 2. Clear stale PID if previous instance crashed
  cleanStalePid();

  // 3. Start PostgreSQL using pg_ctl
  if (!fs.existsSync(PG_CTL_PATH)) {
    console.log(`[ensure-db] PostgreSQL binary not found at ${PG_CTL_PATH}. Skipping local postgres starter.`);
    process.exit(0);
  }

  try {
    const child = spawn(PG_CTL_PATH, ['start', '-D', PG_DATA_DIR], {
      detached: true,
      stdio: 'inherit',
    });
    child.unref();
  } catch (err) {
    console.error('[ensure-db] Failed to spawn pg_ctl:', err.message);
  }

  // 4. Wait for database to accept connections
  const ready = await waitForPort(PG_PORT, 12000);
  if (ready) {
    console.log(`[ensure-db] ✅ PostgreSQL database is ready on port ${PG_PORT}.`);
    process.exit(0);
  } else {
    console.error(`[ensure-db] ❌ PostgreSQL failed to start on port ${PG_PORT} within timeout.`);
    process.exit(1);
  }
}

main();
