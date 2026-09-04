import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { migrate } from './db';
import { config } from './config';
import { adminAuthRouter } from './routes/adminAuth';
import { adminStudentsRouter } from './routes/students';
import { importRouter } from './routes/import';
import { settingsRouter, publicConfigRouter } from './routes/settings';
import { studentAuthRouter } from './routes/studentAuth';
import { adminUsersRouter } from './routes/admins';
import { adminElectionsRouter, publicElectionsRouter } from './routes/elections';
import { votingRouter } from './routes/voting';
import { publicContentRouter, adminContentRouter, uploadsDir } from './routes/content';
import { seedContentDefaults } from './seedContent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

migrate();
seedContentDefaults();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// Simple request logger (dev friendly).
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/admins', adminUsersRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/admin', adminStudentsRouter);
app.use('/api/import', importRouter);
app.use('/api/public/config', publicConfigRouter);
app.use('/api/public/content', publicContentRouter);
app.use('/api/elections', publicElectionsRouter);
app.use('/api/admin/elections', adminElectionsRouter);
app.use('/api/admin/content', adminContentRouter);
app.use('/api/voting', votingRouter);
app.use('/api/student/auth', studentAuthRouter);

// Uploaded media (gallery images) — public by design.
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'osu-futminna-api' }));

// ---------------------------------------------------------------------------
// Serve the built client (production). During development Vite serves the
// frontend and proxies /api to this server.
// ---------------------------------------------------------------------------
const distDir = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(`OSU API listening on http://0.0.0.0:${config.port}`);
});
