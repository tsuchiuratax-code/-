/**
 * 初回セットアップ
 * GASエディタから一度だけ実行してスプレッドシートを初期化する
 */
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  Logger.log('スプレッドシートの初期化を開始します: ' + ss.getName());

  setupCustomerSheet(ss);
  setupContractSheet(ss);
  setupMeetingSheet(ss);
  setupNewsletterSheet(ss);
  setupEmailLogSheet(ss);
  setupSettingsSheet(ss);

  Logger.log('初期化完了');
}

// ── 顧客マスタ ──────────────────────────────────────────
function setupCustomerSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.CUSTOMERS);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.CUSTOMERS);

  const headers = [
    '顧客ID', '法人名／氏名', 'フリガナ', '担当者名', '郵便番号',
    '住所', '電話番号', 'FAX番号', 'メールアドレス',
    '契約種別',       // 税理士契約／社労士契約／双方契約
    '業種', '資本金', '従業員数',
    '決算期（月）', '法人税申告期限', '消費税申告期限',
    '社会保険労務士担当', '税理士担当',
    '顧問料（月額・税抜）', '決算料（税抜）',
    '契約開始日', '契約終了日',
    '通信配信', // TRUE/FALSE
    'メモ', '登録日', '更新日',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 80);   // 顧客ID
  sheet.setColumnWidth(2, 200);  // 法人名
  sheet.setColumnWidth(6, 300);  // 住所
  sheet.setColumnWidth(24, 200); // メモ
}

// ── 契約情報 ──────────────────────────────────────────
function setupContractSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.CONTRACTS);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.CONTRACTS);

  const headers = [
    '契約ID', '顧客ID', '法人名／氏名', 'サービス種別',
    '単価（税抜）', '頻度', '契約開始日', '契約終了日',
    '備考', '登録日',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
}

// ── 面談履歴 ──────────────────────────────────────────
function setupMeetingSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.MEETINGS);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.MEETINGS);

  const headers = [
    '面談ID', '顧客ID', '法人名／氏名', '面談日',
    '担当者', '面談種別',  // 訪問／来所／電話／オンライン
    '内容', '次回予定日', 'カレンダー登録済', '登録日',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
}

// ── 事務所通信 ──────────────────────────────────────────
function setupNewsletterSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.NEWSLETTER);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.NEWSLETTER);

  const headers = [
    '通信ID', 'タイトル', '作成日', '配信日',
    '配信対象',   // 全顧客／税理士のみ／社労士のみ／双方のみ
    '本文', '配信済', '配信数', '作成者',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(6, 500); // 本文
}

// ── メール配信ログ ──────────────────────────────────────────
function setupEmailLogSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.EMAIL_LOG);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.EMAIL_LOG);

  const headers = [
    'ログID', '通信ID', '顧客ID', '宛先メール',
    '件名', '配信日時', 'ステータス', 'エラー内容',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
}

// ── 設定シート ──────────────────────────────────────────
function setupSettingsSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.SETTINGS);

  const data = [
    ['設定項目', '値'],
    ['事務所名', '林税理士社労士事務所'],
    ['代表者名', '林'],
    ['住所', ''],
    ['電話番号', ''],
    ['メールアドレス', ''],
    ['署名', ''],
    ['カレンダーID', 'primary'],
    ['次回顧客ID', '1001'],
    ['次回通信ID', '1'],
  ];

  sheet.getRange(1, 1, data.length, 2).setValues(data);
  formatHeaderRow(sheet, 2);
}

// ── ユーティリティ ──────────────────────────────────────────
function formatHeaderRow(sheet, colCount) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
}
