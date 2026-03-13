import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/insurance.db');

let db;

export function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS insurance_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      rate_name TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      employer_share REAL,
      employee_share REAL,
      effective_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      rate_id INTEGER NOT NULL,
      sent_at TEXT DEFAULT (datetime('now', 'localtime')),
      status TEXT NOT NULL,
      error_message TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (rate_id) REFERENCES insurance_rates(id)
    );
  `);
}

// --- Client operations ---

export function addClient(companyName, contactName, email) {
  const stmt = getDatabase().prepare(
    'INSERT INTO clients (company_name, contact_name, email) VALUES (?, ?, ?)'
  );
  return stmt.run(companyName, contactName, email);
}

export function getActiveClients() {
  return getDatabase().prepare('SELECT * FROM clients WHERE active = 1').all();
}

export function deactivateClient(id) {
  return getDatabase().prepare('UPDATE clients SET active = 0 WHERE id = ?').run(id);
}

// --- Rate operations ---

export function addRate(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate) {
  const stmt = getDatabase().prepare(
    `INSERT INTO insurance_rates (category, rate_name, rate_percent, employer_share, employee_share, effective_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  return stmt.run(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate);
}

export function getLatestRates() {
  return getDatabase().prepare(`
    SELECT r1.* FROM insurance_rates r1
    INNER JOIN (
      SELECT category, rate_name, MAX(effective_date) as max_date
      FROM insurance_rates
      GROUP BY category, rate_name
    ) r2 ON r1.category = r2.category
        AND r1.rate_name = r2.rate_name
        AND r1.effective_date = r2.max_date
    ORDER BY r1.category, r1.rate_name
  `).all();
}

export function getRateChanges(sinceDate) {
  return getDatabase().prepare(`
    SELECT new_rate.*, old_rate.rate_percent as old_rate_percent,
           old_rate.employer_share as old_employer_share,
           old_rate.employee_share as old_employee_share
    FROM insurance_rates new_rate
    LEFT JOIN insurance_rates old_rate
      ON new_rate.category = old_rate.category
      AND new_rate.rate_name = old_rate.rate_name
      AND old_rate.effective_date = (
        SELECT MAX(effective_date) FROM insurance_rates
        WHERE category = new_rate.category
          AND rate_name = new_rate.rate_name
          AND effective_date < new_rate.effective_date
      )
    WHERE new_rate.effective_date >= ?
      AND (old_rate.rate_percent IS NULL OR new_rate.rate_percent != old_rate.rate_percent)
    ORDER BY new_rate.effective_date DESC
  `).all(sinceDate);
}

// --- Notification log ---

export function logNotification(clientId, rateId, status, errorMessage = null) {
  const stmt = getDatabase().prepare(
    'INSERT INTO notification_log (client_id, rate_id, status, error_message) VALUES (?, ?, ?, ?)'
  );
  return stmt.run(clientId, rateId, status, errorMessage);
}

export function getUnnotifiedChanges(clientId) {
  return getDatabase().prepare(`
    SELECT r.* FROM insurance_rates r
    WHERE r.id NOT IN (
      SELECT rate_id FROM notification_log
      WHERE client_id = ? AND status = 'sent'
    )
    AND r.effective_date >= date('now', '-90 days')
    AND r.effective_date != (
      SELECT MIN(effective_date) FROM insurance_rates
      WHERE category = r.category AND rate_name = r.rate_name
    )
    ORDER BY r.effective_date DESC
  `).all(clientId);
}
