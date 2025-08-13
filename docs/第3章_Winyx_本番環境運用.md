# 第3章 Winyx 本番環境運用

> 本章は第2章で構築した環境を本番稼働させるための運用設定と管理手順です。

---

## 第1節 Webサーバー設定（Nginx）

### 3.1.1 Nginxのインストールと基本設定

#### インストール
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
```

#### 基本設定ファイルの作成
```bash
sudo vim /etc/nginx/sites-available/winyx
```

```nginx
# Winyx Nginx Configuration
upstream backend_api {
    server 127.0.0.1:8888;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # フロントエンド静的ファイル
    root /var/www/winyx/frontend;
    index index.html;
    
    # gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;
    
    # 静的ファイルのキャッシュ設定
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # APIリバースプロキシ
    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # SPAのフォールバック
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 設定の有効化
```bash
sudo ln -s /etc/nginx/sites-available/winyx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.1.2 SSL/TLS証明書の設定（Let's Encrypt）

#### Certbotのインストール
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### SSL証明書の取得
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
  --non-interactive --agree-tos -m admin@your-domain.com
```

#### 自動更新の設定
```bash
# 更新テスト
sudo certbot renew --dry-run

# 自動更新のcron設定（既に自動設定されているが確認）
sudo systemctl status certbot.timer
```

#### セキュリティヘッダーの追加
```bash
sudo vim /etc/nginx/snippets/security-headers.conf
```

```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

サイト設定に含める：
```nginx
server {
    # ... 既存の設定 ...
    include /etc/nginx/snippets/security-headers.conf;
}
```

---

## 第2節 セキュリティ強化

### 3.2.1 ファイアウォール設定（UFW）

#### UFWのインストールと基本設定
```bash
sudo apt install ufw -y

# デフォルトポリシー設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポートを開放
sudo ufw allow 22/tcp    # SSH（後でポート変更推奨）
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3306/tcp  # MySQL（内部接続のみ推奨）

# ファイアウォール有効化
sudo ufw enable
sudo ufw status verbose
```

### 3.2.2 SSH強化設定

#### SSH設定の変更
```bash
sudo vim /etc/ssh/sshd_config
```

```
# セキュリティ強化設定
Port 22222                          # デフォルトポートから変更
PermitRootLogin no                  # rootログイン禁止
PasswordAuthentication no           # パスワード認証禁止（鍵認証のみ）
PubkeyAuthentication yes            # 公開鍵認証有効
MaxAuthTries 3                      # 認証試行回数制限
ClientAliveInterval 300             # アイドルタイムアウト
ClientAliveCountMax 2               
AllowUsers your-username            # 特定ユーザーのみ許可
```

#### SSH鍵の設定（まだの場合）
```bash
# ローカルマシンで鍵生成
ssh-keygen -t ed25519 -C "your-email@example.com"

# 公開鍵をサーバーに登録
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server-ip
```

#### SSH設定の反映
```bash
sudo systemctl restart sshd

# 新しいポートでファイアウォール設定
sudo ufw allow 22222/tcp
sudo ufw delete allow 22/tcp
```

### 3.2.3 Fail2ban設定（ブルートフォース対策）

#### インストールと設定
```bash
sudo apt install fail2ban -y

# 設定ファイル作成
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22222
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
```

#### Fail2banの起動
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status
```

---

## 第3節 データベース本番設定

### 3.3.1 MySQL/MariaDBチューニング

#### 設定ファイルの最適化
```bash
sudo vim /etc/mysql/mariadb.conf.d/99-winyx.cnf
```

```ini
[mysqld]
# 基本設定
max_connections = 200
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# バッファ設定（RAMの25-50%程度）
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# クエリキャッシュ
query_cache_type = 1
query_cache_size = 128M
query_cache_limit = 2M

# スロークエリログ
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# 文字コード
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# バイナリログ（レプリケーション用）
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
expire_logs_days = 7
```

#### 設定の反映
```bash
sudo systemctl restart mysql
```

### 3.3.2 定期バックアップの自動化

#### バックアップスクリプトの作成
```bash
sudo vim /var/www/winyx/scripts/backup_database.sh
```

```bash
#!/bin/bash
# Database Backup Script

# 設定読み込み
source /var/www/winyx/.env

# バックアップディレクトリ
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/winyx_${DATE}.sql.gz"

# ディレクトリ作成
mkdir -p ${BACKUP_DIR}

# バックアップ実行
mysqldump -h ${DB_HOST} \
  -u ${DB_USERNAME} \
  -p"${DB_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  ${DB_DATABASE} | gzip > ${BACKUP_FILE}

# 古いバックアップを削除（7日以上）
find ${BACKUP_DIR} -name "winyx_*.sql.gz" -mtime +7 -delete

# S3へのアップロード（オプション）
# aws s3 cp ${BACKUP_FILE} s3://your-backup-bucket/mysql/

echo "Backup completed: ${BACKUP_FILE}"
```

#### 実行権限とcron設定
```bash
sudo chmod +x /var/www/winyx/scripts/backup_database.sh

# crontab設定（毎日3:00に実行）
sudo crontab -e
```

```
0 3 * * * /var/www/winyx/scripts/backup_database.sh >> /var/log/mysql-backup.log 2>&1
```

---

## 第4節 Redis本番設定

### 3.4.1 Redis設定の最適化

#### 設定ファイルの編集
```bash
sudo vim /etc/redis/redis.conf
```

```conf
# メモリ管理
maxmemory 512mb
maxmemory-policy allkeys-lru

# 永続化設定
save 900 1      # 15分間に1回以上の変更があれば保存
save 300 10     # 5分間に10回以上
save 60 10000   # 1分間に10000回以上

# AOF（Append Only File）
appendonly yes
appendfsync everysec

# パスワード設定
requirepass your_redis_password

# ログ設定
logfile /var/log/redis/redis-server.log
loglevel notice
```

#### 設定の反映
```bash
sudo systemctl restart redis-server
```

#### 接続テスト
```bash
redis-cli -a your_redis_password ping
```

---

## 第5節 監視とログ管理

### 3.5.1 ログローテーション設定

#### アプリケーションログの設定
```bash
sudo vim /etc/logrotate.d/winyx
```

```
/var/www/winyx/backend/*/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload winyx-test-api > /dev/null 2>&1 || true
    endscript
}
```

### 3.5.2 システム監視（Prometheus + Grafana）

#### Prometheusのインストール
```bash
# Prometheusダウンロード
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz
sudo mv prometheus-2.45.0.linux-amd64 /opt/prometheus

# 設定ファイル
sudo vim /opt/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'mysql'
    static_configs:
      - targets: ['localhost:9104']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
```

#### Node Exporterのインストール
```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
tar xvf node_exporter-1.6.0.linux-amd64.tar.gz
sudo mv node_exporter-1.6.0.linux-amd64/node_exporter /usr/local/bin/

# systemdサービス作成
sudo vim /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

#### Grafanaのインストール
```bash
# Grafanaリポジトリ追加
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# インストール
sudo apt update
sudo apt install grafana -y

# 起動
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

### 3.5.3 アラート設定

#### Alertmanagerの設定
```bash
sudo vim /opt/prometheus/alertmanager.yml
```

```yaml
global:
  smtp_from: 'alerts@your-domain.com'
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-notifications'

receivers:
- name: 'email-notifications'
  email_configs:
  - to: 'admin@your-domain.com'
    headers:
      Subject: 'Winyx Alert: {{ .GroupLabels.alertname }}'
```

---

## 第6節 CI/CDパイプライン

### 3.6.1 GitHub Actions設定

#### ワークフローファイルの作成
```bash
vim /var/www/winyx/.github/workflows/deploy.yml
```

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
    
    - name: Run tests
      run: |
        cd backend/test_api
        go test ./...
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /var/www/winyx
          git pull origin main
          cd backend/test_api
          go build -o test_api testapi.go
          sudo systemctl restart winyx-test-api
```

#### シークレット設定
GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：
- `VPS_HOST`: VPSのIPアドレス
- `VPS_USER`: SSHユーザー名
- `VPS_SSH_KEY`: SSH秘密鍵

### 3.6.2 自動デプロイスクリプト

#### デプロイスクリプトの作成
```bash
vim /var/www/winyx/scripts/deploy.sh
```

```bash
#!/bin/bash
# Automated Deployment Script

set -e

echo "Starting deployment..."

# 環境変数読み込み
source /var/www/winyx/.env

# Gitから最新を取得
git pull origin main

# バックエンドのビルドとデプロイ
echo "Building backend services..."
cd /var/www/winyx/backend/test_api
go mod tidy
go build -o test_api testapi.go

# フロントエンドのビルド（Next.jsの場合）
echo "Building frontend..."
cd /var/www/winyx/frontend
npm install
npm run build

# サービス再起動
echo "Restarting services..."
sudo systemctl restart winyx-test-api
sudo systemctl restart nginx

# ヘルスチェック
sleep 5
curl -f http://localhost:8888/health || exit 1

echo "Deployment completed successfully!"
```

---

## 第7節 バックアップとリカバリ

### 3.7.1 完全バックアップ戦略

#### システム全体のバックアップスクリプト
```bash
vim /var/www/winyx/scripts/full_backup.sh
```

```bash
#!/bin/bash
# Full System Backup Script

BACKUP_ROOT="/var/backups/winyx"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"

# ディレクトリ作成
mkdir -p ${BACKUP_DIR}/{database,files,config}

# 1. データベースバックアップ
source /var/www/winyx/.env
mysqldump -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" \
  --all-databases --single-transaction \
  | gzip > ${BACKUP_DIR}/database/all_databases.sql.gz

# 2. アプリケーションファイル
tar czf ${BACKUP_DIR}/files/app_files.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /var/www/winyx

# 3. 設定ファイル
tar czf ${BACKUP_DIR}/config/system_config.tar.gz \
  /etc/nginx \
  /etc/systemd/system/winyx-* \
  /etc/redis \
  /etc/mysql

# 4. 環境変数（暗号化）
gpg --symmetric --cipher-algo AES256 \
  /var/www/winyx/.env \
  -o ${BACKUP_DIR}/config/env.gpg

# 5. 古いバックアップ削除（30日以上）
find ${BACKUP_ROOT} -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: ${BACKUP_DIR}"
```

### 3.7.2 リカバリ手順書

#### データベースリストア
```bash
# バックアップから復元
gunzip < /var/backups/winyx/20240101_120000/database/all_databases.sql.gz | mysql -u root -p

# 特定のデータベースのみ復元
gunzip < backup.sql.gz | mysql -u root -p winyx_core
```

#### アプリケーションリストア
```bash
# ファイルの復元
cd /
tar xzf /var/backups/winyx/20240101_120000/files/app_files.tar.gz

# 権限の復元
chown -R www-data:www-data /var/www/winyx

# サービス再起動
systemctl restart winyx-test-api
systemctl restart nginx
```

---

## 第8節 パフォーマンス最適化

### 3.8.1 CDN設定（Cloudflare）

#### Cloudflare設定手順
1. Cloudflareアカウントでドメインを追加
2. DNSレコードをCloudflareに移行
3. SSL/TLS設定を「Full (strict)」に設定
4. キャッシュルールの設定：
   - 静的ファイル: Cache Everything
   - API: Bypass Cache

### 3.8.2 アプリケーション最適化

#### Go-Zeroの最適化設定
```yaml
# test_api-api.yaml に追加
MaxConns: 1000
Timeout: 30000  # 30秒
CpuThreshold: 900  # CPU使用率90%でサーキットブレーカー発動
```

#### データベースインデックス最適化
```sql
-- パフォーマンス分析
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- 必要に応じてインデックス追加
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);
```

---

## 第9節 トラブルシューティング

### 3.9.1 よくある問題と解決策

#### メモリ不足
```bash
# スワップファイルの作成
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永続化
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### ディスク容量不足
```bash
# 大きなファイルの検索
du -ah / | sort -rh | head -20

# ログファイルのクリーンアップ
sudo journalctl --vacuum-time=7d
sudo apt-get clean
```

#### サービス起動失敗
```bash
# ログ確認
journalctl -u winyx-test-api -n 50
systemctl status winyx-test-api

# 権限確認
ls -la /var/www/winyx
ps aux | grep winyx
```

### 3.9.2 緊急時の対応手順

#### サービス完全停止時
```bash
# 1. 全サービス状態確認
systemctl status winyx-test-api nginx mysql redis

# 2. エラーログ確認
tail -f /var/log/nginx/error.log
tail -f /var/log/mysql/error.log
journalctl -xe

# 3. リソース確認
free -h
df -h
top

# 4. 段階的再起動
systemctl restart mysql
systemctl restart redis
systemctl restart winyx-test-api
systemctl restart nginx
```

---

## まとめ

第3章では、Winyx本番環境の運用に必要な以下の要素を設定しました：

1. **Webサーバー設定**: Nginx、SSL/TLS、セキュリティヘッダー
2. **セキュリティ強化**: ファイアウォール、SSH、Fail2ban
3. **データベース最適化**: チューニング、バックアップ
4. **監視システム**: Prometheus、Grafana、アラート
5. **CI/CD**: GitHub Actions、自動デプロイ
6. **バックアップ戦略**: 完全バックアップ、リカバリ手順
7. **パフォーマンス最適化**: CDN、キャッシュ、インデックス

これらの設定により、安全で高パフォーマンスな本番環境の運用が可能になります。