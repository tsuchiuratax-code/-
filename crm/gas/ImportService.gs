/**
 * データインポートサービス
 * 顧問先一覧.xls、メールアドレス一覧、報酬CSVをCRMに取り込む
 */

// ── 顧問先一覧（Excelシート）からの取り込み ──────────────────────────────────────────
/**
 * 「顧問先一覧」シートのデータをCRM顧客マスタに一括インポートする
 * GASエディタからimportCustomersFromSheet()を実行する
 *
 * 想定列順（変更可）:
 * A:法人名/氏名, B:フリガナ, C:電話番号, D:FAX, E:メール,
 * F:郵便番号, G:住所, H:業種, I:契約種別, J:決算期,
 * K:税理士担当, L:社労士担当, M:顧問料, N:決算料
 */
function importCustomersFromSheet() {
  const ss = getSpreadsheet();

  // インポート元シート名を設定（実際のシート名に合わせてください）
  const SOURCE_SHEET_NAME = '顧問先一覧';
  const sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);

  if (!sourceSheet) {
    throw new Error(`「${SOURCE_SHEET_NAME}」シートが見つかりません。シートをスプレッドシートに追加してください。`);
  }

  const data = sourceSheet.getDataRange().getValues();
  const headerRow = data[0].map(h => String(h).trim());

  // 列インデックスを動的に取得（ヘッダー名で判定）
  const colMap = detectColumns(headerRow);
  Logger.log('列マッピング: ' + JSON.stringify(colMap));

  let importCount = 0;
  let skipCount = 0;

  data.slice(1).forEach((row, i) => {
    const name = String(row[colMap.name] || '').trim();
    if (!name) { skipCount++; return; }

    const contractType = normalizeContractType(String(row[colMap.contractType] || ''));

    const customerData = {
      '法人名／氏名':       name,
      'フリガナ':           colMap.kana  >= 0 ? String(row[colMap.kana]  || '') : '',
      '電話番号':           colMap.tel   >= 0 ? String(row[colMap.tel]   || '') : '',
      'FAX番号':            colMap.fax   >= 0 ? String(row[colMap.fax]   || '') : '',
      'メールアドレス':     colMap.email >= 0 ? String(row[colMap.email] || '') : '',
      '郵便番号':           colMap.zip   >= 0 ? String(row[colMap.zip]   || '') : '',
      '住所':               colMap.addr  >= 0 ? String(row[colMap.addr]  || '') : '',
      '業種':               colMap.biz   >= 0 ? String(row[colMap.biz]   || '') : '',
      '契約種別':           contractType,
      '決算期（月）':       colMap.fiscal >= 0 ? String(row[colMap.fiscal] || '') : '',
      '税理士担当':         colMap.taxStaff >= 0 ? String(row[colMap.taxStaff] || '') : '',
      '社会保険労務士担当': colMap.srStaff  >= 0 ? String(row[colMap.srStaff]  || '') : '',
      '顧問料（月額・税抜）': colMap.fee >= 0 ? parseAmount(row[colMap.fee]) : 0,
      '決算料（税抜）':     colMap.decFee >= 0 ? parseAmount(row[colMap.decFee]) : 0,
      '通信配信':           true,
    };

    createCustomer(customerData);
    importCount++;
  });

  const msg = `インポート完了：${importCount}件登録、${skipCount}件スキップ（名前なし）`;
  Logger.log(msg);
  return msg;
}

// ── メールアドレス一覧からのマージ ──────────────────────────────────────────
/**
 * 「メールアドレス一覧」シートのデータをCRM顧客マスタにマージする
 * 顧客名で突き合わせてメールアドレスを更新する
 */
function mergeEmailAddresses() {
  const ss = getSpreadsheet();
  const SOURCE_SHEET_NAME = 'メールアドレス一覧';
  const sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);

  if (!sourceSheet) {
    throw new Error(`「${SOURCE_SHEET_NAME}」シートが見つかりません。`);
  }

  const data = sourceSheet.getDataRange().getValues();
  const headerRow = data[0].map(h => String(h).trim());
  const nameCol  = findCol(headerRow, ['法人名', '氏名', '顧客名', '名前', 'name']);
  const emailCol = findCol(headerRow, ['メール', 'mail', 'email', 'メールアドレス']);

  if (nameCol < 0 || emailCol < 0) {
    throw new Error('名前列またはメール列が見つかりません。ヘッダーを確認してください。');
  }

  const customers = getCustomers(null);
  let updateCount = 0;

  data.slice(1).forEach(row => {
    const name  = String(row[nameCol]  || '').trim();
    const email = String(row[emailCol] || '').trim();
    if (!name || !email || !email.includes('@')) return;

    // 部分一致で顧客を検索
    const match = customers.find(c =>
      String(c['法人名／氏名'] || '').includes(name) || name.includes(String(c['法人名／氏名'] || ''))
    );
    if (match) {
      updateCustomer(match.顧客ID, { ...match, メールアドレス: email });
      updateCount++;
    }
  });

  const msg = `メールアドレス更新完了：${updateCount}件更新`;
  Logger.log(msg);
  return msg;
}

// ── 報酬CSV（syukei-hosyu）からの取り込み ──────────────────────────────────────────
/**
 * 集計報酬CSVデータをスプレッドシートにインポートし、
 * 顧客ごとの標準報酬（顧問料）を更新する
 *
 * CSVをGoogleドライブにアップロード後、ファイルIDを指定して実行
 * @param {string} csvFileId - GoogleドライブのファイルID
 */
function importFeeFromCsv(csvFileId) {
  let csvContent;
  try {
    const file = DriveApp.getFileById(csvFileId);
    csvContent = file.getBlob().getDataAsString('UTF-8');
  } catch (e) {
    // Shift-JISの場合
    try {
      const file = DriveApp.getFileById(csvFileId);
      csvContent = file.getBlob().getDataAsString('Shift_JIS');
    } catch (e2) {
      throw new Error('CSVファイルを読み込めませんでした: ' + e2.message);
    }
  }

  const rows = parseCsv(csvContent);
  if (rows.length < 2) throw new Error('CSVデータが空です');

  const headers = rows[0].map(h => String(h).trim());
  const nameCol     = findCol(headers, ['顧客名', '法人名', '氏名', '得意先名', '名前']);
  const feeCol      = findCol(headers, ['月次顧問料', '顧問料', '月額報酬', '報酬額', '金額']);
  const contractCol = findCol(headers, ['契約種別', '契約区分']);

  if (nameCol < 0) throw new Error('顧客名列が見つかりません。CSVヘッダーを確認してください。');

  // CSVの内容をログシートに保存（監査証跡）
  logFeeImport(rows);

  const customers = getCustomers(null);
  let updateCount = 0;

  rows.slice(1).forEach(row => {
    const name = String(row[nameCol] || '').trim();
    if (!name) return;
    const fee  = feeCol >= 0 ? parseAmount(row[feeCol]) : 0;

    const match = customers.find(c =>
      String(c['法人名／氏名'] || '').includes(name) || name.includes(String(c['法人名／氏名'] || ''))
    );
    if (match && fee > 0) {
      updateCustomer(match.顧客ID, { ...match, '顧問料（月額・税抜）': fee });
      updateCount++;
    }
  });

  return `報酬インポート完了：${updateCount}件の顧問料を更新しました`;
}

function logFeeImport(rows) {
  const ss = getSpreadsheet();
  let logSheet = ss.getSheetByName('報酬インポートログ');
  if (!logSheet) logSheet = ss.insertSheet('報酬インポートログ');

  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  logSheet.appendRow(['--- インポート: ' + now + ' ---']);
  rows.forEach(row => logSheet.appendRow(row));
}

// ── ユーティリティ ──────────────────────────────────────────
function detectColumns(headers) {
  return {
    name:        findCol(headers, ['法人名', '氏名', '顧客名', '名前', '会社名']),
    kana:        findCol(headers, ['フリガナ', 'かな', 'カナ', '読み']),
    tel:         findCol(headers, ['電話', 'TEL', 'tel', '電話番号']),
    fax:         findCol(headers, ['FAX', 'fax', 'ファックス']),
    email:       findCol(headers, ['メール', 'mail', 'email', 'メールアドレス']),
    zip:         findCol(headers, ['郵便番号', '〒', 'zip']),
    addr:        findCol(headers, ['住所', '所在地', 'address']),
    biz:         findCol(headers, ['業種', '業態', '事業内容']),
    contractType:findCol(headers, ['契約種別', '契約区分', '契約']),
    fiscal:      findCol(headers, ['決算期', '決算月', '決算']),
    taxStaff:    findCol(headers, ['税理士担当', '担当税理士', '税担当']),
    srStaff:     findCol(headers, ['社労士担当', '担当社労士', '社担当', '担当者']),
    fee:         findCol(headers, ['顧問料', '月額報酬', '月次報酬', '月額']),
    decFee:      findCol(headers, ['決算料', '決算報酬']),
  };
}

function findCol(headers, candidates) {
  for (const cand of candidates) {
    const idx = headers.findIndex(h => String(h).includes(cand));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeContractType(val) {
  if (!val) return '';
  if (val.includes('双方') || val.includes('両方')) return '双方契約';
  if (val.includes('社労') || val.includes('労務')) return '社労士契約';
  if (val.includes('税理') || val.includes('税務')) return '税理士契約';
  return val;
}

function parseAmount(val) {
  if (!val) return 0;
  return parseInt(String(val).replace(/[^\d]/g, '')) || 0;
}

function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  lines.forEach(line => {
    if (!line.trim()) return;
    const cells = [];
    let inQuote = false, cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cell); cell = ''; }
      else { cell += ch; }
    }
    cells.push(cell);
    rows.push(cells);
  });
  return rows;
}
