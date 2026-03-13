/**
 * 顧客管理サービス
 * 顧客マスタのCRUD操作を提供する
 */

// ── 顧客一覧取得 ──────────────────────────────────────────
/**
 * 顧客一覧を取得する
 * @param {Object} filters - 絞り込み条件 {keyword, contractType, staff}
 * @returns {Array} 顧客データ配列
 */
function getCustomers(filters) {
  const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  let customers = data.slice(1).map(row => rowToCustomer(headers, row));

  // アクティブな顧客のみ（契約終了日が空か未来）
  customers = customers.filter(c => {
    if (!c.契約終了日) return true;
    return new Date(c.契約終了日) >= new Date();
  });

  // フィルタ適用
  if (filters) {
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      customers = customers.filter(c =>
        (c['法人名／氏名'] || '').toLowerCase().includes(kw) ||
        (c.メールアドレス || '').toLowerCase().includes(kw) ||
        (c.顧客ID || '').toString().includes(kw)
      );
    }
    if (filters.contractType) {
      customers = customers.filter(c => c.契約種別 === filters.contractType);
    }
    if (filters.staff) {
      customers = customers.filter(c =>
        c.税理士担当 === filters.staff || c.社会保険労務士担当 === filters.staff
      );
    }
  }

  return customers;
}

/**
 * 顧客1件を取得する
 * @param {string} customerId
 * @returns {Object|null}
 */
function getCustomerById(customerId) {
  const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const row = data.slice(1).find(r => r[0].toString() === customerId.toString());
  return row ? rowToCustomer(headers, row) : null;
}

// ── 顧客登録 ──────────────────────────────────────────
/**
 * 顧客を新規登録する
 * @param {Object} customerData
 * @returns {string} 新規顧客ID
 */
function createCustomer(customerData) {
  const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
  const customerId = generateCustomerId();
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  const row = [
    customerId,
    customerData['法人名／氏名'] || '',
    customerData.フリガナ || '',
    customerData.担当者名 || '',
    customerData.郵便番号 || '',
    customerData.住所 || '',
    customerData.電話番号 || '',
    customerData.FAX番号 || '',
    customerData.メールアドレス || '',
    customerData.契約種別 || '',
    customerData.業種 || '',
    customerData.資本金 || '',
    customerData.従業員数 || '',
    customerData['決算期（月）'] || '',
    customerData.法人税申告期限 || '',
    customerData.消費税申告期限 || '',
    customerData.社会保険労務士担当 || '',
    customerData.税理士担当 || '',
    customerData['顧問料（月額・税抜）'] || 0,
    customerData['決算料（税抜）'] || 0,
    customerData.契約開始日 || '',
    customerData.契約終了日 || '',
    customerData.通信配信 !== undefined ? customerData.通信配信 : true,
    customerData.メモ || '',
    now,
    now,
  ];

  sheet.appendRow(row);
  return customerId;
}

// ── 顧客更新 ──────────────────────────────────────────
/**
 * 顧客情報を更新する
 * @param {string} customerId
 * @param {Object} customerData
 * @returns {boolean}
 */
function updateCustomer(customerId, customerData) {
  const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const rowIndex = data.findIndex((r, i) => i > 0 && r[0].toString() === customerId.toString());
  if (rowIndex === -1) return false;

  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  const sheetRow = rowIndex + 1; // 1-indexed

  const updates = {
    2:  customerData['法人名／氏名'],
    3:  customerData.フリガナ,
    4:  customerData.担当者名,
    5:  customerData.郵便番号,
    6:  customerData.住所,
    7:  customerData.電話番号,
    8:  customerData.FAX番号,
    9:  customerData.メールアドレス,
    10: customerData.契約種別,
    11: customerData.業種,
    12: customerData.資本金,
    13: customerData.従業員数,
    14: customerData['決算期（月）'],
    15: customerData.法人税申告期限,
    16: customerData.消費税申告期限,
    17: customerData.社会保険労務士担当,
    18: customerData.税理士担当,
    19: customerData['顧問料（月額・税抜）'],
    20: customerData['決算料（税抜）'],
    21: customerData.契約開始日,
    22: customerData.契約終了日,
    23: customerData.通信配信,
    24: customerData.メモ,
    26: now, // 更新日
  };

  Object.entries(updates).forEach(([col, val]) => {
    if (val !== undefined) {
      sheet.getRange(sheetRow, parseInt(col)).setValue(val);
    }
  });

  return true;
}

// ── ユーティリティ ──────────────────────────────────────────
function rowToCustomer(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

function generateCustomerId() {
  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === '次回顧客ID');
  if (!row) return 'C' + Date.now();

  const rowIndex = data.indexOf(row) + 1;
  const currentId = parseInt(row[1]) || 1001;
  sheet.getRange(rowIndex, 2).setValue(currentId + 1);
  return 'C' + currentId;
}

/**
 * 今月が決算・申告期限の顧客を取得する
 */
function getCustomersWithDeadlinesThisMonth() {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;

  const customers = getCustomers(null);
  return customers.filter(c => {
    const fiscalMonth = parseInt(c['決算期（月）']);
    // 決算月の2ヶ月後が法人税申告期限（一般的）
    const taxMonth = fiscalMonth ? ((fiscalMonth + 1) % 12 + 1) : null;
    return taxMonth === thisMonth;
  });
}
