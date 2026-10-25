
import { Router } from 'express';
import multer from 'multer';

import {
  detectImage,
  getHistory,
  getAnalytics,
  clearHistory,
  generateReport,
  downloadReport,
} from '../controllers/detectionController.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG images are supported.'));
    }
  },
});

router.post('/detect', upload.single('file'), detectImage);

router.get('/history', getHistory);

router.get('/analytics', getAnalytics);

router.post('/report', generateReport);

router.get('/report/:filename', downloadReport);

router.delete('/history', clearHistory);

export default router;
