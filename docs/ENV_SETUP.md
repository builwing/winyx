# 環境変数設定ガイド

## 概要
Winyxプロジェクトでは、機密情報を`.env`ファイルで管理します。

## セットアップ手順

### 1. .envファイルの作成
```bash
# .env.exampleをコピー
cp /var/www/winyx/.env.example /var/www/winyx/.env

# .envファイルを編集
vim /var/www/winyx/.env
```

### 2. 環境変数の設定
以下の値を実際の環境に合わせて更新：

- `DB_PASSWORD`: データベースのパスワード
- `REDIS_PASSWORD`: Redisのパスワード（必要な場合）
- `JWT_SECRET`: JWT用の秘密鍵（256bit推奨）
- `MYSQL_ROOT_PASSWORD`: rootパスワード（初期設定時のみ）

### 3. データベースセットアップ
```bash
# データベースとテーブルを作成
/var/www/winyx/scripts/setup_database.sh
```

### 4. アプリケーション設定の生成
```bash
# .envから設定ファイルを生成
/var/www/winyx/backend/test_api/load_env.sh

# 生成された設定を確認
cat /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

## 使用方法

### アプリケーション起動時
```bash
# 設定を読み込んでから起動
cd /var/www/winyx/backend/test_api
./load_env.sh
go run testapi.go -f etc/test_api-api.yaml
```

### systemdサービスとして運用する場合
```ini
[Service]
EnvironmentFile=/var/www/winyx/.env
ExecStartPre=/var/www/winyx/backend/test_api/load_env.sh
ExecStart=/var/www/winyx/backend/test_api/test_api -f /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

## セキュリティ注意事項

1. `.env`ファイルは**絶対にGitにコミットしない**
2. 本番環境では適切なファイル権限を設定
   ```bash
   chmod 600 /var/www/winyx/.env
   ```
3. パスワードは定期的に変更
4. JWT秘密鍵は十分な長さ（256bit以上）を使用

## トラブルシューティング

### データベース接続エラー
```bash
# 接続テスト
mysql -h 127.0.0.1 -u winyx_app -p'YOUR_PASSWORD' -D winyx_core -e "SELECT 1;"
```

### 環境変数が読み込まれない
```bash
# 環境変数の確認
source /var/www/winyx/.env
echo $DB_USERNAME
```