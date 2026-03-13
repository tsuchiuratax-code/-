/**
 * 事務所通信・メール配信サービス
 */

// ── 事務所通信の作成・保存 ──────────────────────────────────────────
/**
 * 事務所通信を保存する
 * @param {Object} newsletterData
 * @returns {string} 通信ID
 */
function saveNewsletter(newsletterData) {
  const sheet = getSheet(CONFIG.SHEETS.NEWSLETTER);
  const newsletterId = generateNewsletterId();
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  sheet.appendRow([
    newsletterId,
    newsletterData.タイトル || '',
    now,
    newsletterData.配信日 || '',
    newsletterData.配信対象 || '全顧客',
    newsletterData.本文 || '',
    'FALSE', // 配信済
    0,       // 配信数
    newsletterData.作成者 || '',
  ]);

  return newsletterId;
}

/**
 * 事務所通信一覧を取得する
 * @returns {Array}
 */
function getNewsletters() {
  const sheet = getSheet(CONFIG.SHEETS.NEWSLETTER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
    .sort((a, b) => new Date(b.作成日) - new Date(a.作成日));
}

// ── メール配信 ──────────────────────────────────────────
/**
 * 事務所通信をメール配信する
 * @param {string} newsletterId
 * @returns {Object} 配信結果
 */
function sendNewsletter(newsletterId) {
  const nlSheet = getSheet(CONFIG.SHEETS.NEWSLETTER);
  const nlData = nlSheet.getDataRange().getValues();
  const headers = nlData[0];
  const rowIndex = nlData.findIndex((r, i) => i > 0 && r[0].toString() === newsletterId.toString());

  if (rowIndex === -1) throw new Error('通信が見つかりません: ' + newsletterId);

  const row = nlData[rowIndex];
  const newsletter = {};
  headers.forEach((h, i) => { newsletter[h] = row[i]; });

  if (newsletter.配信済 === true || newsletter.配信済 === 'TRUE') {
    throw new Error('この通信はすでに配信済みです');
  }

  // 配信対象の顧客を取得
  const targetCustomers = getTargetCustomers(newsletter.配信対象);
  const settings = getSettings();
  const fromName = settings.事務所名 || CONFIG.EMAIL_FROM_NAME;
  const signature = settings.署名 || '';

  let successCount = 0;
  let failCount = 0;
  const logSheet = getSheet(CONFIG.SHEETS.EMAIL_LOG);

  targetCustomers.forEach(customer => {
    const email = customer.メールアドレス;
    if (!email || !email.includes('@')) return;

    // 通信配信が無効な顧客はスキップ
    if (customer.通信配信 === false || customer.通信配信 === 'FALSE') return;

    const logId = 'L' + Date.now() + Math.random().toString(36).slice(2, 6);
    const sentAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    try {
      const body = buildEmailBody(newsletter.本文, customer, signature);
      GmailApp.sendEmail(email, newsletter.タイトル, body, {
        name: fromName,
        htmlBody: buildHtmlEmail(newsletter.タイトル, newsletter.本文, customer, signature, settings),
      });

      logSheet.appendRow([logId, newsletterId, customer.顧客ID, email, newsletter.タイトル, sentAt, '成功', '']);
      successCount++;
      Utilities.sleep(200); // レート制限対策

    } catch (e) {
      logSheet.appendRow([logId, newsletterId, customer.顧客ID, email, newsletter.タイトル, sentAt, '失敗', e.message]);
      failCount++;
    }
  });

  // 配信済みフラグを更新
  nlSheet.getRange(rowIndex + 1, 7).setValue('TRUE');
  nlSheet.getRange(rowIndex + 1, 8).setValue(successCount);

  return { success: successCount, fail: failCount, total: successCount + failCount };
}

/**
 * 配信対象の顧客を取得する
 */
function getTargetCustomers(target) {
  const all = getCustomers(null);
  switch (target) {
    case '税理士のみ': return all.filter(c => c.契約種別 === '税理士契約');
    case '社労士のみ': return all.filter(c => c.契約種別 === '社労士契約');
    case '双方のみ':   return all.filter(c => c.契約種別 === '双方契約');
    default:           return all; // 全顧客
  }
}

/**
 * テキストメール本文を組み立てる
 */
function buildEmailBody(body, customer, signature) {
  const name = customer['法人名／氏名'] || 'お客様';
  return `${name} 御中\n\n${body}\n\n---\n${signature}`;
}

/**
 * HTMLメール本文を組み立てる
 */
function buildHtmlEmail(title, body, customer, signature, settings) {
  const name = customer['法人名／氏名'] || 'お客様';
  const escapedBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  const escapedSig = signature
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1a73e8;color:#fff;padding:24px 32px;">
      <div style="font-size:12px;opacity:0.8;">${settings.事務所名 || ''}</div>
      <h1 style="margin:8px 0 0;font-size:20px;">${title}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;"><strong>${name}</strong> 御中</p>
      <div style="line-height:1.8;color:#333;">${escapedBody}</div>
    </div>
    <div style="background:#f8f9fa;padding:20px 32px;border-top:1px solid #e0e0e0;font-size:12px;color:#666;">
      ${escapedSig}
    </div>
  </div>
</body>
</html>`;
}

// ── ユーティリティ ──────────────────────────────────────────
function generateNewsletterId() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === '次回通信ID');
  if (!row) return 'N' + Date.now();

  const rowIndex = data.indexOf(row) + 1;
  const currentId = parseInt(row[1]) || 1;
  sheet.getRange(rowIndex, 2).setValue(currentId + 1);
  return 'N' + String(currentId).padStart(4, '0');
}

function getSettings() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  data.slice(1).forEach(row => {
    if (row[0]) settings[row[0]] = row[1];
  });
  return settings;
}
