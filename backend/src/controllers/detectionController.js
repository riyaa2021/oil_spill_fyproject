import { run, all } from '../db.js';
import { requestPrediction } from '../services/pythonApi.js';

export async function detectImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image using the field name "file".' });
  try {
    const result = await requestPrediction(req.file);
    const saved = await run(
      `INSERT INTO detections (filename, result, risk_level, spill_percentage) VALUES (?, ?, ?, ?)`,
      [result.filename, result.risk_message, result.risk_level, result.spill_percentage]
    );
    return res.status(200).json({ ...result, detection_id: saved.id });
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = err.response?.data?.detail || err.message || 'Could not reach Python AI service';
    console.error('Detection route error:', detail);
    return res.status(status).json({ error: detail });
  }
}

export async function getHistory(req, res) {
  try {
    const rows = await all('SELECT * FROM detections ORDER BY id DESC LIMIT 500');
    res.json({ success: true, history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load detection history' });
  }
}

export async function getAnalytics(req, res) {
  try {
    const totals = await all(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN spill_percentage >= 1 THEN 1 ELSE 0 END) AS spill_detections,
      SUM(CASE WHEN spill_percentage < 1 THEN 1 ELSE 0 END) AS clean_detections,
      COALESCE(AVG(spill_percentage), 0) AS average_spill_percentage
      FROM detections`);
    const risks = await all('SELECT risk_level, COUNT(*) AS count FROM detections GROUP BY risk_level');
    res.json({ success: true, summary: totals[0], risks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not calculate analytics' });
  }
}

export async function clearHistory(req, res) {
  try {
    await run('DELETE FROM detections');
    res.json({ success: true, message: 'Detection history cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not clear history' });
  }
}
