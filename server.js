// Root server.js that spawns the backend server
// This resolves the Render deployment issue where it expects server.js in the root

const { spawn } = require('child_process');
const path = require('path');

// Change to the backend directory and start the actual server
const backendPath = path.join(__dirname, 'backend');
console.log('Starting backend server from:', backendPath);

const serverProcess = spawn('node', ['server.js'], {
  cwd: backendPath,
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('Failed to start backend server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log('Backend server exited with code ' + code);
  process.exit(code);
});

// Keep the main process alive
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});
