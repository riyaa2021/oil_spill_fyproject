
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, 'spillguard.db');

const db = await open({
  filename: databasePath,
  driver: sqlite3.Database,
});

// Enable foreign-key enforcement.
await db.exec('PRAGMA foreign_keys = ON');

// Detection table.
await db.exec(`
  CREATE TABLE IF NOT EXISTS detection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_name TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity TEXT NOT NULL,
    coverage FLOAT NOT NULL,
    confidence FLOAT
  )
`);

// Reports table.
await db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    report_path TEXT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (incident_id)
      REFERENCES detection(id)
      ON DELETE CASCADE
  )
`);

export async function run(sql, params = []) {
  return db.run(sql, params);
}

export async function all(sql, params = []) {
  return db.all(sql, params);
}

export async function get(sql, params = []) {
  return db.get(sql, params);
}

export default db;

