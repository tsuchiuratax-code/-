import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './mailer.js';
import {
  getActiveClients, getUnnotifiedChanges, logNotification,
  getLatestRates, getNotifiableContacts, addHistory,
} from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, 'templates/rate-change.html');

/**
 * HTMLテンプレートを読み込んで変数を埋め込む
 */
function renderTemplate(contactName, companyName, rateChanges) {
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const rows = rateChanges.map((change) => {
    const oldRate = change.old_rate_percent;
    const newRate = change.rate_percent;
    const diff = oldRate !== null ? newRate - oldRate : null;
    const changeClass = diff !== null ? (diff > 0 ? 'change-up' : 'change-down') : '';
    const arrow = diff !== null ? (diff > 0 ? '↑' : '↓') : '';
    const diffText = diff !== null ? `${arrow} ${Math.abs(diff).toFixed(2)}%` : '';

    return `
      <tr>
        <td>${change.category} - ${change.rate_name}</td>
        <td>${oldRate !== null ? oldRate + '%' : '（新規）'}</td>
        <td class="${changeClass}">${newRate}% ${diffText}</td>
        <td>${change.employer_share !== null ? change.employer_share + '%' : '-'}</td>
        <td>${change.employee_share !== null ? change.employee_share + '%' : '-'}</td>
        <td>${change.effective_date}</td>
      </tr>
    `;
  }).join('');

  const now = new Date();
  const sentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  template = template.replace('{{CONTACT_NAME}}', contactName);
  template = template.replace('{{RATE_ROWS}}', rows);
  template = template.replace('{{SENT_DATE}}', sentDate);

  return template;
}

/**
 * 全アクティブ顧問先の通知対象連絡先に未通知の料率変更をメール送信する
 */
export async function sendRateChangeNotifications() {
  const clients = getActiveClients();

  if (clients.length === 0) {
    console.log('通知対象の顧問先がいません。');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const client of clients) {
    const changes = getUnnotifiedChanges(client.id);

    if (changes.length === 0) {
      skipped++;
      continue;
    }

    // 料率変更通知を受け取る連絡先を取得
    const contacts = getNotifiableContacts(client.id, 'rate_change');

    if (contacts.length === 0) {
      console.log(`${client.company_name}: 通知先が登録されていません`);
      skipped++;
      continue;
    }

    console.log(`${client.company_name}: ${changes.length}件の変更を${contacts.length}名に通知...`);

    for (const contact of contacts) {
      try {
        const html = renderTemplate(contact.contact_name, client.company_name, changes);
        await sendEmail(
          contact.email,
          '【重要】社会保険料率変更のお知らせ',
          html
        );

        for (const change of changes) {
          logNotification(client.id, contact.id, change.id, 'sent');
        }
        sent++;
        console.log(`  → ${contact.contact_name} (${contact.email}) 送信完了`);
      } catch (error) {
        for (const change of changes) {
          logNotification(client.id, contact.id, change.id, 'failed', error.message);
        }
        failed++;
        console.error(`  → ${contact.contact_name} (${contact.email}) 送信失敗: ${error.message}`);
      }
    }

    addHistory(client.id, '通知', `料率変更通知を送信（${changes.length}件）`);
  }

  console.log(`\n送信完了: 成功 ${sent}件, 失敗 ${failed}件, スキップ ${skipped}件`);
  return { sent, failed, skipped };
}

/**
 * 現在の料率一覧をメールで送信する（全顧問先向け）
 */
export async function sendCurrentRatesSummary() {
  const clients = getActiveClients();
  const rates = getLatestRates();

  if (rates.length === 0) {
    console.log('料率データが登録されていません。');
    return;
  }

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const rows = rates.map((rate) => `
    <tr>
      <td>${rate.category} - ${rate.rate_name}</td>
      <td>-</td>
      <td>${rate.rate_percent}%</td>
      <td>${rate.employer_share !== null ? rate.employer_share + '%' : '-'}</td>
      <td>${rate.employee_share !== null ? rate.employee_share + '%' : '-'}</td>
      <td>${rate.effective_date}</td>
    </tr>
  `).join('');

  const now = new Date();
  const sentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  for (const client of clients) {
    const contacts = getNotifiableContacts(client.id, 'rate_change');
    for (const contact of contacts) {
      let html = template
        .replace('{{CONTACT_NAME}}', contact.contact_name)
        .replace('{{RATE_ROWS}}', rows)
        .replace('{{SENT_DATE}}', sentDate);
      html = html.replace('変更のお知らせ', '現在の料率一覧');

      try {
        await sendEmail(contact.email, '社会保険料率一覧のご案内', html);
        console.log(`${client.company_name} / ${contact.contact_name}: 送信完了`);
      } catch (error) {
        console.error(`${client.company_name} / ${contact.contact_name}: 送信失敗 - ${error.message}`);
      }
    }
  }
}
