# Nginx 403エラーのデバッグ手順

## 現状の問題
- IP制限設定をコメントアウトし、Nginxを再起動済み
- それでも403エラーが継続

## デバッグステップ

### 1. Nginxの設定をテストモードで詳細確認
```bash
# 現在の設定ファイルの問題箇所を確認
sudo nginx -T | grep -A5 -B5 "location /swagger"
```

### 2. エラーログレベルをdebugに変更
```bash
sudo vim /etc/nginx/sites-available/winyx

# 40行目付近のerror_log行を以下に変更：
error_log /var/log/nginx/winyx_error.log debug;
```

### 3. Swagger UIのlocation設定を完全に書き換え
```bash
sudo vim /etc/nginx/sites-available/winyx

# 80-92行目のlocation /swagger/を以下に置き換え：
location /swagger/ {
    alias /var/www/winyx/backend/swagger/;
    index index.html;
    
    # デバッグ用の詳細設定
    try_files $uri $uri/ @swagger_fallback;
}

location @swagger_fallback {
    rewrite ^/swagger/(.*)$ /swagger/index.html last;
}
```

### 4. 設定を適用してテスト
```bash
sudo nginx -t
sudo systemctl reload nginx

# 新しいリクエストでテスト
curl -v https://winyx.jp/swagger/
```

### 5. デバッグログを確認
```bash
tail -f /var/log/nginx/winyx_error.log
```

## 最後の手段：一時的なIP制限完全無効化テスト

全てのIP制限を一時的に無効化してテスト：

```bash
# すべてのIP制限ファイルを一時的にリネーム
sudo mv /etc/nginx/conf.d/allowed_ips.conf /etc/nginx/conf.d/allowed_ips.conf.bak
sudo mv /etc/nginx/conf.d/api_allowed_ips.conf /etc/nginx/conf.d/api_allowed_ips.conf.bak

# Nginxを再起動
sudo systemctl restart nginx
```