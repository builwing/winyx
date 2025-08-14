# Nginx設定デプロイ手順

## 概要
第10章第5節で作成したNginx設定を本番環境に適用するための手順書です。

## 前提条件
- sudo権限を持つユーザーでログインしていること
- Nginxがインストール済みであること
- UserServiceが構築済みであること

## デプロイ手順

### 1. 設定ファイルの確認
```bash
# 設定ファイルが作成されていることを確認
ls -la /var/www/winyx/nginx_user_service_config.conf

# 設定内容を確認
cat /var/www/winyx/nginx_user_service_config.conf
```

### 2. 自動適用スクリプトの実行
```bash
# スクリプトを実行（sudo権限が必要）
sudo /var/www/winyx/scripts/apply_nginx_config.sh
```

### 3. 手動適用（スクリプトが使用できない場合）

#### 3.1 設定ファイルのコピー
```bash
# 既存設定のバックアップ
sudo cp /etc/nginx/sites-available/winyx /etc/nginx/sites-available/winyx.backup.$(date +%Y%m%d)

# 新しい設定をコピー
sudo cp /var/www/winyx/nginx_user_service_config.conf /etc/nginx/sites-available/winyx
```

#### 3.2 設定の検証
```bash
# Nginx設定の構文チェック
sudo nginx -t
```

#### 3.3 Nginxのリロード
```bash
# 設定を反映
sudo systemctl reload nginx

# ステータス確認
sudo systemctl status nginx
```

## 適用される変更内容

### 追加されるアップストリーム
- `user_service`: UserServiceマイクロサービス（ポート8889）
- `backend_api`: 既存のTestAPIサービス（ポート8888）

### 新しいルーティング
- `/api/v1/users/` → UserServiceへプロキシ
- `/api/v1/admin/` → UserService管理機能へプロキシ
- その他 → 既存のbackend_apiへプロキシ

### セキュリティ設定
- IPアドレス制限（許可されたIPのみアクセス可能）
- CORS設定（winyx.jpからのアクセスを許可）
- セキュリティヘッダー追加

## 動作確認

### 1. Nginxの動作確認
```bash
# Nginxのプロセス確認
ps aux | grep nginx

# リスニングポート確認
sudo netstat -tlnp | grep :80
```

### 2. UserServiceへのプロキシ確認
```bash
# ヘルスチェック
curl -i http://api.winyx.jp/api/v1/users/health

# レスポンスヘッダー確認
curl -I http://api.winyx.jp/api/v1/users/
```

### 3. ログの確認
```bash
# アクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log
```

## トラブルシューティング

### 問題: 502 Bad Gateway
**原因**: UserServiceが起動していない
**解決方法**:
```bash
sudo systemctl start winyx-user-service
sudo systemctl status winyx-user-service
```

### 問題: 403 Forbidden
**原因**: IPアドレス制限に引っかかっている
**解決方法**: 
- 許可IPリストに自分のIPを追加
- 設定ファイルの `allow` ディレクティブを確認

### 問題: CORS エラー
**原因**: フロントエンドのドメインが許可されていない
**解決方法**:
- `Access-Control-Allow-Origin` ヘッダーの値を確認
- 開発環境の場合は `http://localhost:3000` を追加

## ロールバック手順

設定に問題が発生した場合のロールバック手順：

```bash
# バックアップから復元
sudo cp /etc/nginx/sites-available/winyx.backup.[日付] /etc/nginx/sites-available/winyx

# 設定の検証
sudo nginx -t

# Nginxのリロード
sudo systemctl reload nginx
```

## セキュリティ注意事項

1. **IPアドレス制限**: 本番環境では必ず適切なIPアドレス制限を設定してください
2. **HTTPS化**: 本番環境ではSSL/TLS証明書を設定し、HTTPS化してください
3. **レート制限**: DDoS攻撃対策として、適切なレート制限を設定してください

## 関連ファイル

- Nginx設定ファイル: `/var/www/winyx/nginx_user_service_config.conf`
- 適用スクリプト: `/var/www/winyx/scripts/apply_nginx_config.sh`
- APIゲートウェイ設定: `/var/www/winyx/backend/gateway/nginx_api_gateway.conf`
- プロキシ共通設定: `/var/www/winyx/backend/gateway/proxy_params.conf`

## 次のステップ

1. UserServiceのsystemdサービスを起動
2. フロントエンドのビルドとデプロイ
3. エンドツーエンドのテスト実施
4. 監視とログ収集の設定