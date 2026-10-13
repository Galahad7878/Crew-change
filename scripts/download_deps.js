const https = require('https');
const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '..', 'public', 'js');
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

const filePath = path.join(jsDir, 'xlsx.full.min.js');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(fs.statSync(filePath).size));
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    const bytes = await fetchUrl('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    console.log('SUCCESS: Downloaded xlsx.full.min.js with size:', bytes, 'bytes');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
