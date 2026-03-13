# 社会保険料率変更 自動通知システム

顧客先に社会保険料率の変更をメールで自動通知するNode.jsアプリケーションです。

## 機能

- **料率管理**: 健康保険・厚生年金・雇用保険・労災保険などの料率をデータベースで管理
- **変更検知**: 新しい料率が登録されると、変更前との差分を自動検出
- **自動メール通知**: 料率変更があった際に、登録された全顧客へHTML形式のメールを送信
- **定期実行**: cronスケジュールで定期的に通知を実行（デフォルト: 毎月1日 9:00）
- **CLIツール**: コマンドラインから顧客管理・料率確認・手動通知が可能

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集してSMTP設定を入力してください。
Gmailを使用する場合は[アプリパスワード](https://support.google.com/accounts/answer/185833)が必要です。

### 3. 起動

```bash
# 常駐サービスとして起動（cronスケジュールで自動通知）
npm start

# 現在の料率を確認
npm run check-rates

# 手動で通知を送信
npm run send-notifications
```

## CLIコマンド

```bash
# 顧客を追加
node src/server/cli.js add-client "株式会社サンプル" "山田太郎" "yamada@example.com"

# 顧客一覧を表示
node src/server/cli.js list-clients

# 新しい料率を登録（変更として通知される）
node src/server/cli.js add-rate "健康保険" "一般保険料率（協会けんぽ・東京）" 10.00 5.00 5.00 "2026-03-01"

# 現在の料率と変更を確認
node src/server/cli.js check

# 未通知の料率変更をメール送信
node src/server/cli.js notify

# 全料率一覧を全顧客にメール送信
node src/server/cli.js summary

# SMTP接続テスト
node src/server/cli.js test-smtp
```

## 登録済みの料率カテゴリ（サンプル）

| カテゴリ | 料率名 | 料率 | 事業主 | 被保険者 |
|---------|--------|------|--------|---------|
| 健康保険 | 一般保険料率（協会けんぽ・東京） | 9.98% | 4.99% | 4.99% |
| 健康保険 | 介護保険料率 | 1.60% | 0.80% | 0.80% |
| 厚生年金保険 | 厚生年金保険料率 | 18.30% | 9.15% | 9.15% |
| 雇用保険 | 雇用保険料率（一般の事業） | 1.55% | 0.95% | 0.60% |
| 労災保険 | 労災保険料率（その他の各種事業） | 0.30% | 0.30% | 0% |
| その他 | 子ども・子育て拠出金率 | 0.36% | 0.36% | 0% |

## ファイル構成

```
.
├── package.json
├── .env.example            # 環境変数テンプレート
├── .gitignore
├── README.md
├── data/                   # SQLiteデータベース（自動生成）
├── src/
│   └── server/
│       ├── index.js        # メインエントリーポイント（cronサービス）
│       ├── cli.js          # CLIツール
│       ├── config.js       # 設定管理
│       ├── database.js     # データベース（SQLite）操作
│       ├── mailer.js       # メール送信
│       ├── notification.js # 通知ロジック
│       ├── rates.js        # 料率データ管理
│       └── templates/
│           └── rate-change.html  # メールテンプレート
├── index.html              # 日本語デモUI
├── src/
│   ├── app.js / i18n.js / style.css
└── locales/
    ├── ja.js / en.js
```

## 技術スタック

- **Node.js** (ES Modules)
- **better-sqlite3**: 軽量SQLiteデータベース
- **nodemailer**: メール送信
- **node-cron**: 定期実行スケジューラー
