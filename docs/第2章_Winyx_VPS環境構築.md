# 第2章 Winyx VPS環境構築

> 本章は第1章の仕様に基づき、環境変数（.env）による設定管理とDDLからのモデル生成を含む具体的な実装手順です。

---

## 第1節 環境準備

### 2.1.1 ディレクトリ構造の作成

- [x] プロジェクトルートの作成

```bash
sudo mkdir -p /var/www/winyx/{contracts/{api,rpc},backend,frontend,scripts,docs}
sudo chown -R "$USER":www-data /var/www/winyx
sudo chmod -R 775 /var/www/winyx
```

> 目的：第1章で定義したWinyx標準のディレクトリ構造を作成

### 2.1.2 環境変数ファイルの準備

- [x] .envファイルの作成

```bash
vim /var/www/winyx/.env
```
```
# Winyx Project Environment Variables
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=winyx_core
DB_USERNAME=winyx_app
DB_PASSWORD=Winyx$7377
DB_CHARSET=utf8mb4
DB_TIMEZONE=Asia/Tokyo

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Application Configuration
APP_NAME=test_api
APP_HOST=0.0.0.0
APP_PORT=8888

# JWT Configuration
JWT_SECRET=CHANGE_ME_SUPER_SECRET_256BIT
JWT_EXPIRE=86400

# MySQL Root User (for database creation only)
MYSQL_ROOT_USER=root
MYSQL_ROOT_PASSWORD=Winyx$7377
```

> 目的：機密情報を一元管理

- [x] .env.exampleテンプレートの作成

```bash
cp /var/www/winyx/.env /var/www/winyx/.env.example
sed -i 's/Winyx\$7377/YOUR_PASSWORD/g' /var/www/winyx/.env.example
```

> 目的：チーム共有用のテンプレート提供

### 2.1.3 Go環境のセットアップ

- [x] Go PATHとGOBINの設定

```bash
vim ~/.bashrc
# 末尾に追記
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN

# 設定を反映
source ~/.bashrc
```

> 目的：goctl等のCLIツールへのPATH解決

- [x] Go-Zero関連ツールのインストール

```bash
# goctl（Go-Zero CLIツール）
go install github.com/zeromicro/go-zero/tools/goctl@latest

# protobufプラグイン
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

> 目的：コード生成ツールの準備

---

### 2.1.4 バックエンド構築

#### 2.1.4.1 データベースセットアップ

- [x] セットアップスクリプトの作成

```bash
vim  /var/www/winyx/scripts/setup_database.sh
```
```bash
#!/bin/bash
# Setup database using credentials from .env file

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
else
    echo "Error: .env file not found"
    exit 1
fi

echo "Creating database and user..."

# Create SQL commands
cat > /tmp/setup_winyx_db.sql <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_DATABASE} 
  DEFAULT CHARACTER SET ${DB_CHARSET} 
  DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;
  
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' 
  IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* 
  TO '${DB_USERNAME}'@'localhost';
  
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'${DB_HOST}' 
  IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* 
  TO '${DB_USERNAME}'@'${DB_HOST}';
  
FLUSH PRIVILEGES;
EOF

# Execute with sudo
sudo mysql < /tmp/setup_winyx_db.sql

# Clean up
rm -f /tmp/setup_winyx_db.sql
echo "Database setup complete."
```
- [ ] 実行権限を与えます
```bash
chmod +x /var/www/winyx/scripts/setup_database.sh
```

> 目的：.envからDB設定を読み込んで自動構築

- [x] データベースの作成実行

```bash
/var/www/winyx/scripts/setup_database.sh
```

> 目的：winyx_coreデータベースとwinyx_appユーザーを作成

#### 2.1.4.2 Go-Zeroサービスの初期化

- [x] backendディレクトリでGoモジュール初期化

```bash
cd /var/www/winyx/backend
go mod init github.com/winyx/backend
go get github.com/zeromicro/go-zero@latest
```

> 目的：Go依存関係の管理基盤を用意

- [x] test_apiサービスの生成

```bash
cd /var/www/winyx/backend
goctl api new test_api
```

> 目的：APIサービスの雛形を生成

#### 2.1.4.3 DDL → Model生成（キャッシュ対応）

- [x] DDLファイルの作成（第1章の契約管理方針に従い、contracts/apiに配置）

```bash
vim /var/www/winyx/contracts/api/schema.sql 
```
```
-- Winyx Core Database Schema
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'ユーザー名',
  `email` varchar(255) NOT NULL COMMENT 'メールアドレス',
  `password` varchar(255) NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'アバター画像URL',
  `bio` text DEFAULT NULL COMMENT '自己紹介',
  `phone` varchar(20) DEFAULT NULL COMMENT '電話番号',
  `address` text DEFAULT NULL COMMENT '住所',
  `birth_date` date DEFAULT NULL COMMENT '生年月日',
  `gender` varchar(10) DEFAULT NULL COMMENT '性別',
  `occupation` varchar(100) DEFAULT NULL COMMENT '職業',
  `website` varchar(255) DEFAULT NULL COMMENT 'ウェブサイト',
  `social_links` json DEFAULT NULL COMMENT 'ソーシャルメディアリンク',
  `preferences` json DEFAULT NULL COMMENT 'ユーザー設定',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  KEY `idx_birth_date` (`birth_date`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `token` varchar(500) NOT NULL COMMENT 'セッショントークン',
  `expires_at` timestamp NOT NULL COMMENT '有効期限',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token` (`token`(255)),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> 目的：データベーススキーマの定義

- [x] 外部キー制約なしバージョンの作成（goctl用）

```bash
vim /var/www/winyx/contracts/api/schema_no_fk.sql
```
```
-- Winyx Core Database Schema (Without Foreign Keys for goctl)
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'ユーザー名',
  `email` varchar(255) NOT NULL COMMENT 'メールアドレス',
  `password` varchar(255) NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'アバター画像URL',
  `bio` text DEFAULT NULL COMMENT '自己紹介',
  `phone` varchar(20) DEFAULT NULL COMMENT '電話番号',
  `address` text DEFAULT NULL COMMENT '住所',
  `birth_date` date DEFAULT NULL COMMENT '生年月日',
  `gender` varchar(10) DEFAULT NULL COMMENT '性別',
  `occupation` varchar(100) DEFAULT NULL COMMENT '職業',
  `website` varchar(255) DEFAULT NULL COMMENT 'ウェブサイト',
  `social_links` json DEFAULT NULL COMMENT 'ソーシャルメディアリンク',
  `preferences` json DEFAULT NULL COMMENT 'ユーザー設定',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  KEY `idx_birth_date` (`birth_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `token` varchar(500) NOT NULL COMMENT 'セッショントークン',
  `expires_at` timestamp NOT NULL COMMENT '有効期限',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token` (`token`(255)),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> 目的：goctl model生成用のDDL準備

- [x] DDLをデータベースに適用

```bash
# .envから設定を読み込んで適用
source /var/www/winyx/.env
mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
```

> 目的：テーブルを実際に作成

- [x] Redisキャッシュ対応モデルの生成

```bash
cd /var/www/winyx/backend/test_api
goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/schema_no_fk.sql \
  -dir ./internal/model \
  -c
```

> 目的：CRUD操作とRedisキャッシュ対応のモデルコードを自動生成

#### 2.1.4.4 設定ファイルの環境変数対応

- [x] 設定読み込みスクリプトの作成

```bash
vim /var/www/winyx/backend/test_api/load_env.sh
```
```
cat > /var/www/winyx/backend/test_api/load_env.sh <<'SCRIPT'
#!/bin/bash
# Load environment variables from .env file and create YAML config

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    export $(grep -v '^#' /var/www/winyx/.env | xargs)
fi
```
- [ ] 環境設定ファイル作成
```
# Create config file from environment variables
cat > /var/www/winyx/backend/test_api/etc/test_api-api.yaml <<EOF
Name: ${APP_NAME:-test_api}
Host: ${APP_HOST:-0.0.0.0}
Port: ${APP_PORT:-8888}

Mysql:
  DataSource: "${DB_USERNAME}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_DATABASE}?charset=${DB_CHARSET}&parseTime=true&loc=${DB_TIMEZONE/\//%2F}"

Cache:
  - Host: ${REDIS_HOST}:${REDIS_PORT}
    Pass: "${REDIS_PASSWORD}"
    Type: node

Auth:
  AccessSecret: "${JWT_SECRET}"
  AccessExpire: ${JWT_EXPIRE:-86400}
```
- [ ] 実行権限を与えます
```
echo "Configuration file created at etc/test_api-api.yaml"
chmod +x /var/www/winyx/backend/test_api/load_env.sh
```

> 目的：.envから設定YAMLを自動生成

- [ ] 設定ファイルの生成

```bash
cd /var/www/winyx/backend/test_api
./load_env.sh
```

> 目的：環境変数から実際の設定ファイルを作成

#### 2.1.4.5 サービスの起動確認

- [x] test_apiのビルドと起動

```bash
cd /var/www/winyx/backend/test_api
go mod tidy
go build -o test_api testapi.go
./test_api -f etc/test_api-api.yaml &
echo $! > /tmp/test_api.pid
```

> 目的：サービスのビルドと起動

- [x] 疎通確認

```bash
curl -s http://127.0.0.1:8888/from/you | jq .
# 期待値：{"message": "Hello you"} のようなJSON
```

> 目的：APIエンドポイントの動作確認

- [x] サービス停止

```bash
kill "$(cat /tmp/test_api.pid)"
```

> 目的：プロセスの安全な停止

---

### 2.1.5 セキュリティとGit管理

#### 2.1.5.1 .gitignoreの設定

- [x] 機密情報の除外設定確認

```bash
# .gitignoreに以下が含まれていることを確認
grep -E "^\*\*/\.env$" /var/www/winyx/.gitignore
# contracts配下のSQLファイルは追跡対象
grep "!contracts/\*\*/\*.sql" /var/www/winyx/.gitignore
```

> 目的：.envファイルがGitに含まれないことを保証

#### 2.1.5.2 ファイル権限の設定

- [x] .envファイルの権限設定

```bash
chmod 600 /var/www/winyx/.env
```

> 目的：機密情報への不正アクセス防止

---

### 2.1.6 検証手順

#### 2.1.6.1 データベース接続テスト

```bash
source /var/www/winyx/.env
mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} \
  -e "SHOW TABLES;"
```

期待される出力：
```
+----------------------+
| Tables_in_winyx_core |
+----------------------+
| sessions             |
| user_profiles        |
| users                |
+----------------------+
```

#### 2.1.6.2 モデル生成の確認

```bash
ls -la /var/www/winyx/backend/test_api/internal/model/
```

期待されるファイル：
- `usersmodel.go` / `usersmodel_gen.go`
- `userprofilesmodel.go` / `userprofilesmodel_gen.go`
- `sessionsmodel.go` / `sessionsmodel_gen.go`
- `vars.go`

---

### 2.1.7 トラブルシューティング

#### 問題1：データベース接続エラー（MySQL/MariaDB認証問題）

**症状**: `ERROR 1045 (28000): Access denied`

**原因**: MariaDBではMySQL 8.0+とは異なる認証方法を使用

**解決策**:
- [ ] MariaDB用の認証修正スクリプトを作成

```bash
#!/bin/bash
source /var/www/winyx/.env

cat > /tmp/fix_auth.sql <<EOF
SET PASSWORD FOR '${DB_USERNAME}'@'localhost' = PASSWORD('${DB_PASSWORD}');
SET PASSWORD FOR '${DB_USERNAME}'@'${DB_HOST}' = PASSWORD('${DB_PASSWORD}');
FLUSH PRIVILEGES;
EOF

sudo mysql < /tmp/fix_auth.sql
mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
rm -f /tmp/fix_auth.sql
```
- [ ] 実行権限を与えます

```
chmod +x /var/www/winyx/scripts/fix_mysql_auth.sh
/var/www/winyx/scripts/fix_mysql_auth.sh
```

#### 問題2：Go権限エラー

**症状**: `could not create module cache: permission denied`

**解決策**:
```bash
# 一時的なGOPATHとキャッシュを使用
cd /var/www/winyx/backend/test_api
GOPATH=/tmp/go GOCACHE=/tmp/go-cache go run testapi.go
```

#### 問題3：goctl model生成エラー

外部キー制約エラーの場合：
```bash
# schema_no_fk.sqlを使用
goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/schema_no_fk.sql \
  -dir ./internal/model -c
```

#### 問題4：環境変数が読み込まれない

```bash
# .envファイルの存在確認
ls -la /var/www/winyx/.env

# 手動読み込みテスト
source /var/www/winyx/.env
echo $DB_USERNAME
```

---

### 2.1.8 注意点（落とし穴）

1. **パスワードに特殊文字**：`$`などはエスケープが必要
2. **設定ファイル名の統一**：`test_api-api.yaml`で統一（ハイフン位置に注意）
3. **外部キー制約**：goctlは外部キー制約をサポートしないため、別途DDLを用意

---

## 第2節 systemdサービス化

### 2.2.1 systemdサービスファイルの作成

- [x] サービスファイルの作成

```bash
sudo vim  /etc/systemd/system/winyx-test-api.service
```
```
[Unit]
Description=Winyx Test API Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/winyx/backend/test_api
Environment=GOPATH=/tmp/go
Environment=GOCACHE=/tmp/go-cache
EnvironmentFile=/var/www/winyx/.env
ExecStartPre=/bin/bash -c '/var/www/winyx/backend/test_api/load_env.sh'
ExecStart=/usr/local/go/bin/go run testapi.go
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=winyx-test-api

[Install]
WantedBy=multi-user.target
```

> 目的：APIサーバーをシステムサービスとして管理

### 2.2.2 権限とディレクトリ設定

- [x] サービス用ディレクトリの準備

```bash
# www-dataユーザーがアクセスできるように設定
sudo chown -R www-data:www-data /var/www/winyx
sudo chmod 755 /var/www/winyx/.env
sudo mkdir -p /tmp/go
sudo chown www-data:www-data /tmp/go
```

- [x] ログ表示権限の設定

```bash
# 現在のユーザーをsystemd-journalグループに追加（ログ表示権限）
sudo usermod -a -G systemd-journal $USER

# 新しいグループ権限を適用（新しいシェルセッション開始）
newgrp systemd-journal
```

> 目的：サービス実行環境とログアクセス権限の整備

### 2.2.3 サービスの有効化と起動

- [x] systemdサービスの管理

```bash
# サービスファイルの再読み込み
sudo systemctl daemon-reload

# サービスの有効化（起動時自動開始）
sudo systemctl enable winyx-test-api

# サービス開始
sudo systemctl start winyx-test-api

# ステータス確認
sudo systemctl status winyx-test-api
```

> 目的：サービスとして常駐化

### 2.2.4 サービス管理コマンド

```bash
# サービス開始
sudo systemctl start winyx-test-api

# サービス停止
sudo systemctl stop winyx-test-api

# サービス再起動
sudo systemctl restart winyx-test-api

# ログ確認
journalctl -u winyx-test-api -f

# 自動起動の有効化/無効化
sudo systemctl enable winyx-test-api    # 有効化
sudo systemctl disable winyx-test-api   # 無効化
```

### 2.2.5 検証

- [x] サービス動作確認

```bash
# サービス状態確認
sudo systemctl is-active winyx-test-api
# 期待値: active

# API疎通確認
curl -s http://127.0.0.1:8888/from/you | jq .
# 期待値: null または適切なJSONレスポンス

# プロセス確認
ps aux | grep testapi.go
```

---

## 第3節 認証機能の実装

### 2.3.1 JWT認証の概要

本節では、go-zeroフレームワークを使用してJWT（JSON Web Token）ベースの認証システムを実装します。

#### 実装する機能
1. ユーザー登録API
2. ログインAPI（JWT発行）
3. JWT認証ミドルウェア
4. 認証が必要なAPIエンドポイント
5. セッション管理（Redis）

### 2.3.2 APIルートの設計

- [x] API定義ファイルの更新

```bash
vim /var/www/winyx/backend/test_api/test_api.api
```
```
// User Authentication APIs
type RegisterReq {
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"password"`
}

type RegisterRes {
    Id    int64  `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type LoginReq {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type LoginRes {
    AccessToken string `json:"access_token"`
    ExpireTime  int64  `json:"expire_time"`
}

type UserInfoRes {
    Id    int64  `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

service test_api-api {
    // Public endpoints (no auth required)
    @handler register
    post /api/register (RegisterReq) returns (RegisterRes)
    
    @handler login
    post /api/login (LoginReq) returns (LoginRes)
}

@server(
    jwt: Auth
    group: protected
    prefix: /api
)
service test_api-api {
    // Protected endpoints (auth required)
    @handler userInfo
    get /user/info returns (UserInfoRes)
    
    @handler updateProfile
    post /user/profile (RegisterReq) returns (RegisterRes)
}
```

> 目的：認証付きAPIの定義

### 2.3.3 コード生成とファイル構成

- [x] 更新されたAPIからコードを再生成

```bash
cd /var/www/winyx/backend/test_api
goctl api go -api test_api.api -dir . --style=goZero
```

> 目的：JWT認証対応のハンドラーとルートを自動生成

### 2.3.4 認証ロジックの実装

- [x] ユーザー登録ハンドラーの実装

```bash
vim /var/www/winyx/backend/test_api/internal/handler/registerhandler.go
```
```
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func registerHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.RegisterReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := logic.NewRegisterLogic(r.Context(), svcCtx)
		resp, err := l.Register(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
```

- [x] ログインハンドラーの実装

```bash
vim /var/www/winyx/backend/test_api/internal/handler/loginhandler.go
```
```bash
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func loginHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.LoginReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := logic.NewLoginLogic(r.Context(), svcCtx)
		resp, err := l.Login(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
```

### 2.3.5 ビジネスロジックの実装

- [x] ユーザー登録ロジックの実装

```bash
vim /var/www/winyx/backend/test_api/internal/logic/registerlogic.go
```
```
package logic

import (
	"context"
	"database/sql"
	"time"

	"github.com/winyx/backend/test_api/internal/model"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type RegisterLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RegisterLogic {
	return &RegisterLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RegisterLogic) Register(req *types.RegisterReq) (resp *types.RegisterRes, err error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Check if user exists
	_, err = l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err != sql.ErrNoRows {
		if err == nil {
			return nil, errors.New("user already exists")
		}
		return nil, err
	}

	// Create user
	user := &model.Users{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   1,
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
	if err != nil {
		return nil, err
	}

	userId, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &types.RegisterRes{
		Id:    userId,
		Name:  req.Name,
		Email: req.Email,
	}, nil
}
```

- [x] ログインロジックの実装

```bash
vim /var/www/winyx/backend/test_api/internal/logic/loginlogic.go
```
```
package logic

import (
	"context"
	"time"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

	"github.com/golang-jwt/jwt/v4"
	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type LoginLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
	return &LoginLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *LoginLogic) Login(req *types.LoginReq) (resp *types.LoginRes, err error) {
	// Find user by email
	user, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT token
	now := time.Now().Unix()
	expire := l.svcCtx.Config.Auth.AccessExpire
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iat":    now,
		"exp":    now + expire,
		"userId": user.Id,
	})

	accessToken, err := token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
	if err != nil {
		return nil, err
	}

	return &types.LoginRes{
		AccessToken: accessToken,
		ExpireTime:  now + expire,
	}, nil
}
```

### 2.3.6 保護されたエンドポイントの実装

- [x] ユーザー情報取得ハンドラー

```bash
vim /var/www/winyx/backend/test_api/internal/handler/protected/userinfohandler.go
```
```
package protected

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic/protected"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func UserInfoHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := protected.NewUserInfoLogic(r.Context(), svcCtx)
		resp, err := l.UserInfo()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
```

### 2.3.7 依存関係の追加

- [x] 必要なパッケージをgo.modに追加

```bash
cd /var/www/winyx/backend/test_api
go get golang.org/x/crypto/bcrypt
go get github.com/golang-jwt/jwt/v4
go mod tidy
```

### 2.3.8 設定ファイルの更新

- [x] JWT設定がload_env.shで正しく設定されていることを確認

```bash
# 既存のload_env.shを確認
grep -A5 "Auth:" /var/www/winyx/backend/test_api/load_env.sh
```

### 2.3.9 テスト手順

- [x] 認証APIのテスト

```bash
# サービス再起動
sudo systemctl restart winyx-test-api

# 1. ユーザー登録
curl -X POST http://127.0.0.1:8888/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }' | jq .

# 2. ログイン（JWTトークン取得）
curl -X POST http://127.0.0.1:8888/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq .

# 3. 保護されたエンドポイントにアクセス（Bearerトークン必要）
curl -X GET http://127.0.0.1:8888/api/user/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" | jq .
```

### 2.3.10 トラブルシューティング

#### 問題1：JWT関連エラー
```bash
# JWT秘密鍵の確認
grep JWT_SECRET /var/www/winyx/.env

# 設定ファイルでの反映確認
grep AccessSecret /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

#### 問題2：データベース接続エラー
```bash
# データベース接続確認
source /var/www/winyx/.env
mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SELECT * FROM users LIMIT 1;"
```

---

## まとめ

第3節で実装した認証機能により、以下が可能になりました：

1. **セキュアなユーザー管理**: bcryptによるパスワードハッシュ化
2. **JWT認証**: ステートレスな認証システム
3. **保護されたAPI**: 認証が必要なエンドポイントの実装
4. **RESTful設計**: 標準的なHTTP APIの提供

次のステップでは、これらの認証機能を拡張して、ユーザープロフィール管理やロールベースアクセス制御（RBAC）の実装を検討できます。