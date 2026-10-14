const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const HOST = '0.0.0.0';
const QWEN_PORT = 3001;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const AGENTS_DIR = path.join(__dirname, 'agents');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function getDirectoryTree(dirPath, relativeTo = ROOT_DIR) {
  const stats = fs.statSync(dirPath);
  const name = path.basename(dirPath);
  const relPath = path.relative(relativeTo, dirPath).replace(/\\/g, '/');

  if (stats.isDirectory()) {
    const children = fs.readdirSync(dirPath)
      .filter(item => !item.startsWith('.') && item !== 'node_modules' && item !== 'public' && item !== 'scripts' && item !== 'models')
      .map(child => getDirectoryTree(path.join(dirPath, child), relativeTo));
    return { name, type: 'directory', path: relPath, children };
  } else {
    return { name, type: 'file', path: relPath, ext: path.extname(name).toLowerCase() };
  }
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];

  // API Endpoint: Health check for Qwen2.5 3B local LLM
  if (reqUrl === '/api/qwen-status') {
    const qwenReq = http.request({
      hostname: '127.0.0.1',
      port: QWEN_PORT,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (qwenRes) => {
      let data = '';
      qwenRes.on('data', chunk => { data += chunk; });
      qwenRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    qwenReq.on('error', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'offline', message: 'Qwen2.5 local service is not running' }));
    });

    qwenReq.on('timeout', () => {
      qwenReq.destroy();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'timeout' }));
    });

    return qwenReq.end();
  }

  // API Endpoint: Proxy parse request to local Qwen2.5 3B Instruct
  if (reqUrl === '/api/parse-text' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const qwenReq = http.request({
        hostname: '127.0.0.1',
        port: QWEN_PORT,
        path: '/parse',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 90000
      }, (qwenRes) => {
        let qwenData = '';
        qwenRes.on('data', chunk => { qwenData += chunk; });
        qwenRes.on('end', () => {
          res.writeHead(qwenRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(qwenData);
        });
      });

      qwenReq.on('error', (err) => {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Qwen2.5 3B local service unreachable: ' + err.message
        }));
      });

      qwenReq.on('timeout', () => {
        qwenReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Qwen2.5 3B inference timeout (>90s)'
        }));
      });

      qwenReq.write(body);
      qwenReq.end();
    });
    return;
  }

  // API Endpoint: Get Project Directory Tree
  if (reqUrl === '/api/tree') {
    const tree = [
      getDirectoryTree(AGENTS_DIR),
      getDirectoryTree(DATA_DIR)
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(tree));
  }

  // API Endpoint: Get File Content (SKILLS.md, CSV, JS)
  if (reqUrl === '/api/file-content') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const relPath = urlObj.searchParams.get('path');
    if (!relPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing path parameter' }));
    }

    const fullPath = path.normalize(path.join(ROOT_DIR, relPath));
    if (!fullPath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access denied' }));
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ path: relPath, content }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }
  }

  // API Endpoint: Save File Content (SKILLS.md, CSV)
  if (reqUrl === '/api/file-save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const relPath = data.path;
        const newContent = data.content;

        if (!relPath) throw new Error('Missing path');
        const fullPath = path.normalize(path.join(ROOT_DIR, relPath));
        if (!fullPath.startsWith(ROOT_DIR)) throw new Error('Access denied');

        fs.writeFileSync(fullPath, newContent, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'File saved successfully' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // File Route Selection (Static files from /agents/, /data/, or /public/)
  let filePath;
  if (reqUrl.startsWith('/agents/') || reqUrl.startsWith('/data/')) {
    filePath = path.join(__dirname, reqUrl);
  } else {
    filePath = path.join(PUBLIC_DIR, reqUrl === '/' ? 'index.html' : reqUrl);
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  console.log(`=======================================================`);
  console.log(`🚢 MOTOR MULTI-AGENTE DE COTIZACIONES (RED LOCAL ACTIVA)`);
  console.log(`=======================================================`);
  console.log(` 💻 Acceso Local (desde este PC):`);
  console.log(`    👉 http://localhost:${PORT}`);
  console.log(`\n 🌐 Acceso en Red Local (para los otros ordenadores):`);
  if (localIps.length > 0) {
    localIps.forEach(ip => {
      console.log(`    👉 http://${ip.address}:${PORT}  (${ip.name})`);
    });
  } else {
    console.log(`    👉 http://192.168.4.30:${PORT}`);
  }
  console.log(`\n 🤖 Modelo Local Qwen2.5 3B Instruct: http://127.0.0.1:${QWEN_PORT}`);
  console.log(` 📂 Carpeta de Agentes: ${AGENTS_DIR}`);
  console.log(` 📊 Carpeta de Datos CSV: ${DATA_DIR}`);
  console.log(`=======================================================\n`);
});
