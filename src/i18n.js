/**
 * i18n（国際化）モジュール
 * 日本語・英語の切り替えを管理する
 */

const i18n = (() => {
  let currentLang = 'ja';

  /**
   * ページ上のすべての翻訳対象要素を更新する
   * @param {string} lang - 言語コード ('ja' | 'en')
   */
  function applyTranslations(lang) {
    const translations = window.locales[lang];
    if (!translations) {
      console.error(`ロケールが見つかりません: ${lang}`);
      return;
    }

    // data-i18n 属性を持つ要素を更新
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[key] !== undefined) {
        el.textContent = translations[key];
      }
    });

    // data-i18n-placeholder 属性を持つ要素のプレースホルダーを更新
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key] !== undefined) {
        el.setAttribute('placeholder', translations[key]);
      }
    });

    // ページタイトルを更新
    if (translations.title) {
      document.title = translations.title;
    }

    // html要素のlang属性を更新（アクセシビリティ対応）
    document.documentElement.setAttribute('lang', lang);
  }

  /**
   * 言語を変更する
   * @param {string} lang - 言語コード ('ja' | 'en')
   */
  function setLanguage(lang) {
    if (lang === currentLang) return;
    if (!window.locales[lang]) {
      console.error(`サポートされていない言語: ${lang}`);
      return;
    }

    // フェードアウト
    document.body.classList.add('lang-transitioning');

    setTimeout(() => {
      currentLang = lang;

      // 翻訳を適用
      applyTranslations(lang);

      // ボタンのアクティブ状態を更新
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.getElementById(`lang-${lang}`);
      if (activeBtn) activeBtn.classList.add('active');

      // フェードイン
      document.body.classList.remove('lang-transitioning');

      // ローカルストレージに言語設定を保存
      try {
        localStorage.setItem('preferredLanguage', lang);
      } catch (e) {
        // プライベートモード等でlocalStorageが使えない場合は無視
      }
    }, 150);
  }

  /**
   * 現在の言語を取得する
   * @returns {string}
   */
  function getCurrentLanguage() {
    return currentLang;
  }

  /**
   * 初期化処理
   */
  function init() {
    // 保存済みの言語設定を読み込む
    let savedLang = 'ja';
    try {
      savedLang = localStorage.getItem('preferredLanguage') || 'ja';
    } catch (e) {
      // localStorageが使えない場合はデフォルト
    }

    // ブラウザの言語設定も考慮する
    if (!localStorage.getItem('preferredLanguage')) {
      const browserLang = navigator.language || navigator.userLanguage || 'ja';
      savedLang = browserLang.startsWith('ja') ? 'ja' : 'en';
    }

    currentLang = (savedLang === 'en') ? 'en' : 'ja';
    applyTranslations(currentLang);

    // ボタンの初期状態を設定
    const activeBtn = document.getElementById(`lang-${currentLang}`);
    if (activeBtn) {
      document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
    }
  }

  return { setLanguage, getCurrentLanguage, init };
})();

// グローバルに公開
window.setLanguage = i18n.setLanguage.bind(i18n);

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  i18n.init();
});
