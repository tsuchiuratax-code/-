import cron from 'node-cron';
import { loadConfig } from './config.js';
import { getDatabase } from './database.js';
import { seedRates, displayCurrentRates } from './rates.js';
import { sendRateChangeNotifications } from './notification.js';
import { testConnection } from './mailer.js';

async function main() {
  console.log('=== 社会保険料率変更 自動通知システム ===\n');

  // データベース初期化
  getDatabase();
  console.log('データベースを初期化しました。');

  // サンプル料率データを登録
  seedRates();

  // 現在の料率を表示
  displayCurrentRates();

  // SMTP接続テスト
  const config = loadConfig();
  if (config.smtp.user) {
    console.log('\nSMTP接続をテストしています...');
    await testConnection();
  } else {
    console.log('\n注意: SMTP設定が未構成です。.envファイルを設定してください。');
  }

  // 定期実行スケジュールの設定
  const schedule = config.cron.schedule;
  console.log(`\n通知スケジュール: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log(`\n[${new Date().toLocaleString('ja-JP')}] 定期通知を実行します...`);
    try {
      await sendRateChangeNotifications();
    } catch (error) {
      console.error('通知実行エラー:', error.message);
    }
  });

  console.log('\nシステムが起動しました。Ctrl+Cで終了します。');
}

main().catch(console.error);
