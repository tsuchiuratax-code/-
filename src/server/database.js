import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'insurance.db');

let db;

// sql.js の prepare/run/all/get を better-sqlite3 風に使えるラッパー
function query(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
      const changes = db.getRowsModified();
      saveDatabase();
      return { lastInsertRowid: lastId, changes };
    },
    all(...params) {
      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    get(...params) {
      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    },
  };
}

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function initDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");
  createTables();
  saveDatabase();
  return db;
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      corporate_number TEXT,
      representative_name TEXT,
      postal_code TEXT,
      address TEXT,
      phone TEXT,
      fax TEXT,
      industry TEXT,
      employee_count INTEGER,
      establishment_date TEXT,
      fiscal_year_end TEXT,
      contract_start_date TEXT,
      contract_type TEXT,
      monthly_fee INTEGER,
      health_insurance_type TEXT DEFAULT 'kyokai_kenpo',
      health_insurance_number TEXT,
      pension_number TEXT,
      employment_insurance_number TEXT,
      workers_comp_number TEXT,
      prefecture TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      contact_name TEXT NOT NULL,
      department TEXT,
      position TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      is_primary INTEGER DEFAULT 0,
      notify_rate_change INTEGER DEFAULT 1,
      notify_deadline INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS insurance_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      rate_name TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      employer_share REAL,
      employee_share REAL,
      effective_date TEXT NOT NULL,
      prefecture TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      contact_id INTEGER,
      rate_id INTEGER NOT NULL,
      sent_at TEXT DEFAULT (datetime('now', 'localtime')),
      status TEXT NOT NULL,
      error_message TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (contact_id) REFERENCES client_contacts(id),
      FOREIGN KEY (rate_id) REFERENCES insurance_rates(id)
    )
  `);
}

// ========================
// 顧問先 CRUD
// ========================

export function addClient(data) {
  return query(`
    INSERT INTO clients (
      company_name, corporate_number, representative_name,
      postal_code, address, phone, fax,
      industry, employee_count, establishment_date, fiscal_year_end,
      contract_start_date, contract_type, monthly_fee,
      health_insurance_type, health_insurance_number,
      pension_number, employment_insurance_number, workers_comp_number,
      prefecture, notes
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    data.company_name, data.corporate_number || null, data.representative_name || null,
    data.postal_code || null, data.address || null, data.phone || null, data.fax || null,
    data.industry || null, data.employee_count || null, data.establishment_date || null, data.fiscal_year_end || null,
    data.contract_start_date || null, data.contract_type || null, data.monthly_fee || null,
    data.health_insurance_type || 'kyokai_kenpo', data.health_insurance_number || null,
    data.pension_number || null, data.employment_insurance_number || null, data.workers_comp_number || null,
    data.prefecture || null, data.notes || null
  );
}

export function updateClient(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(value === '' ? null : value);
  }
  fields.push("updated_at = datetime('now', 'localtime')");
  values.push(id);
  return query(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getClient(id) {
  return query('SELECT * FROM clients WHERE id = ?').get(id);
}

export function getActiveClients() {
  return query('SELECT * FROM clients WHERE active = 1 ORDER BY company_name').all();
}

export function getAllClients() {
  return query('SELECT * FROM clients ORDER BY active DESC, company_name').all();
}

export function deactivateClient(id) {
  return query("UPDATE clients SET active = 0, updated_at = datetime('now', 'localtime') WHERE id = ?").run(id);
}

export function activateClient(id) {
  return query("UPDATE clients SET active = 1, updated_at = datetime('now', 'localtime') WHERE id = ?").run(id);
}

export function deleteClient(id) {
  return query('DELETE FROM clients WHERE id = ?').run(id);
}

// ========================
// 連絡先 CRUD
// ========================

export function addContact(clientId, data) {
  return query(`
    INSERT INTO client_contacts (client_id, contact_name, department, position, email, phone, is_primary, notify_rate_change, notify_deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clientId, data.contact_name, data.department || null, data.position || null,
    data.email, data.phone || null,
    data.is_primary ? 1 : 0, data.notify_rate_change !== false ? 1 : 0, data.notify_deadline !== false ? 1 : 0
  );
}

export function updateContact(id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'client_id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value === '' ? null : value));
  }
  values.push(id);
  return query(`UPDATE client_contacts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getContacts(clientId) {
  return query('SELECT * FROM client_contacts WHERE client_id = ? AND active = 1 ORDER BY is_primary DESC').all(clientId);
}

export function deleteContact(id) {
  return query('UPDATE client_contacts SET active = 0 WHERE id = ?').run(id);
}

export function getNotifiableContacts(clientId, notificationType = 'rate_change') {
  const column = notificationType === 'rate_change' ? 'notify_rate_change' : 'notify_deadline';
  return query(
    `SELECT * FROM client_contacts WHERE client_id = ? AND active = 1 AND ${column} = 1`
  ).all(clientId);
}

// ========================
// 対応履歴
// ========================

export function addHistory(clientId, actionType, subject, detail = null) {
  return query(
    'INSERT INTO client_history (client_id, action_type, subject, detail) VALUES (?, ?, ?, ?)'
  ).run(clientId, actionType, subject, detail);
}

export function getHistory(clientId, limit = 50) {
  return query(
    'SELECT * FROM client_history WHERE client_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(clientId, limit);
}

// ========================
// 保険料率
// ========================

export function addRate(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate, prefecture = null) {
  return query(
    `INSERT INTO insurance_rates (category, rate_name, rate_percent, employer_share, employee_share, effective_date, prefecture)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate, prefecture);
}

export function getLatestRates(prefecture = null) {
  const where = prefecture ? 'AND (r1.prefecture = ? OR r1.prefecture IS NULL)' : '';
  const params = prefecture ? [prefecture] : [];
  return query(`
    SELECT r1.* FROM insurance_rates r1
    INNER JOIN (
      SELECT category, rate_name, COALESCE(prefecture, '') as pref, MAX(effective_date) as max_date
      FROM insurance_rates
      GROUP BY category, rate_name, pref
    ) r2 ON r1.category = r2.category
        AND r1.rate_name = r2.rate_name
        AND COALESCE(r1.prefecture, '') = r2.pref
        AND r1.effective_date = r2.max_date
    ${where}
    ORDER BY r1.category, r1.rate_name
  `).all(...params);
}

export function getRateChanges(sinceDate) {
  return query(`
    SELECT new_rate.*, old_rate.rate_percent as old_rate_percent,
           old_rate.employer_share as old_employer_share,
           old_rate.employee_share as old_employee_share
    FROM insurance_rates new_rate
    LEFT JOIN insurance_rates old_rate
      ON new_rate.category = old_rate.category
      AND new_rate.rate_name = old_rate.rate_name
      AND COALESCE(new_rate.prefecture, '') = COALESCE(old_rate.prefecture, '')
      AND old_rate.effective_date = (
        SELECT MAX(effective_date) FROM insurance_rates
        WHERE category = new_rate.category
          AND rate_name = new_rate.rate_name
          AND COALESCE(prefecture, '') = COALESCE(new_rate.prefecture, '')
          AND effective_date < new_rate.effective_date
      )
    WHERE new_rate.effective_date >= ?
      AND (old_rate.rate_percent IS NULL OR new_rate.rate_percent != old_rate.rate_percent)
    ORDER BY new_rate.effective_date DESC
  `).all(sinceDate);
}

// ========================
// 通知ログ
// ========================

export function logNotification(clientId, contactId, rateId, status, errorMessage = null) {
  return query(
    'INSERT INTO notification_log (client_id, contact_id, rate_id, status, error_message) VALUES (?, ?, ?, ?, ?)'
  ).run(clientId, contactId, rateId, status, errorMessage);
}

export function getUnnotifiedChanges(clientId) {
  return query(`
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

export function getNotificationHistory(clientId, limit = 50) {
  return query(`
    SELECT nl.*, ir.category, ir.rate_name, ir.rate_percent, ir.effective_date as rate_effective_date,
           cc.contact_name, cc.email
    FROM notification_log nl
    JOIN insurance_rates ir ON nl.rate_id = ir.id
    LEFT JOIN client_contacts cc ON nl.contact_id = cc.id
    WHERE nl.client_id = ?
    ORDER BY nl.sent_at DESC LIMIT ?
  `).all(clientId, limit);
}
