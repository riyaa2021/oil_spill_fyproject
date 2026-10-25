
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const db = await open({
  filename: './data/spillguard.db',
  driver: sqlite3.Database,
});

try {
  console.log('\n========== DATABASE TABLES ==========');

  const tables = await db.all(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
  `);

  console.table(tables);

  console.log('\n========== DETECTION TABLE ==========');

  const detectionColumns = await db.all(
    'PRAGMA table_info(detection)'
  );

  console.table(detectionColumns);

  console.log('\n========== REPORTS TABLE ==========');

  const reportColumns = await db.all(
    'PRAGMA table_info(reports)'
  );

  console.table(reportColumns);
} catch (error) {
  console.error('Database inspection failed:', error.message);
} finally {
  await db.close();
}

