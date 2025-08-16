# Winyx Nginx仕様書

> WinyxプロジェクトのNginx設定とリバースプロキシ構成について、実際の運用設定に基づいて記載した仕様書です。

---

## 概要

### 目的

WinyxプロジェクトのNginxは以下の役割を担います：

- **リバースプロキシ**: バックエンドAPIサービスへのプロキシ
- **静的ファイル配信**: Next.jsビルド済みファイルの配信
- **SSL/TLS終端**: HTTPS暗号化とセキュリティ強化
- **IP制限**: 特定IPアドレスからのアクセス制御
- **レート制限**: DDoS攻撃やAPI乱用の防止

---

## アーキテクチャ

### 現在の構成

```
                    ┌─────────────────────────────────────┐
                    │              Internet               │
                    └─────────────┬───────────────────────┘
                                  │ HTTPS/HTTP
                                  ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    Nginx (Port: 80/443)                │
    │  ┌───────────────┬─────────────────────────────────────┐  │
    │  │   winyx.jp    │            api.winyx.jp             │  │
    │  │  (メインサイト)  │           (API専用)                │  │
    │  └───────────────┴─────────────────────────────────────┘  │
    └─────────────┬───────────────┬───────────────────────────┘
                  │               │
    ┌─────────────▼───────────────▼───────────────────────────┐
    │                    Backend Services                    │
    │  ┌─────────────┐                                       │
    │  │UserService  │                                       │
    │  │REST API     │                                       │
    │  │(Port: 8888) │                                       │
    │  └─────────────┘                                       │
    └─────────────────────────────────────────────────────────┘
```

---

## ポート番号マップ

### 🎯 アプリケーションサービス
| ポート | サービス | 公開範囲 | 説明 |
|--------|----------|----------|------|
| **8888** | UserService REST API | Nginx経由のみ | 認証・ユーザー管理・組織管理 |
| **9090** | UserService RPC | 内部通信のみ | 高速内部通信（外部公開禁止） |

### 🌐 Webサーバー・フロントエンド
| ポート | サービス | 公開範囲 | 説明 |
|--------|----------|----------|------|
| **80** | Nginx HTTP | 外部公開 | HTTPSリダイレクト専用 |
| **443** | Nginx HTTPS | 外部公開 | メイン公開ポート（SSL/TLS） |
| **3000** | Next.js Dev Server | 開発環境のみ | 開発時のホットリロード |

### 🗄️ データベース・キャッシュ
| ポート | サービス | 公開範囲 | 説明 |
|--------|----------|----------|------|
| **3306** | MariaDB | ローカルのみ | winyx_core, winyx_task, winyx_mem |
| **6379** | Redis | ローカルのみ | セッション・キャッシュ・メトリクス |

---

## サブドメイン構成

### メインサイト (winyx.jp)

- **用途**: Webフロントエンド、メインAPI
- **対象**: 一般ユーザー、Webアプリケーション
- **特徴**: 
  - Next.js静的ファイル配信
  - REST API プロキシ
  - Swagger UI ドキュメント
  - IPアドレス制限あり

### API専用サブドメイン (api.winyx.jp)

- **用途**: API専用アクセス
- **対象**: 外部システム、専用クライアント
- **特徴**:
  - APIへの直接アクセス
  - より厳格なIP制限
  - CORS設定
  - 低いレート制限

---

## Nginx設定ファイル

### メイン設定ファイル構成

#### `/etc/nginx/conf.d/nginx_upstream.conf` (Upstream定義)

```nginx
# Winyx Upstream Configuration
# このファイルは /etc/nginx/conf.d/ に配置してください

# バックエンドAPIのアップストリーム定義
upstream winyx_backend_api {
    server 127.0.0.1:8888;
    keepalive 32;
}

# UserService のアップストリーム定義（将来の分離用）
upstream user_service {
    server 127.0.0.1:8888;
    keepalive 32;
}

# OrderService (将来実装)
upstream order_service {
    server 127.0.0.1:8890;
    keepalive 32;
}

# NotificationService (将来実装)
upstream notification_service {
    server 127.0.0.1:8892;
    keepalive 32;
}
```

#### `/etc/nginx/sites-available/winyx` (メイン設定)

```nginx
# Winyx Nginx Configuration - 実際の運用設定
# /etc/nginx/sites-available/winyx

# レート制限設定
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

# メインサイト (winyx.jp)
server {
    listen 80;
    server_name winyx.jp www.winyx.jp;
    # HTTPSへのリダイレクト
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name winyx.jp www.winyx.jp;

    # SSL設定
    ssl_certificate /etc/letsencrypt/live/winyx.jp/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/winyx.jp/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # IPアドレス制限
    include /etc/nginx/conf.d/allowed_ips.conf;

    # ログ設定
    access_log /var/log/nginx/winyx_access.log combined;
    error_log /var/log/nginx/winyx_error.log warn;

    # API プロキシ設定（統一）
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://winyx_backend_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト設定
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # APIドキュメント
    location /docs/ {
        alias /var/www/winyx/docs/swagger-ui/;
        try_files $uri $uri/ /index.html;
    }

    # フロントエンド静的ファイル
    root /var/www/winyx/frontend/out;
    index index.html;

    # 静的ファイルのキャッシュ設定
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPAのフォールバック
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        rewrite ^.*$ /index.html last;
    }
}

# API専用サブドメイン (api.winyx.jp)
server {
    listen 443 ssl http2;
    server_name api.winyx.jp;

    # SSL設定（メインと同じ）
    ssl_certificate /etc/letsencrypt/live/winyx.jp/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/winyx.jp/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # IPアドレス制限（より厳格）
    include /etc/nginx/conf.d/api_allowed_ips.conf;

    # APIへのプロキシ
    location / {
        limit_req zone=api_limit burst=10 nodelay;

        proxy_pass http://winyx_backend_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS設定
        add_header 'Access-Control-Allow-Origin' 'https://winyx.jp' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }
}
```

---

## セキュリティ設定

### IP制限設定ファイル

#### `/etc/nginx/conf.d/allowed_ips.conf`
```nginx
# Winyx IPアドレス制限設定
allow 202.79.96.61;     # 会社のIPアドレス
allow 101.111.202.127;  # 自宅のIPアドレス
deny all;               # 上記以外は全て拒否
```

#### `/etc/nginx/conf.d/api_allowed_ips.conf`
```nginx
# API専用IPアドレス制限（より厳格）
allow 202.79.96.61;     # 会社のIPアドレス
deny all;               # 会社IP以外は全て拒否
```

### セキュリティヘッダー

| ヘッダー | 値 | 目的 |
|----------|-----|------|
| `Strict-Transport-Security` | `max-age=63072000` | HTTPS強制（2年間） |
| `X-Frame-Options` | `DENY` | クリックジャッキング防止 |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing攻撃防止 |
| `X-XSS-Protection` | `1; mode=block` | XSS攻撃防止 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラー情報制御 |

### レート制限設定

| ゾーン | レート | バースト | 用途 |
|--------|--------|----------|------|
| `api_limit` | 10r/s | 20 | 一般API |
| `general_limit` | 100r/s | 50 | 静的ファイル |

---

## 運用手順

### 設定ファイルの配置

```bash
# [ ] Upstream設定ファイルの配置
sudo cp nginx_upstream.conf /etc/nginx/conf.d/

# [ ] Nginx設定ファイルの配置
sudo cp winyx /etc/nginx/sites-available/winyx
sudo ln -sf /etc/nginx/sites-available/winyx /etc/nginx/sites-enabled/winyx

# [ ] IP制限ファイルの配置
sudo cp allowed_ips.conf /etc/nginx/conf.d/
sudo cp api_allowed_ips.conf /etc/nginx/conf.d/

# [ ] 設定の検証
sudo nginx -t

# [ ] Nginxの再起動
sudo systemctl reload nginx
```

### 設定変更時の手順

```bash
# [ ] 設定ファイルの編集
sudo vim /etc/nginx/sites-available/winyx

# [ ] 設定の検証
sudo nginx -t

# [ ] 設定の適用（ダウンタイムなし）
sudo systemctl reload nginx
```

### デプロイ手順

#### 初回セットアップ

```bash
# [ ] 既存設定のバックアップ（安全策）
sudo cp /etc/nginx/sites-available/winyx /etc/nginx/sites-available/winyx.backup.$(date +%Y%m%d_%H%M%S)

# [ ] 設定ファイルの配置
sudo cp nginx_upstream.conf /etc/nginx/conf.d/
sudo cp winyx /etc/nginx/sites-available/winyx
sudo ln -sf /etc/nginx/sites-available/winyx /etc/nginx/sites-enabled/winyx

# [ ] IP制限ファイルの配置
sudo cp allowed_ips.conf /etc/nginx/conf.d/
sudo cp api_allowed_ips.conf /etc/nginx/conf.d/

# [ ] 設定の検証
sudo nginx -t

# [ ] Nginxの再起動
sudo systemctl reload nginx
```

#### 設定更新時の手順

```bash
# [ ] 設定ファイルの編集
sudo vim /etc/nginx/sites-available/winyx

# [ ] 設定の検証
sudo nginx -t

# [ ] 設定の適用（ダウンタイムなし）
sudo systemctl reload nginx
```

#### ロールバック手順

設定に問題が発生した場合の緊急対応：

```bash
# [ ] バックアップから復元
sudo cp /etc/nginx/sites-available/winyx.backup.[日付] /etc/nginx/sites-available/winyx

# [ ] 設定の検証
sudo nginx -t

# [ ] Nginxのリロード
sudo systemctl reload nginx

# [ ] 動作確認
curl -I https://winyx.jp/api/v1/users/health
```

### ヘルスチェック・動作確認

#### システム状態の確認

```bash
# [ ] Nginxステータス確認
sudo systemctl status nginx

# [ ] プロセス確認
ps aux | grep nginx

# [ ] リスニングポート確認
sudo netstat -tlnp | grep ':80\|:443'

# [ ] アップストリームの確認
curl -H "Host: winyx.jp" http://localhost/api/v1/users/health

# [ ] SSL証明書の確認
sudo certbot certificates

# [ ] ログの確認
sudo journalctl -u nginx --since "10 minutes ago"
```

#### エンドポイント別動作確認

```bash
# [ ] メインサイト確認
curl -I https://winyx.jp/

# [ ] API専用サブドメイン確認
curl -I https://api.winyx.jp/api/v1/users/health

# [ ] UserService API確認
curl -X POST https://winyx.jp/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# [ ] Dashboard Service確認
curl -I https://winyx.jp/api/dashboard/health
```

#### ログ監視

```bash
# [ ] アクセスログの確認
sudo tail -f /var/log/nginx/winyx_access.log

# [ ] エラーログの確認
sudo tail -f /var/log/nginx/winyx_error.log

# [ ] 特定IPのアクセス確認
sudo grep "$(curl -s ifconfig.me)" /var/log/nginx/winyx_access.log | tail -10
```

---

## トラブルシューティング

### よくある問題と解決法

#### 1. 502 Bad Gateway エラー

**原因**: バックエンドサービスが停止している

```bash
# [ ] バックエンドサービスの確認
sudo systemctl status winyx-user.service

# [ ] ポートの確認
sudo netstat -tlnp | grep 8888

# [ ] ログの確認
sudo tail -f /var/log/nginx/winyx_error.log
```

#### 2. upstream重複エラー

**原因**: 複数の設定ファイルで同じupstream名が定義されている

```bash
# [ ] upstream定義の確認
sudo nginx -T | grep upstream

# [ ] upstream名の統一
# nginx_upstream.conf で winyx_backend_api を使用
# sites-available/winyx では upstream定義を削除
```

#### 3. 403 Forbidden エラー

**原因**: IPアドレス制限に引っかかっている

```bash
# [ ] 現在のIPアドレス確認
curl -s ifconfig.me

# [ ] 許可IPリストの確認
sudo cat /etc/nginx/conf.d/allowed_ips.conf

# [ ] IPアドレスの追加
sudo vim /etc/nginx/conf.d/allowed_ips.conf
# allow [YOUR_IP_ADDRESS]; を追加

# [ ] 設定の適用
sudo systemctl reload nginx
```

#### 4. CORS エラー

**原因**: フロントエンドのドメインが許可されていない

```bash
# [ ] CORS設定の確認
sudo nginx -T | grep "Access-Control-Allow-Origin"

# [ ] 開発環境用設定の追加
# /etc/nginx/sites-available/winyx に以下を追加
# add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
```

#### 5. SSL証明書エラー

**原因**: 証明書の期限切れまたはパス不正

```bash
# [ ] 証明書の状態確認
sudo certbot certificates

# [ ] 証明書の更新
sudo certbot renew --dry-run

# [ ] 自動更新の設定
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### セキュリティ注意事項

#### 本番環境での必須設定

1. **IPアドレス制限**: 本番環境では必ず適切なIPアドレス制限を設定してください
2. **HTTPS化**: 本番環境ではSSL/TLS証明書を設定し、HTTPS化してください
3. **レート制限**: DDoS攻撃対策として、適切なレート制限を設定してください
4. **アクセスログ監視**: 不正アクセスの発見のため、ログ監視を実装してください

#### ファイル権限の設定

```bash
# [ ] Nginx設定ファイルの権限設定
sudo chmod 644 /etc/nginx/sites-available/winyx
sudo chmod 644 /etc/nginx/conf.d/*.conf

# [ ] SSL証明書の権限設定
sudo chmod 600 /etc/letsencrypt/live/winyx.jp/privkey.pem
sudo chmod 644 /etc/letsencrypt/live/winyx.jp/fullchain.pem
```

#### 欠除ファイルの作成

**原因**: include文で指定したファイルが存在しない

```bash
# [ ] IP制限ファイルの作成
sudo vim /etc/nginx/conf.d/allowed_ips.conf
# 以下を追加:
# allow 202.79.96.61;     # 会社のIPアドレス
# allow 101.111.202.127;  # 自宅のIPアドレス
# deny all;

sudo vim /etc/nginx/conf.d/api_allowed_ips.conf
# 以下を追加:
# allow 202.79.96.61;     # 会社のIPアドレス
# deny all;
```

---

## 設定ファイル一覧

### 必要なファイル

- `/etc/nginx/sites-available/winyx` - メイン設定ファイル
- `/etc/nginx/conf.d/nginx_upstream.conf` - Upstream定義
- `/etc/nginx/conf.d/allowed_ips.conf` - メインサイトIP制限
- `/etc/nginx/conf.d/api_allowed_ips.conf` - API専用IP制限
- `/etc/letsencrypt/live/winyx.jp/` - SSL証明書

### 関連コマンド

```bash
# Nginx関連
sudo systemctl {start|stop|restart|reload|status} nginx
sudo nginx -t  # 設定検証
sudo nginx -T  # 設定表示

# SSL証明書関連
sudo certbot {certificates|renew|revoke}
sudo certbot certonly --nginx -d winyx.jp -d api.winyx.jp

# ログ関連
sudo tail -f /var/log/nginx/{winyx_access,winyx_error}.log
sudo logrotate -f /etc/logrotate.d/nginx
```
