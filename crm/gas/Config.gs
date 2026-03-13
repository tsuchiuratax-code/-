/**
 * 林税理士社労士事務所 CRM システム
 * 設定ファイル
 */

const CONFIG = {
  // スプレッドシートID（デプロイ後に設定）
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '',

  // シート名
  SHEETS: {
    CUSTOMERS:   '顧客マスタ',
    CONTRACTS:   '契約情報',
    MEETINGS:    '面談履歴',
    NEWSLETTER:  '事務所通信',
    EMAIL_LOG:   'メール配信ログ',
    SETTINGS:    '設定',
  },

  // 契約種別
  CONTRACT_TYPES: ['税理士契約', '社労士契約', '双方契約'],

  // サービス種別と標準単価
  SERVICE_TYPES: {
    '記帳代行（月次）':         30000,
    '巡回監査（月次）':         50000,
    '決算申告':               150000,
    '確定申告（個人）':         50000,
    '給与計算（月次）':         20000,
    '社会保険手続き':           30000,
    '労働保険年度更新':         30000,
    '助成金申請':             100000,
    'コンサルティング（時間）':   15000,
  },

  // 担当者リスト（設定シートから動的に読み込む想定）
  STAFF: ['林', '田中', '鈴木', '佐藤'],

  // メール送信元
  EMAIL_FROM_NAME: '林税理士社労士事務所',

  // カレンダーID（デプロイ後に設定）
  CALENDAR_ID: PropertiesService.getScriptProperties().getProperty('CALENDAR_ID') || 'primary',
};

/**
 * 初回セットアップ：スプレッドシートIDを設定する
 * @param {string} spreadsheetId
 */
function setSpreadsheetId(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
}

/**
 * スプレッドシートを取得する
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 指定シートを取得する（存在しない場合は作成）
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}
