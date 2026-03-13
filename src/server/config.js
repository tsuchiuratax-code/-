import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '../../.env');

/**
 * .envファイルを簡易的に読み込む
 */
function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

/**
 * 設定を読み込む
 */
export function loadConfig() {
  const env = loadEnv();
  const get = (key, fallback = '') => process.env[key] || env[key] || fallback;

  return {
    smtp: {
      host: get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(get('SMTP_PORT', '587'), 10),
      secure: get('SMTP_SECURE', 'false') === 'true',
      user: get('SMTP_USER'),
      pass: get('SMTP_PASS'),
      fromName: get('SMTP_FROM_NAME', '社会保険料率通知システム'),
      fromAddress: get('SMTP_FROM_ADDRESS', get('SMTP_USER')),
    },
    cron: {
      schedule: get('CRON_SCHEDULE', '0 9 1 * *'), // 毎月1日 9:00
    },
  };
}
