import express from "express";
import multer from "multer";
import axios from "axios";
import mysql from "mysql2/promise";
import verifyJwt from './verifyJwt.js';

const app = express();
app.use(express.json());

const upload = multer({ dest: "/videos/" });
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

app.post("/upload", verifyJwt, upload.single("video"), async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not ready' });
    }
    // username can come from token or body
    const username = req.user && req.user.sub ? req.user.sub : req.body.username;
    // multer stores the uploaded file in /videos/<generatedFilename>
    const storedFilename = req.file.filename; // generated name (no path)

    // record only the stored filename in the DB so other services can resolve it
    await db.execute("INSERT INTO videos (username, filename, path) VALUES (?, ?, ?)", [
      username, req.file.originalname, storedFilename
    ]);

    res.send("Video uploaded successfully!");
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// Serve static UI
import path from 'path';
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page explicitly (static middleware doesn't map '/admin' to admin.html)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// start HTTP server immediately so static routes load even if DB isn't ready
app.listen(3000, () => console.log("Upload service running on port 3000"));

// wait for DB connection in background
waitForDb().catch(err => {
  console.error('Failed to connect to DB:', err);
});

