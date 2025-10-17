import express from "express";
import mysql from "mysql2/promise";
import axios from "axios";
import verifyJwt from './verifyJwt.js';

const app = express();
// simple CORS allow for local dev UI
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
let db;

async function waitForDb(retries = 60, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      db = await mysql.createConnection({
        host: "mysql",
        user: "root",
        password: "root",
        database: "videos_db"
      });
      console.log('Connected to MySQL');
      return;
    } catch (err) {
      console.log(`MySQL not ready (attempt ${i + 1}/${retries}): ${err.code || err.message}. Retrying in ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to MySQL after retries');
}

app.get("/videos", verifyJwt, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM videos");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get("/stream/:filename", async (req, res) => {
  const { filename } = req.params;
  try {
    console.log('Request headers for stream:', req.headers);
    const fs = await import('fs');
    const path = `/videos/${filename}`;
    if (fs.existsSync(path)) {
      const stat = fs.statSync(path);
      const fileSize = stat.size;
      const range = req.headers.range;

      // simple mime type mapping for common video containers
      const ext = path.split('.').pop()?.toLowerCase();
      const mimeMap = {
        'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg', 'ogv': 'video/ogg',
        'mov': 'video/quicktime', 'mkv': 'video/x-matroska', 'mp3': 'audio/mpeg'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

  console.log('Incoming Range header:', range);
  if (range) {
        // parse range in form 'bytes=start-end'
        const m = range.match(/bytes=(\d*)-(\d*)/);
        if (!m) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          return;
        }
        const start = m[1] === '' ? 0 : parseInt(m[1], 10);
        const end = m[2] === '' ? fileSize - 1 : parseInt(m[2], 10);
        if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          return;
        }
        const chunkSize = (end - start) + 1;
  console.log(`Serving range ${start}-${end} of ${fileSize}`);
  res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType
        });
        const stream = fs.createReadStream(path, { start, end });
        stream.pipe(res);
        return;
      }

      // no range, send whole file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      const stream = fs.createReadStream(path);
      stream.pipe(res);
      return;
    }

    // fallback: proxy to file system service
    const response = await axios.get(`http://file_system_service:5003/read/${filename}`, { responseType: "stream" });
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'File system error', details: err.message });
  }
});

async function start() {
  await waitForDb();
  app.listen(4000, () => console.log("Streaming service running on port 4000"));
}

start().catch(err => {
  console.error('Failed to start service:', err);
  process.exit(1);
});
