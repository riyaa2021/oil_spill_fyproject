import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import detectionRoutes from './routes/detectionRoutes.js';
import multer from 'multer';
import './db.js';

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5000);
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '1mb' }));
app.get('/', (req, res) => res.json({ message: 'AI SpillGuard backend is running' }));
app.get('/api/health', async (req, res) => {
  try {
    const base = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${base}/health`);
    const python = await response.json();
    res.status(response.ok ? 200 : 503).json({ backend: 'healthy', python });
  } catch {
    res.status(503).json({ backend: 'healthy', python: 'unavailable' });
  }
});
app.use('/api', detectionRoutes);
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(413).json({ error: 'Upload too large. Maximum size is 20 MB.' });
  if (err) return res.status(400).json({ error: err.message || 'Request failed' });
  next();
});
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
