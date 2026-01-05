import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 3001;
let viteProcess = null;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/sync') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { files } = JSON.parse(body);

        // Write all files
        for (const [filePath, content] of Object.entries(files)) {
          const fullPath = path.join('/app', filePath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content);
        }

        // Install dependencies if package.json changed
        if (files['package.json']) {
          console.log('Installing dependencies...');
          await new Promise((resolve, reject) => {
            const npm = spawn('npm', ['install'], { cwd: '/app', stdio: 'inherit' });
            npm.on('close', code => code === 0 ? resolve() : reject(new Error('npm install failed')));
          });
        }

        // Start/restart Vite
        if (viteProcess) {
          console.log('Restarting Vite...');
          viteProcess.kill();
        }

        console.log('Starting Vite dev server...');
        viteProcess = spawn('npm', ['run', 'dev'], {
          cwd: '/app',
          stdio: 'inherit',
          env: { ...process.env, FORCE_COLOR: '1' }
        });

        viteProcess.on('error', (err) => {
          console.error('Vite process error:', err);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, fileCount: Object.keys(files).length }));
      } catch (error) {
        console.error('Sync error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', viteRunning: viteProcess !== null }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sync server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  if (viteProcess) viteProcess.kill();
  server.close(() => process.exit(0));
});
