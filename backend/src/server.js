import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { initDb } from './db.js';
import transcriptionRoutes from './routes/transcriptions.js';
import { attachLiveTranscription } from './ws/liveTranscribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/transcriptions', transcriptionRoutes);

// Serve the built React app (production / Docker)
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, '../public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get(/^\/(?!api|ws).*/, (_req, res) =>
    res.sendFile(path.join(staticDir, 'index.html'))
  );
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on the server.' : err.message,
  });
});

const server = http.createServer(app);
attachLiveTranscription(server);

initDb()
  .then(() => {
    server.listen(config.port, () =>
      console.log(`Server running on http://localhost:${config.port}`)
    );
  })
  .catch((err) => {
    console.error('Database initialisation failed:', err.message);
    process.exit(1);
  });
