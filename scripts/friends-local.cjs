const { spawn, spawnSync } = require('node:child_process');
const { createServer } = require('../server/index.cjs');
const share = process.argv.includes('--share');
const path = require('node:path'), fs = require('node:fs');
const localTool = path.join(__dirname, '../tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const cloudflared = process.env.CLOUDFLARED_PATH || (fs.existsSync(localTool) ? localTool : 'cloudflared');
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be a number from 1 to 65535.'); process.exit(1);
}
if (share) {
  const check = spawnSync(cloudflared, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  if (check.error || check.status !== 0) {
    console.error('Install the free cloudflared tool first. See docs/ZERO_BUDGET.md.');
    process.exit(1);
  }
}
const server = createServer();
let tunnel, stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (tunnel && !tunnel.killed) tunnel.kill();
  server.close(() => process.exit(code));
  server.closeAllConnections();
  setTimeout(() => process.exit(code), 2000).unref();
}
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port is busy. Close the other server or set PORT to another number.' : error.message);
  stop(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log('Local friend server ready: http://127.0.0.1:' + port + '/health');
  console.log('Rooms stay in server/data.json (or CHALLENGE_DATA). No paid hosting or database is used.');
  if (!share) {
    console.log('For phone testing over HTTPS: stop this command with Ctrl+C, then run npm run friends:share.');
    return;
  }
  console.log('Starting a temporary HTTPS tunnel. Share its trycloudflare.com URL only with your test friends.');
  console.log('Use that address in Friends + Daily Missions on every phone. Keep this PC, internet and terminal running.');
  tunnel = spawn(cloudflared, ['tunnel', '--url', 'http://127.0.0.1:' + port], { stdio: 'inherit', windowsHide: true });
  tunnel.on('error', error => { console.error(error.message); stop(1); });
  tunnel.on('exit', code => { if (!stopping) { console.log('Tunnel stopped; the shared URL is offline.'); stop(code || 0); } });
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
