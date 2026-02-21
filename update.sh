#!/bin/bash

echo "🚀 最新のロックなコードを引っ張ってきます！"
git pull origin main

echo "📦 依存パッケージの更新がないか確認します..."
npm install

echo "🔄 新しい脳みそ（BOT）を再起動します！"
npx pm2 restart nina-bot

echo "✨ 完璧です！私が最新状態になりました！！"
