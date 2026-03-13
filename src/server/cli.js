import { getDatabase } from './database.js';
import { seedRates, displayCurrentRates, registerNewRate, getRecentChanges } from './rates.js';
import { sendRateChangeNotifications, sendCurrentRatesSummary } from './notification.js';
import { addClient, getActiveClients } from './database.js';
import { testConnection } from './mailer.js';

const command = process.argv[2];
const args = process.argv.slice(3);

// データベース初期化
getDatabase();

async function run() {
  switch (command) {
    case 'check':
      // 現在の料率を表示
      seedRates();
      displayCurrentRates();

      const changes = getRecentChanges();
      if (changes.length > 0) {
        console.log(`\n直近の料率変更: ${changes.length}件`);
        for (const c of changes) {
          const old = c.old_rate_percent !== null ? `${c.old_rate_percent}%` : '新規';
          console.log(`  ${c.category} - ${c.rate_name}: ${old} → ${c.rate_percent}% (${c.effective_date})`);
        }
      } else {
        console.log('\n直近の料率変更はありません。');
      }
      break;

    case 'notify':
      // 通知を送信
      seedRates();
      await sendRateChangeNotifications();
      break;

    case 'summary':
      // 全料率一覧を送信
      seedRates();
      await sendCurrentRatesSummary();
      break;

    case 'add-client':
      // 顧客を追加: node cli.js add-client "会社名" "担当者名" "email@example.com"
      if (args.length < 3) {
        console.log('使い方: node cli.js add-client "会社名" "担当者名" "email@example.com"');
        break;
      }
      addClient(args[0], args[1], args[2]);
      console.log(`顧客を追加しました: ${args[0]} (${args[2]})`);
      break;

    case 'list-clients':
      // 顧客一覧を表示
      const clients = getActiveClients();
      if (clients.length === 0) {
        console.log('登録されている顧客はいません。');
      } else {
        console.log('\n=== 顧客一覧 ===');
        for (const c of clients) {
          console.log(`  [${c.id}] ${c.company_name} / ${c.contact_name} (${c.email})`);
        }
      }
      break;

    case 'add-rate':
      // 料率を追加: node cli.js add-rate "カテゴリ" "料率名" 料率% 事業主% 被保険者% "施行日"
      if (args.length < 6) {
        console.log('使い方: node cli.js add-rate "カテゴリ" "料率名" 料率% 事業主% 被保険者% "YYYY-MM-DD"');
        break;
      }
      registerNewRate(args[0], args[1], parseFloat(args[2]), parseFloat(args[3]), parseFloat(args[4]), args[5]);
      break;

    case 'test-smtp':
      // SMTP接続テスト
      await testConnection();
      break;

    case 'seed':
      // サンプルデータの登録
      seedRates();
      break;

    default:
      console.log(`
社会保険料率変更 通知システム CLI

使い方:
  node cli.js <コマンド> [引数...]

コマンド:
  check                         現在の料率と変更を確認
  notify                        未通知の料率変更をメール送信
  summary                       全料率一覧を全顧客にメール送信
  add-client <会社名> <担当者> <メール>  顧客を追加
  list-clients                  顧客一覧を表示
  add-rate <カテゴリ> <名前> <率> <事業主> <被保険者> <施行日>  料率を追加
  test-smtp                     SMTP接続テスト
  seed                          サンプル料率データを登録
      `);
  }
}

run().catch(console.error);
