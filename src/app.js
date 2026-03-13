/**
 * アプリケーションメインスクリプト
 * テキスト入力デモの機能を管理する
 */

// 文字数カウント
const textarea = document.getElementById('text-input');
const countEl = document.getElementById('count');

if (textarea && countEl) {
  textarea.addEventListener('input', () => {
    countEl.textContent = textarea.value.length;
  });
}

// 送信ボタン処理
function handleSubmit() {
  const text = textarea ? textarea.value.trim() : '';
  const output = document.getElementById('output');
  const outputText = document.getElementById('output-text');

  if (!text) return;

  if (output && outputText) {
    outputText.textContent = text;
    output.style.display = 'block';
    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Enterキーでの送信をサポート（Shift+Enterで改行）
if (textarea) {
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });
}
