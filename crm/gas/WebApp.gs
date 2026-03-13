/**
 * Web アプリ エントリーポイント
 * GASのdoGet/doPost関数
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('林税理士社労士事務所 CRM')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * フロントエンドからのAPI呼び出しを処理する
 */
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const data = params.data || {};

  try {
    let result;
    switch (action) {
      // 顧客
      case 'getCustomers':         result = getCustomers(data); break;
      case 'getCustomerById':      result = getCustomerById(data.customerId); break;
      case 'createCustomer':       result = createCustomer(data); break;
      case 'updateCustomer':       result = updateCustomer(data.customerId, data); break;

      // 面談
      case 'saveMeeting':          result = saveMeeting(data); break;
      case 'getMeetingsByCustomer':result = getMeetingsByCustomer(data.customerId); break;

      // カレンダー
      case 'getUpcomingEvents':    result = getUpcomingEvents(); break;
      case 'syncDeadlines':        result = syncDeadlinesToCalendar(); break;

      // 事務所通信
      case 'saveNewsletter':       result = saveNewsletter(data); break;
      case 'getNewsletters':       result = getNewsletters(); break;
      case 'sendNewsletter':       result = sendNewsletter(data.newsletterId); break;

      // 設定
      case 'getSettings':          result = getSettings(); break;
      case 'getConfig':            result = {
        contractTypes: CONFIG.CONTRACT_TYPES,
        serviceTypes: CONFIG.SERVICE_TYPES,
        staff: CONFIG.STAFF,
      }; break;

      default: throw new Error('不明なアクション: ' + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('エラー: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTMLファイルをインクルードする（CSSやJSを分離する際に使用）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
