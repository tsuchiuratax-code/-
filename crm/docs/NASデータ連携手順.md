# NAS（\\192.168.1.250\disk1）とCRMシステムの連携手順

## 概要

NASは社内LAN専用のため、クラウド（Google Apps Script）から直接アクセスはできません。
以下の2つの方法でNASのデータをCRMに取り込みます。

---

## 方法A：手動でGoogleドライブ経由（推奨・簡単）

```
NAS → PCで開く → Googleドライブにアップロード → CRMで取り込む
```

### 手順

1. **PCでNASのファイルを開く**
   - エクスプローラーで `\\192.168.1.250\disk1` を開く
   - 必要なファイルを選択（顧問先一覧.xls、メールアドレス一覧.xlsm、CSVなど）

2. **GoogleドライブにアップロードまたはGoogleスプレッドシートに変換**
   - [drive.google.com](https://drive.google.com) を開く
   - 「＋ 新規」→「ファイルのアップロード」でファイルを選択
   - Excelファイルは右クリック→「Googleスプレッドシートで開く」で変換可能

3. **CRMのスプレッドシートに貼り付け**
   - CRM用スプレッドシートを開く
   - 新しいシートを追加（例：「顧問先一覧」「メールアドレス一覧」）
   - Googleスプレッドシートからコピーして貼り付け

4. **GASでインポート実行**
   ```
   Apps Script エディタ → 関数を選択 → 実行

   顧問先一覧の取り込み：   importCustomersFromSheet()
   メールアドレスの取り込み：mergeEmailAddresses()
   ```

---

## 方法B：自動同期スクリプト（PC常時起動が必要）

PCに常駐する小さなPythonスクリプトを使って、
NASの変更を自動的にGoogleドライブに同期します。

### 必要なもの
- Python 3.x（インストール済みであること）
- Google Drive API認証情報

### セットアップ手順

1. `nas-sync/requirements.txt` の依存パッケージをインストール
   ```
   pip install google-api-python-client google-auth-oauthlib watchdog
   ```

2. Google Cloud ConsoleでDrive APIを有効化し、`credentials.json` を取得
   - [console.cloud.google.com](https://console.cloud.google.com)
   - APIs & Services → Google Drive API → 認証情報

3. `nas-sync/config.json` を設定（次のページ参照）

4. スクリプトを起動
   ```
   python nas_sync.py
   ```
   ※ Windowsのタスクスケジューラでログイン時に自動起動できます

---

## 対象ファイルと更新タイミング

| ファイル | 保存場所（NAS） | 更新タイミング | 取り込み方法 |
|---|---|---|---|
| ☆顧問先一覧.xls | \\192.168.1.250\disk1\顧客管理\ | 顧客追加・変更時 | importCustomersFromSheet() |
| メールアドレス一覧表.xlsm | \\192.168.1.250\disk1\顧客管理\ | メール変更時 | mergeEmailAddresses() |
| syukei-hosyu-*.csv | \\192.168.1.250\disk1\報酬管理\ | 毎月 | importFeeFromCsv(fileId) |
| 事務所通信テキスト | \\192.168.1.250\disk1\通信\ | 毎月作成時 | CRM画面から貼り付け |
| 確定申告関連PDF | \\192.168.1.250\disk1\申告資料\ | 申告シーズン | 別途Google Driveに保存 |

---

## NASの確定申告PDFをGoogleドライブで共有する

確定申告の案内書・チェックリストなどのPDFは：

1. GoogleドライブにPDFをアップロード
2. 共有リンクを取得（「リンクを知っている全員」に設定）
3. 事務所通信の本文にリンクを貼り付けてメール配信

```
例：事務所通信本文
-------
確定申告に必要な書類はこちらからご確認ください。
▶ 必要書類チェックリスト：https://drive.google.com/...
▶ 資料お預けのお願い：https://drive.google.com/...
-------
```

---

## 今後の拡張案

NASのデータを完全に自動同期したい場合は、以下の構成で実現できます：

```
NAS (\\192.168.1.250\disk1)
    ↓ （監視スクリプト：ファイル変更を検知）
PC常駐プログラム
    ↓ （Google Drive API）
Googleドライブ（共有フォルダ）
    ↓ （Apps Script トリガー：1日1回）
CRMスプレッドシート（自動更新）
```

ご希望の場合はお申し付けください。
