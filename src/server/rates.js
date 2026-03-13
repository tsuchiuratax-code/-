import { addRate, getLatestRates, getRateChanges } from './database.js';

// 2025年度の社会保険料率データ（サンプル）
// 実際の運用時は厚生労働省・日本年金機構などの公式データに更新してください
const SAMPLE_RATES = [
  // 健康保険
  {
    category: '健康保険',
    rateName: '一般保険料率（協会けんぽ・東京）',
    ratePercent: 9.98,
    employerShare: 4.99,
    employeeShare: 4.99,
    effectiveDate: '2025-03-01',
  },
  {
    category: '健康保険',
    rateName: '介護保険料率',
    ratePercent: 1.60,
    employerShare: 0.80,
    employeeShare: 0.80,
    effectiveDate: '2025-03-01',
  },
  // 厚生年金保険
  {
    category: '厚生年金保険',
    rateName: '厚生年金保険料率',
    ratePercent: 18.30,
    employerShare: 9.15,
    employeeShare: 9.15,
    effectiveDate: '2017-09-01',
  },
  // 雇用保険
  {
    category: '雇用保険',
    rateName: '雇用保険料率（一般の事業）',
    ratePercent: 1.55,
    employerShare: 0.95,
    employeeShare: 0.60,
    effectiveDate: '2025-04-01',
  },
  // 労災保険
  {
    category: '労災保険',
    rateName: '労災保険料率（その他の各種事業）',
    ratePercent: 0.30,
    employerShare: 0.30,
    employeeShare: 0,
    effectiveDate: '2024-04-01',
  },
  // 子ども・子育て拠出金
  {
    category: 'その他',
    rateName: '子ども・子育て拠出金率',
    ratePercent: 0.36,
    employerShare: 0.36,
    employeeShare: 0,
    effectiveDate: '2024-04-01',
  },
];

/**
 * サンプルデータで初期料率を登録する
 */
export function seedRates() {
  const existing = getLatestRates();
  if (existing.length > 0) {
    console.log('料率データは既に登録されています。');
    return;
  }

  for (const rate of SAMPLE_RATES) {
    addRate(
      rate.category,
      rate.rateName,
      rate.ratePercent,
      rate.employerShare,
      rate.employeeShare,
      rate.effectiveDate
    );
  }
  console.log(`${SAMPLE_RATES.length}件の料率データを登録しました。`);
}

/**
 * 新しい料率を登録する（変更があれば通知対象になる）
 */
export function registerNewRate(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate) {
  const result = addRate(category, rateName, ratePercent, employerShare, employeeShare, effectiveDate);
  console.log(`新しい料率を登録しました: ${category} - ${rateName} = ${ratePercent}% (施行日: ${effectiveDate})`);
  return result;
}

/**
 * 直近の料率変更を取得する
 */
export function getRecentChanges(days = 90) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString().split('T')[0];
  return getRateChanges(since);
}

/**
 * 現在の全料率を表示する
 */
export function displayCurrentRates() {
  const rates = getLatestRates();
  console.log('\n=== 現在の社会保険料率 ===\n');

  let currentCategory = '';
  for (const rate of rates) {
    if (rate.category !== currentCategory) {
      currentCategory = rate.category;
      console.log(`\n【${currentCategory}】`);
    }
    console.log(`  ${rate.rate_name}: ${rate.rate_percent}%`);
    if (rate.employer_share !== null) {
      console.log(`    事業主負担: ${rate.employer_share}% / 被保険者負担: ${rate.employee_share}%`);
    }
    console.log(`    施行日: ${rate.effective_date}`);
  }
}
