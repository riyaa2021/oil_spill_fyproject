
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';

import { run, all } from '../db.js';
import { requestPrediction } from '../services/pythonApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportsDirectory = path.resolve(__dirname, '../../reports');

// =====================================================
// 1. DETECT IMAGE
// =====================================================

export async function detectImage(req, res) {
  if (!req.file || !req.file.buffer?.length) {
    return res.status(400).json({
      error: 'Please upload a non-empty image using the field name "file".',
    });
  }

  try {
    const result = await requestPrediction(req.file);

    const saved = await run(
      `INSERT INTO detection
        (image_name, severity, coverage, confidence)
       VALUES (?, ?, ?, ?)`,
      [
        result.filename || req.file.originalname,
        result.risk_level,
        result.spill_percentage,
        result.confidence ?? null,
      ]
    );

    return res.status(200).json({
      ...result,
      detection_id: saved.lastID,
    });
  } catch (err) {
    const status = err.response?.status || 502;

    const detail =
      err.response?.data?.detail ||
      err.message ||
      'Could not reach Python AI service';

    console.error('Detection route error:', detail);

    return res.status(status).json({
      error: detail,
    });
  }
}

// =====================================================
// 2. GET DETECTION HISTORY
// =====================================================

export async function getHistory(req, res) {
  try {
    const rows = await all(`
      SELECT
        id,
        image_name AS filename,
        timestamp AS created_at,
        severity AS risk_level,
        coverage AS spill_percentage,
        confidence
      FROM detection
      ORDER BY id DESC
      LIMIT 500
    `);

    return res.json({
      success: true,
      history: rows,
    });
  } catch (err) {
    console.error('History error:', err.message);

    return res.status(500).json({
      error: 'Could not retrieve detection history.',
    });
  }
}

// =====================================================
// 3. GET ANALYTICS
// =====================================================

export async function getAnalytics(req, res) {
  try {
    const totals = await all(`
      SELECT
        COUNT(*) AS total,
        COALESCE(
          SUM(CASE WHEN coverage >= 1 THEN 1 ELSE 0 END),
          0
        ) AS spill_detections,
        COALESCE(
          SUM(CASE WHEN coverage < 1 THEN 1 ELSE 0 END),
          0
        ) AS clean_detections,
        COALESCE(AVG(coverage), 0) AS average_spill_percentage
      FROM detection
    `);

    const risks = await all(`
      SELECT
        severity AS risk_level,
        COUNT(*) AS count
      FROM detection
      GROUP BY severity
    `);

    const daily = await all(`
      SELECT
        DATE(timestamp) AS date,
        COUNT(*) AS detections
      FROM detection
      GROUP BY DATE(timestamp)
      ORDER BY date
    `);

    const monthly = await all(`
      SELECT
        STRFTIME('%Y-%m', timestamp) AS month,
        COUNT(*) AS detections
      FROM detection
      GROUP BY STRFTIME('%Y-%m', timestamp)
      ORDER BY month
    `);

    return res.json({
      success: true,
      summary: totals[0],
      risks,
      daily,
      monthly,
    });
  } catch (err) {
    console.error('Analytics error:', err.message);

    return res.status(500).json({
      error: 'Could not retrieve analytics.',
    });
  }
}

// =====================================================
// 4. CLEAR DETECTION HISTORY
// =====================================================

export async function clearHistory(req, res) {
  try {
    await run('DELETE FROM detection');

    return res.json({
      success: true,
      message: 'Detection history cleared.',
    });
  } catch (err) {
    console.error('Clear history error:', err.message);

    return res.status(500).json({
      error: 'Could not clear detection history.',
    });
  }
}

// =====================================================
// 5. GENERATE PDF REPORT
// =====================================================

export async function generateReport(req, res) {
  const detectionId = Number(req.body?.detection_id);

  if (!Number.isInteger(detectionId) || detectionId <= 0) {
    return res.status(400).json({
      error: 'A valid detection_id is required.',
    });
  }

  let reportPath;

  try {
    const rows = await all(
      `SELECT
         id,
         image_name,
         timestamp,
         severity,
         coverage,
         confidence
       FROM detection
       WHERE id = ?`,
      [detectionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Detection record not found.',
      });
    }

    const detection = rows[0];

    await fs.promises.mkdir(reportsDirectory, {
      recursive: true,
    });

    const filename = `spillguard-report-${detection.id}-${Date.now()}.pdf`;

    reportPath = path.join(reportsDirectory, filename);

    // Generate the PDF file.
    await new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ margin: 50 });
      const output = fs.createWriteStream(reportPath);

      let settled = false;

      const fail = (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      output.on('finish', () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });

      output.on('error', fail);
      pdf.on('error', fail);

      pdf.pipe(output);

      pdf.fontSize(22).text('AI SpillGuard', {
        align: 'center',
      });

      pdf.moveDown();

      pdf.fontSize(16).text('Oil Spill Detection Report', {
        align: 'center',
      });

      pdf.moveDown(2);
      pdf.fontSize(12);

      pdf.text(`Detection ID: ${detection.id}`);
      pdf.moveDown(0.5);

      pdf.text(`Image: ${detection.image_name}`);
      pdf.moveDown(0.5);

      pdf.text(`Detection Date: ${detection.timestamp}`);
      pdf.moveDown(0.5);

      pdf.text(`Severity: ${detection.severity}`);
      pdf.moveDown(0.5);

      pdf.text(
        `Predicted Spill Coverage: ${Number(detection.coverage).toFixed(2)}%`
      );

      pdf.moveDown(0.5);

      pdf.text(
        `Confidence: ${
          detection.confidence == null
            ? 'Not available'
            : Number(detection.confidence).toFixed(4)
        }`
      );

      pdf.moveDown(2);

      pdf.fontSize(10).text(
        'This report contains AI-generated predictions. Results should be reviewed before operational decisions.'
      );

      pdf.end();
    });

    // Save report metadata in SQLite.
    let savedReport;

    try {
      savedReport = await run(
        `INSERT INTO reports (incident_id, report_path)
         VALUES (?, ?)`,
        [detection.id, reportPath]
      );
    } catch (dbError) {
      await fs.promises.unlink(reportPath).catch(() => {});
      throw dbError;
    }

    return res.status(201).json({
      success: true,
      message: 'PDF report generated successfully.',
      report_id: savedReport.lastID,
      detection_id: detection.id,
      filename,
      download_url: `/api/report/${filename}`,
    });
  } catch (err) {
    console.error('Report generation error:', err.message);

    return res.status(500).json({
      error: 'Could not generate the detection report.',
    });
  }
}

// =====================================================
// 6. DOWNLOAD PDF REPORT
// =====================================================

export async function downloadReport(req, res) {
  const filename = req.params.filename;

  // Accept only generated report filenames.
  if (!/^spillguard-report-\d+-\d+\.pdf$/.test(filename)) {
    return res.status(400).json({
      error: 'Invalid report filename.',
    });
  }

  try {
    // Retrieve registered report paths from the database.
    const rows = await all(
      `SELECT report_path
       FROM reports`
    );

    const matchingReport = rows.find(
      (row) => path.basename(row.report_path) === filename
    );

    if (!matchingReport) {
      return res.status(404).json({
        error: 'Report not found.',
      });
    }

    await fs.promises.access(matchingReport.report_path);

    return res.download(matchingReport.report_path, filename);
  } catch (err) {
    console.error('Report download error:', err.message);

    if (err.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Report file not found on disk.',
      });
    }

    return res.status(500).json({
      error: 'Could not download the report.',
    });
  }
}
