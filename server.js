import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  // Add CORS headers to support local WebGL loading
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL and find the file path
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // Local mirror of the Vercel serverless function (api/chat.js) so the
  // chatbot also works in local dev. Requires GROQ_API_KEY in the env:
  //   GROQ_API_KEY=gsk_... node server.js
  if (parsedUrl.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 64_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const mod = await import('./api/chat.js');
        const fakeReq = { method: 'POST', body: JSON.parse(body || '{}') };
        const fakeRes = {
          _status: 200,
          setHeader: () => fakeRes,
          status(code) { this._status = code; return this; },
          json(obj) {
            res.writeHead(this._status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(obj));
          }
        };
        await mod.default(fakeReq, fakeRes);
      } catch (e) {
        console.error('chat api error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Chat request failed' }));
      }
    });
    return;
  }

  if (parsedUrl.pathname === '/api/run-pogo-doggo') {
    const exePath = 'X:\\PogoDogo Build\\Pogo Doggo.exe';
    execFile(exePath, (err) => {
      if (err) {
        console.error("Error executing Pogo Doggo:", err);
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  let filePath = path.join(__dirname, decodedPath === '/' ? 'index.html' : decodedPath);

  // Security check to prevent directory traversal
  const relative = path.relative(__dirname, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  if (filePath !== __dirname && !isSafe) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const serveFile = (targetPath, useGzip) => {
    const baseName = targetPath.endsWith('.gz') ? targetPath.slice(0, -3) : targetPath;
    const ext = path.extname(baseName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    };
    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    fs.createReadStream(targetPath).pipe(res);
  };

  const acceptEncoding = req.headers['accept-encoding'] || '';
  const canGzip = acceptEncoding.includes('gzip');
  const gzFilePath = filePath + '.gz';

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      // Uncompressed file exists
      if (canGzip && fs.existsSync(gzFilePath)) {
        serveFile(gzFilePath, true);
      } else {
        serveFile(filePath, false);
      }
    } else if (!err && stats.isDirectory()) {
      // Directory -> try index.html
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (!indexErr && indexStats.isFile()) {
          serveFile(indexPath, false);
        } else {
          res.statusCode = 404;
          res.end('Not Found');
        }
      });
    } else {
      // Uncompressed file does not exist, check if .gz file exists
      if (canGzip && fs.existsSync(gzFilePath)) {
        serveFile(gzFilePath, true);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    }
  });
});

let currentPort = PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Port ${currentPort} is already in use, trying port ${currentPort + 1}...`);
    currentPort++;
    server.listen(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

server.on('listening', () => {
  const port = server.address().port;
  console.log(`\n🚀 Server is running locally!`);
  console.log(`👉 Main Portfolio: http://localhost:${port}/`);
  console.log(`👉 Car Parking Game: http://localhost:${port}/Car_Parking/`);
  console.log(`👉 Fish VS Fisherman Game: http://localhost:${port}/PATP/\n`);
  console.log('Press Ctrl+C to stop the server.');
});

server.listen(currentPort);
