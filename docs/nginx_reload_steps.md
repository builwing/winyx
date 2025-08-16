# Nginx 403エラー解決手順

## 問題
IP制限をコメントアウトしたが、Nginxが古い設定をキャッシュしている

## 解決手順

### 1. 現在の設定を確認
```bash
# 36行目がコメントアウトされていることを確認
sudo vim /etc/nginx/sites-available/winyx
# 36行目: #include /etc/nginx/conf.d/allowed_ips.conf;
```

### 2. Nginxを完全に再起動（reloadではなくrestart）
```bash
# 設定のシンタックスチェック
sudo nginx -t

# Nginxを完全に再起動
sudo systemctl restart nginx

# ステータス確認
sudo systemctl status nginx
```

### 3. 新しいリクエストでテスト
```bash
# ブラウザのキャッシュをクリア（Ctrl+Shift+R）
# または別のブラウザ/プライベートウィンドウでアクセス
```

### 4. それでも403の場合、他の可能性を確認

#### 4.1 ディレクトリのインデックスリスト問題
Swagger UIのlocation設定を修正：

```nginx
location /swagger/ {
    alias /var/www/winyx/backend/swagger/;
    index index.html;
    autoindex off;
    try_files $uri $uri/index.html =404;
}
```

#### 4.2 デバッグログを有効化
```bash
sudo vim /etc/nginx/sites-available/winyx
# error_log行を以下に変更：
error_log /var/log/nginx/winyx_error.log debug;
```

### 5. 確認用curl コマンド
```bash
# ローカルからのアクセステスト
curl -I https://winyx.jp/swagger/

# 詳細なデバッグ
curl -v https://winyx.jp/swagger/
```