# 日本語サポート デモ

日本語と英語の両方に対応したWebアプリケーションのデモです。

## 機能

- 🌐 **多言語対応**: 日本語・英語のリアルタイム切り替え
- 📝 **日本語入力**: ひらがな・カタカナ・漢字の完全サポート
- 🔤 **フォント最適化**: 日本語フォントを最適化した読みやすい表示
- 💾 **言語設定の保存**: ブラウザのローカルストレージに言語設定を保存
- ♿ **アクセシビリティ**: `lang` 属性による適切なHTML言語設定

## ファイル構成

```
.
├── index.html          # メインHTMLファイル
├── src/
│   ├── style.css       # スタイルシート（日本語フォント対応）
│   ├── i18n.js         # 国際化モジュール
│   └── app.js          # アプリケーションロジック
├── locales/
│   ├── ja.js           # 日本語ロケール
│   └── en.js           # 英語ロケール
└── README.md
```

## 使い方

1. `index.html` をブラウザで開く
2. 右上の言語ボタン（日本語 / English）で言語を切り替える
3. テキスト入力欄に日本語や英語を入力して「送信」ボタンをクリック

## 日本語サポートの実装ポイント

### フォント設定

```css
font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP',
             'Yu Gothic', 'Meiryo', sans-serif;
```

macOS・Windows・Linux・モバイル各環境に対応した日本語フォントスタックを使用。

### 文字の折り返し

```css
word-break: break-all;
overflow-wrap: break-word;
```

日本語テキストの適切な折り返し処理を設定。

### IME対応

```css
ime-mode: active;
```

テキストエリアで日本語IMEを自動的にアクティブにする設定。

### `lang` 属性

```html
<html lang="ja">
```

言語切り替え時にHTML要素の `lang` 属性も動的に更新。

## ブラウザサポート

- Google Chrome（最新版）
- Mozilla Firefox（最新版）
- Safari（最新版）
- Microsoft Edge（最新版）
