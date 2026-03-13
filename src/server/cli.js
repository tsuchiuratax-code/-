import { getDatabase } from './database.js';
import { seedRates, displayCurrentRates, registerNewRate, getRecentChanges } from './rates.js';
import { sendRateChangeNotifications, sendCurrentRatesSummary } from './notification.js';
import { addClient, addContact, getActiveClients } from './database.js';
import { testConnection } from './mailer.js';

const command = process.argv[2];
const args = process.argv.slice(3);

// データベース初期化
getDatabase();

async function run() {
  switch (command) {
    case 'check':
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
      seedRates();
      await sendRateChangeNotifications();
      break;

    case 'summary':
      seedRates();
      await sendCurrentRatesSummary();
      break;

    case 'add-client':
      // node cli.js add-client "会社名" "担当者名" "email@example.com"
      if (args.length < 3) {
        console.log('使い方: node cli.js add-client "会社名" "担当者名" "email@example.com"');
        break;
      }
      {
        const result = addClient({ company_name: args[0] });
        addContact(result.lastInsertRowid, {
          contact_name: args[1],
          email: args[2],
          is_primary: true,
        });
        console.log(`顧問先を追加しました: ${args[0]} (${args[2]})`);
      }
      break;

    case 'list-clients': {
      const clients = getActiveClients();
      if (clients.length === 0) {
        console.log('登録されている顧問先はいません。');
      } else {
        console.log('\n=== 顧問先一覧 ===');
        for (const c of clients) {
          console.log(`  [${c.id}] ${c.company_name} / ${c.representative_name || '-'} / ${c.phone || '-'}`);
        }
      }
      break;
    }

    case 'add-rate':
      if (args.length < 6) {
        console.log('使い方: node cli.js add-rate "カテゴリ" "料率名" 料率% 事業主% 被保険者% "YYYY-MM-DD"');
        break;
      }
      registerNewRate(args[0], args[1], parseFloat(args[2]), parseFloat(args[3]), parseFloat(args[4]), args[5]);
      break;

    case 'test-smtp':
      await testConnection();
      break;

    case 'seed':
      seedRates();
      break;

    default:
      console.log(`
社会保険料率変更 通知システム CLI

使い方:
  node cli.js <コマンド> [引数...]

コマンド:
  check                                      現在の料率と変更を確認
  notify                                     未通知の料率変更をメール送信
  summary                                    全料率一覧を全顧問先にメール送信
  add-client <会社名> <担当者> <メール>       顧問先を追加
  list-clients                               顧問先一覧を表示
  add-rate <カテゴリ> <名前> <率> <事業主> <被保険者> <施行日>  料率を追加
  test-smtp                                  SMTP接続テスト
  seed                                       サンプル料率データを登録

Web管理画面:
  npm start → http://localhost:3000/crm
      `);
  }
}

run().catch(console.error);
