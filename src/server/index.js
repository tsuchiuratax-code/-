import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { loadConfig } from './config.js';
import { getDatabase } from './database.js';
import { seedRates, displayCurrentRates } from './rates.js';
import { sendRateChangeNotifications } from './notification.js';
import { testConnection } from './mailer.js';
import apiRouter from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

async function main() {
  console.log('=== 社会保険料率変更 自動通知システム ===\n');

  // データベース初期化
  getDatabase();
  console.log('データベースを初期化しました。');

  // サンプル料率データを登録
  seedRates();

  // Express サーバー起動
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 静的ファイル配信（管理画面）
  app.use(express.static(path.join(__dirname, '../public')));

  // API ルート
  app.use('/api', apiRouter);

  // SPA フォールバック
  app.get('/crm*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/crm.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n管理画面: http://localhost:${PORT}/crm`);
    console.log(`API:      http://localhost:${PORT}/api`);
  });

  // SMTP接続テスト
  const config = loadConfig();
  if (config.smtp.user) {
    console.log('\nSMTP接続をテストしています...');
    await testConnection();
  } else {
    console.log('\n注意: SMTP設定が未構成です。.envファイルを設定してください。');
  }

  // 定期実行スケジュール
  const schedule = config.cron.schedule;
  console.log(`通知スケジュール: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log(`\n[${new Date().toLocaleString('ja-JP')}] 定期通知を実行します...`);
    try {
      await sendRateChangeNotifications();
    } catch (error) {
      console.error('通知実行エラー:', error.message);
    }
  });

  console.log('\nシステムが起動しました。');
}

main().catch(console.error);
