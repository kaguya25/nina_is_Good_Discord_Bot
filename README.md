# Discord BOT

仁菜キャラのAIトーク・ウェブ検索・技術記事配信・天気予報ができるDiscord BOT。

## 機能

| 操作 | 説明 |
| --- | --- |
| `/talk message:...` | 仁菜にトークする |
| `/articles [source] [count]` | 技術トレンド記事を取得・要約 (はてブ/Qiita/Zenn) |
| `/weather [city]` | 天気予報を表示 |
| `/morning-preview` | 朝の技術記事配信を即座にプレビュー |
| `/music` | トゲナシトゲアリの楽曲一覧やおすすめを表示 |
| BOTにメンション | 仁菜と通常会話 |
| BOTの返信にリプライ | ウェブ検索して調べてくれる |
| (自動) | 毎朝8時に3ソースの記事を配信 |
| (自動) | 30分おきにGitHubリポジトリを監視し、適当なコミットがあれば説教 |

## セットアップ

### 1. 事前準備

- [Discord Developer Portal](https://discord.com/developers/applications) でBOTを作成
  - Bot > Privileged Gateway Intents で **MESSAGE CONTENT INTENT** を有効化
  - OAuth2 > URL Generator で `bot` + `applications.commands` のスコープを選択し、サーバーに招待
- [Google AI Studio](https://aistudio.google.com/apikey) で Gemini APIキーを取得
- (任意) GitHub監視機能を使う場合は、監視対象のリポジトリと通知先チャンネルIDを確認

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` をエディタで開いて各値を記入する。GitHub監視機能を使う場合は以下も追加してください。

```env
GITHUB_WATCH_REPO=kaguya25/discord  # 監視対象リポジトリ
GITHUB_WATCH_CHANNEL_ID=1234567890  # 通知先のチャンネルID
```

### 3. インストールと起動

```bash
npm install
npm run deploy   # スラッシュコマンド登録
npm run dev      # BOT起動
```

## ファイル構成

```text
src/
├── index.js            # エントリーポイント
├── deploy-commands.js  # コマンド登録
├── commands/
│   ├── talk.js               # /talk
│   ├── articles.js           # /articles (はてブ/Qiita/Zenn)
│   ├── weather.js            # /weather
│   ├── morning-preview.js    # /morning-preview
│   └── music.js              # /music
├── services/
│   ├── gemini.js       # Gemini API (会話・検索・要約・ログレビュー)
│   ├── articles.js     # 3ソースRSS取得 + 要約
│   ├── weather.js      # 天気API
│   ├── memory.js       # 長期記憶の保存・読み込み
│   └── aiClient.js     # AIクライアントの初期化
├── data/
│   └── songs.js        # トゲナシトゲアリの楽曲データ
└── cron/
    ├── morning.js      # 朝の定期配信 (3ソース)
    └── github.js       # GitHubコミット監視
```

## 仕様詳細

本BOTはただのチャットBOTではなく、以下の高度な機能を備えています。

### 1. 文脈（メモリ）記憶機能

- **短期記憶**: Discordのチャンネル内で話された直近15件程度のメッセージをGemini APIに文脈として渡します。これにより、直前の会話や `/summarize` でBOTが出力したURLの要約内容を踏まえた自然な会話が可能です。
- **長期記憶**: 会話内容を定期的に自動で要約し、Supabaseデータベースに保存します。次回会話時に過去のあらすじとして読み込むことで、日を跨いだ文脈の維持を試みています。

### 2. URL要約とセキュリティ (`/summarize`)

指定されたウェブページのHTMLを取得し、`<script>` や `<style>` タグを除去した上でGeminiに要約させます。
セキュリティ対策として、SSRFを防ぐために `http/https` 以外のスキームや、`localhost`・プライベートIP（192.168.x.x 等）への不正なアクセスを弾く保護機構が組み込まれています。

### 3. GitHubコミット監視 (`github.js`)

指定したリポジリのコミット履歴を30分ごとにポーリングします。新しいコミットが検出されると、コミットメッセージの内容をGemini APIで評価し、「修正」のような手抜きメッセージであれば容赦なくDiscord上で説教ダイアログを流します。

### 4. 技術記事の自動配信 (`morning.js`)

毎朝8時に、はてなブックマーク（IT）、Qiita、ZennのRSSフィードを取得し、トレンド記事を1件ずつサマリー付きで指定チャンネルに自動配信します。手動で確認したい場合は `/morning-preview` コマンドを使用可能です。
