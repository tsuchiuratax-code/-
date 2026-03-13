/**
 * Google カレンダー連携サービス
 * 面談・申告期限などのスケジュール管理
 */

// ── 面談をカレンダーに登録 ──────────────────────────────────────────
/**
 * 面談をGoogleカレンダーに登録する
 * @param {Object} meetingData
 * @returns {string} カレンダーイベントID
 */
function addMeetingToCalendar(meetingData) {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID)
    || CalendarApp.getDefaultCalendar();

  const title = `【面談】${meetingData['法人名／氏名']}（${meetingData.担当者}）`;
  const startTime = new Date(meetingData.面談日);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1時間後

  const description = [
    `顧客ID: ${meetingData.顧客ID}`,
    `面談種別: ${meetingData.面談種別}`,
    `内容: ${meetingData.内容 || ''}`,
  ].join('\n');

  const event = calendar.createEvent(title, startTime, endTime, {
    description,
    location: meetingData.面談種別 === '訪問' ? meetingData.住所 || '' : '事務所',
  });

  return event.getId();
}

/**
 * 次回面談予定をカレンダーに登録する
 * @param {Object} meetingData
 * @returns {string} カレンダーイベントID
 */
function addNextMeetingToCalendar(meetingData) {
  if (!meetingData.次回予定日) return null;

  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID)
    || CalendarApp.getDefaultCalendar();

  const title = `【次回面談予定】${meetingData['法人名／氏名']}`;
  const startTime = new Date(meetingData.次回予定日);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const event = calendar.createEvent(title, startTime, endTime, {
    description: `顧客ID: ${meetingData.顧客ID}\n担当: ${meetingData.担当者}`,
  });

  return event.getId();
}

// ── 申告期限をカレンダーに一括登録 ──────────────────────────────────────────
/**
 * 全顧客の申告期限をカレンダーに登録する
 * （年次バッチ処理として実行）
 */
function syncDeadlinesToCalendar() {
  const customers = getCustomers(null);
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID)
    || CalendarApp.getDefaultCalendar();
  const year = new Date().getFullYear();
  let count = 0;

  customers.forEach(customer => {
    const fiscalMonth = parseInt(customer['決算期（月）']);
    if (!fiscalMonth) return;

    const name = customer['法人名／氏名'];
    const customerId = customer.顧客ID;

    // 法人税申告期限（決算月の2ヶ月後）
    const taxDeadlineMonth = (fiscalMonth + 1) % 12 || 12;
    const taxDeadlineYear = fiscalMonth >= 11 ? year + 1 : year;
    const taxDeadline = new Date(taxDeadlineYear, taxDeadlineMonth - 1, 15, 17, 0);

    const taxTitle = `【申告期限】${name} 法人税`;
    createDeadlineEvent(calendar, taxTitle, taxDeadline, customerId);
    count++;

    // 社会保険の顧客は算定基礎届（7月1日締切）もカレンダー登録
    if (['社労士契約', '双方契約'].includes(customer.契約種別)) {
      const santeiTitle = `【期限】${name} 算定基礎届`;
      const santeiDeadline = new Date(year, 6, 1, 17, 0); // 7月1日
      createDeadlineEvent(calendar, santeiTitle, santeiDeadline, customerId);
      count++;
    }
  });

  return `${count}件のカレンダーイベントを登録しました`;
}

function createDeadlineEvent(calendar, title, date, customerId) {
  const endDate = new Date(date.getTime() + 30 * 60 * 1000); // 30分
  calendar.createEvent(title, date, endDate, {
    description: `顧客ID: ${customerId}\nCRMシステムから自動登録`,
    color: CalendarApp.EventColor.RED,
  });
}

// ── 来月の面談スケジュール取得 ──────────────────────────────────────────
/**
 * 今後30日のカレンダーイベントを取得する
 * @returns {Array}
 */
function getUpcomingEvents() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID)
    || CalendarApp.getDefaultCalendar();

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const events = calendar.getEvents(now, in30Days);
  return events.map(e => ({
    id:       e.getId(),
    title:    e.getTitle(),
    start:    Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    end:      Utilities.formatDate(e.getEndTime(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    desc:     e.getDescription(),
  }));
}

// ── 面談履歴のシートへの保存 ──────────────────────────────────────────
/**
 * 面談履歴を保存し、カレンダーにも登録する
 * @param {Object} meetingData
 * @returns {string} 面談ID
 */
function saveMeeting(meetingData) {
  const sheet = getSheet(CONFIG.SHEETS.MEETINGS);
  const meetingId = 'M' + Date.now();
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  // カレンダーに登録
  let calendarEventId = '';
  try {
    calendarEventId = addMeetingToCalendar({
      ...meetingData,
      面談日: meetingData.面談日,
    });
    // 次回予定があればそれも登録
    if (meetingData.次回予定日) {
      addNextMeetingToCalendar(meetingData);
    }
  } catch (e) {
    Logger.log('カレンダー登録エラー: ' + e.message);
  }

  sheet.appendRow([
    meetingId,
    meetingData.顧客ID,
    meetingData['法人名／氏名'],
    meetingData.面談日,
    meetingData.担当者,
    meetingData.面談種別,
    meetingData.内容,
    meetingData.次回予定日 || '',
    calendarEventId ? 'TRUE' : 'FALSE',
    now,
  ]);

  return meetingId;
}

/**
 * 顧客の面談履歴を取得する
 * @param {string} customerId
 * @returns {Array}
 */
function getMeetingsByCustomer(customerId) {
  const sheet = getSheet(CONFIG.SHEETS.MEETINGS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  return data.slice(1)
    .filter(row => row[1].toString() === customerId.toString())
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
    .sort((a, b) => new Date(b.面談日) - new Date(a.面談日));
}
