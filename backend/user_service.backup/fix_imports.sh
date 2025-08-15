#!/bin/bash

# Go-Zero生成ファイルのインポートパスを修正するスクリプト

echo "修正中: インポートパスを github.com/winyx/backend/user_service から user_service に変更..."

# すべての.goファイルでインポートパスを置換
find . -name "*.go" -type f -exec sed -i 's|github\.com/winyx/backend/user_service|user_service|g' {} \;

echo "修正完了: インポートパスを修正しました"

# 修正結果の確認
echo "修正されたファイル一覧:"
grep -r "user_service/internal" . --include="*.go" | cut -d: -f1 | sort | uniq