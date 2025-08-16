# 第2章 Winyx VPS環境構築 v1.1

> 本章は第1章v1.1の仕様に基づき、マイクロサービス対応のデータベース設計とサービス別YAML設定管理を含む具体的な実装手順です。

---

## 第1節 環境準備

### 2.1.1 ディレクトリ構造の作成（実装反映版）

- [ ] プロジェクトルートの作成

```bash
sudo mkdir -p /var/www/winyx/{contracts/{api,rpc,user_service,service_communication},backend,frontend,scripts,docs}
sudo chown -R "$USER":www-data /var/www/winyx
sudo chmod -R 775 /var/www/winyx
```

> 目的：第1章v1.1で定義した実際のディレクトリ構造を作成

### 2.1.2 設定管理の準備（ハイブリッド方式）

#### 共通環境変数ファイル（Optional）

- [ ] .envファイルの作成

```bash
vim /var/www/winyx/.env
```
```bash
# Winyx Project Environment Variables (共通設定)
# Database Configuration (共通)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_CHARSET=utf8mb4
DB_TIMEZONE=Asia/Tokyo

# Database Users (マイクロサービス共通)
DB_USERNAME=winyx_app
DB_PASSWORD=Winyx$7377

# Redis Configuration (共通)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration (共通認証設定)
JWT_SECRET=CHANGE_ME_SUPER_SECRET_256BIT
JWT_EXPIRE=86400

# MySQL Root User (for database creation only)
MYSQL_ROOT_USER=root
MYSQL_ROOT_PASSWORD=Winyx$7377
```

> 目的：マイクロサービス間で共通する設定の一元管理（Optional使用）

#### サービス別YAML設定（推奨方式）

- [ ] UserService設定例

```bash
mkdir -p /var/www/winyx/backend/user_service/etc
vim /var/www/winyx/backend/user_service/etc/user_service-api.yaml
```
```yaml
Name: user_service
Host: 0.0.0.0
Port: 8888

Mysql:
  DataSource: "winyx_app:Winyx$7377@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

Cache:
  - Host: 127.0.0.1:6379
    Pass: ""
    Type: node

Auth:
  AccessSecret: "CHANGE_ME_SUPER_SECRET_256BIT"
  AccessExpire: 86400
```

> 目的：サービス別の独立した設定管理

### 2.1.3 Go環境のセットアップ

- [ ] Go PATHとGOBINの設定

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

- [ ] Go-Zero関連ツールのインストール

```bash
# goctl（Go-Zero CLIツール）
go install github.com/zeromicro/go-zero/tools/goctl@latest

# protobufプラグイン
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# goctl-swagger（OpenAPI/Swagger生成）
go install github.com/zeromicro/goctl-swagger@latest
```

> 目的：コード生成とAPI仕様書生成ツールの準備

---

## 第2節 マイクロサービス対応データベース構築

### 2.2.1 複数データベースセットアップ

#### マイクロサービス向けデータベース作成スクリプト

- [ ] 複数DB対応セットアップスクリプトの作成

```bash
vim /var/www/winyx/scripts/setup_microservices_database.sh
```
```bash
#!/bin/bash
# Setup multiple databases for microservices

# Load .env file if exists
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
else
    echo "Warning: .env file not found, using defaults"
    DB_USERNAME=${DB_USERNAME:-winyx_app}
    DB_PASSWORD=${DB_PASSWORD:-YOUR_PASSWORD}
    DB_HOST=${DB_HOST:-127.0.0.1}
    DB_CHARSET=${DB_CHARSET:-utf8mb4}
fi

echo "Creating microservices databases..."

# Create SQL commands for multiple databases
cat > /tmp/setup_winyx_microservices.sql <<EOF
-- Core service database (authentication, users, organizations)
CREATE DATABASE IF NOT EXISTS winyx_core 
  DEFAULT CHARACTER SET ${DB_CHARSET} 
  DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;

-- Task management service database (future implementation)
CREATE DATABASE IF NOT EXISTS winyx_task 
  DEFAULT CHARACTER SET ${DB_CHARSET} 
  DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;

-- Messaging service database (future implementation)
CREATE DATABASE IF NOT EXISTS winyx_mem 
  DEFAULT CHARACTER SET ${DB_CHARSET} 
  DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;

-- Create user for all databases
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' 
  IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'${DB_HOST}' 
  IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges on all winyx databases
GRANT ALL PRIVILEGES ON winyx_core.* TO '${DB_USERNAME}'@'localhost';
GRANT ALL PRIVILEGES ON winyx_core.* TO '${DB_USERNAME}'@'${DB_HOST}';
GRANT ALL PRIVILEGES ON winyx_task.* TO '${DB_USERNAME}'@'localhost';
GRANT ALL PRIVILEGES ON winyx_task.* TO '${DB_USERNAME}'@'${DB_HOST}';
GRANT ALL PRIVILEGES ON winyx_mem.* TO '${DB_USERNAME}'@'localhost';
GRANT ALL PRIVILEGES ON winyx_mem.* TO '${DB_USERNAME}'@'${DB_HOST}';

FLUSH PRIVILEGES;
EOF

# Execute with sudo
sudo mysql < /tmp/setup_winyx_microservices.sql

# Clean up
rm -f /tmp/setup_winyx_microservices.sql
echo "Microservices databases setup complete."
echo "Created databases: winyx_core, winyx_task, winyx_mem"
```

- [ ] 実行権限を与える

```bash
chmod +x /var/www/winyx/scripts/setup_microservices_database.sh
```

> 目的：マイクロサービス用複数データベースの自動構築

- [ ] データベースの作成実行

```bash
/var/www/winyx/scripts/setup_microservices_database.sh
```

> 目的：winyx_core, winyx_task, winyx_memデータベースとwinyx_appユーザーを作成

### 2.2.2 winyx_coreスキーマ構築（UserService用）

- [ ] Core Database DDLの作成

```bash
vim /var/www/winyx/contracts/api/winyx_core_schema.sql
```
```sql
-- Winyx Core Database Schema (UserService)
-- Database: winyx_core

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

-- Organization tables (added in v1.1)
CREATE TABLE IF NOT EXISTS `orgs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '組織名',
  `description` text DEFAULT NULL COMMENT '組織説明',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `created_by` bigint unsigned NOT NULL COMMENT '作成者ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_orgs_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `org_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `org_id` bigint unsigned NOT NULL COMMENT '組織ID',
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `role` varchar(50) NOT NULL DEFAULT 'member' COMMENT '役割: owner, admin, member',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_org_user` (`org_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_org_members_org` FOREIGN KEY (`org_id`) REFERENCES `orgs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_org_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
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

-- RBAC tables
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '役割名',
  `description` text DEFAULT NULL COMMENT '役割説明',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `role_id` bigint unsigned NOT NULL COMMENT '役割ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_role` (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> 目的：UserService専用のwinyx_coreデータベーススキーマ定義

- [ ] goctl用外部キー制約なしバージョンの作成

```bash
vim /var/www/winyx/contracts/api/winyx_core_schema_no_fk.sql
```
```sql
-- Winyx Core Database Schema (Without Foreign Keys for goctl)
-- Database: winyx_core

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

CREATE TABLE IF NOT EXISTS `orgs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '組織名',
  `description` text DEFAULT NULL COMMENT '組織説明',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `created_by` bigint unsigned NOT NULL COMMENT '作成者ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `org_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `org_id` bigint unsigned NOT NULL COMMENT '組織ID',
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `role` varchar(50) NOT NULL DEFAULT 'member' COMMENT '役割: owner, admin, member',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT 'ステータス: 0=無効, 1=有効',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_org_user` (`org_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
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

CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '役割名',
  `description` text DEFAULT NULL COMMENT '役割説明',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'ユーザーID',
  `role_id` bigint unsigned NOT NULL COMMENT '役割ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_role` (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> 目的：goctl model生成用のDDL準備

- [ ] winyx_coreデータベースへのスキーマ適用

```bash
# 環境変数読み込み（Optional）
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
fi

# winyx_coreデータベースにスキーマ適用
mysql -h ${DB_HOST:-127.0.0.1} -u ${DB_USERNAME:-winyx_app} -p"${DB_PASSWORD}" -D winyx_core < /var/www/winyx/contracts/api/winyx_core_schema.sql
```

> 目的：UserService用テーブルを実際に作成

---

## 第3節 UserService構築（契約駆動開発）

### 2.3.1 Go-Zero UserServiceの初期化

- [ ] backendディレクトリでGoモジュール初期化

```bash
cd /var/www/winyx/backend
go mod init github.com/winyx/backend
go get github.com/zeromicro/go-zero@latest
```

> 目的：Go依存関係の管理基盤を用意

- [ ] UserService契約ファイルの作成（CLAUDE.md規約準拠）

```bash
mkdir -p /var/www/winyx/contracts/user_service
vim /var/www/winyx/contracts/user_service/user.api
```
```api
syntax = "v1"

info(
    title: "User Service API"
    desc: "Winyx User and Organization Management API"
    author: "Winyx Team"
    version: "v1.0"
)

// ========================================
// Type Definitions
// ========================================

// User types
type (
    UserRegisterReq {
        Name     string `json:"name" validate:"required,min=2,max=50"`
        Email    string `json:"email" validate:"required,email"`
        Password string `json:"password" validate:"required,min=6"`
    }

    UserLoginReq {
        Email    string `json:"email" validate:"required,email"`
        Password string `json:"password" validate:"required"`
    }

    UserLoginResp {
        Id          int64  `json:"id"`
        Name        string `json:"name"`
        Email       string `json:"email"`
        AccessToken string `json:"access_token"`
        ExpireTime  int64  `json:"expire_time"`
    }

    UserInfoResp {
        Id     int64  `json:"id"`
        Name   string `json:"name"`
        Email  string `json:"email"`
        Status int64  `json:"status"`
    }

    UserListResp {
        Users []UserInfoResp `json:"users"`
        Total int64          `json:"total"`
    }
)

// Organization types
type (
    OrgCreateReq {
        Name        string `json:"name" validate:"required,min=2,max=100"`
        Description string `json:"description,optional"`
    }

    OrgResp {
        Id          int64  `json:"id"`
        Name        string `json:"name"`
        Description string `json:"description"`
        CreatedBy   int64  `json:"created_by"`
        CreatedAt   string `json:"created_at"`
    }

    OrgListResp {
        Orgs  []OrgResp `json:"orgs"`
        Total int64     `json:"total"`
    }
)

// ========================================
// Public APIs (No Authentication)
// ========================================

@server(
    group: user
    prefix: /api/v1
)
service user-api {
    @doc "User registration"
    @handler UserRegister
    post /register (UserRegisterReq) returns (UserInfoResp)

    @doc "User login"
    @handler UserLogin
    post /login (UserLoginReq) returns (UserLoginResp)
}

// ========================================
// Protected APIs (JWT Authentication Required)
// ========================================

@server(
    jwt: Auth
    group: protected
    prefix: /api/v1
    middleware: UserAuth
)
service user-api {
    @doc "Get current user info"
    @handler UserInfo
    get /user/info returns (UserInfoResp)

    @doc "Get user list (admin only)"
    @handler UserList
    get /users returns (UserListResp)
}

// ========================================
// Organization APIs (JWT Authentication Required)
// ========================================

@server(
    jwt: Auth
    group: org
    prefix: /api/v1/orgs
    middleware: UserAuth
)
service user-api {
    @doc "Create organization"
    @handler CreateOrg
    post / (OrgCreateReq) returns (OrgResp)

    @doc "Get my organizations"
    @handler ListMyOrgs
    get /my returns (OrgListResp)

    @doc "Get organization by ID"
    @handler GetOrg
    get /:id returns (OrgResp)

    @doc "Update organization"
    @handler UpdateOrg
    put /:id (OrgCreateReq) returns (OrgResp)

    @doc "Delete organization"
    @handler DeleteOrg
    delete /:id
}
```

> 目的：実装済み機能を反映したAPI契約定義

- [ ] UserServiceの生成（契約駆動）

```bash
cd /var/www/winyx/backend
mkdir -p user_service
cd user_service
goctl api go -api /var/www/winyx/contracts/user_service/user.api -dir . -style go_zero
```

> 目的：契約ファイルからUserServiceコードを自動生成

### 2.3.1.1 編集可能ファイルと制限【重要】

生成後のディレクトリ構造と編集制限：

```
user_service/
├── etc/
│   └── user_service-api.yaml    # ✅ 編集可能（設定）
├── internal/
│   ├── config/
│   │   └── config.go            # ❌ 編集禁止（自動生成）
│   ├── handler/                 # ❌ 編集禁止（自動生成）
│   │   ├── routes.go
│   │   └── *.go
│   ├── logic/                   # ✅ 編集可能（ビジネスロジック）
│   │   └── *.go
│   ├── middleware/              # ✅ 編集可能（カスタムミドルウェア）
│   │   └── userauthmiddleware.go
│   ├── model/                   # ⚠️ 条件付き編集（拡張のみ）
│   │   └── *.go
│   ├── svc/                     # ⚠️ 最小限の編集（DI設定）
│   │   └── servicecontext.go
│   └── types/                   # ❌ 編集禁止（自動生成）
│       └── types.go
└── user_service.go              # ❌ 編集禁止（自動生成）
```

**編集ルール**:
- ✅ **編集可能**: ビジネスロジックやカスタム実装
- ❌ **編集禁止**: 再生成で上書きされるファイル
- ⚠️ **条件付き編集**: 拡張は可能だが基本構造は変更不可

> 目的：goctl再生成時にビジネスロジックを保護

### 2.3.1.2 契約変更時の再生成フロー

#### 安全な再生成手順

- [ ] ビジネスロジックのバックアップ

```bash
# 1. 現在の実装をバックアップ
cd /var/www/winyx/backend/user_service
cp -r internal/logic internal/logic.backup
cp -r internal/middleware internal/middleware.backup
```

- [ ] 契約ファイルの更新

```bash
# 2. 契約ファイルを更新
vim /var/www/winyx/contracts/user_service/user.api
```

- [ ] コードの再生成

```bash
# 3. 再生成実行
goctl api go -api /var/www/winyx/contracts/user_service/user.api -dir . -style go_zero
```

- [ ] ロジックの確認と復元

```bash
# 4. ロジックファイルの確認（保持されているはず）
diff -r internal/logic.backup internal/logic

# 5. 必要に応じて手動マージ
# 新規エンドポイントのロジックファイルが生成されている
ls -la internal/logic/
```

> 目的：契約変更に追従しつつビジネスロジックを保護

### 2.3.1.3 ビジネスロジック実装例

#### 生成されたロジックファイルの編集

- [ ] UserRegisterロジックの実装例

```go
// internal/logic/userregisterlogic.go（編集可能）
package logic

import (
    "context"
    "golang.org/x/crypto/bcrypt"
    
    "github.com/winyx/backend/user_service/internal/svc"
    "github.com/winyx/backend/user_service/internal/types"
    "github.com/winyx/backend/user_service/internal/model"
    
    "github.com/zeromicro/go-zero/core/logx"
)

type UserRegisterLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewUserRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserRegisterLogic {
    return &UserRegisterLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *UserRegisterLogic) UserRegister(req *types.UserRegisterReq) (resp *types.UserInfoResp, err error) {
    // ========================================
    // ビジネスロジックをここに実装
    // ========================================
    
    // 1. 入力検証（追加のビジネスルール）
    if len(req.Password) < 8 {
        return nil, errors.New("password must be at least 8 characters")
    }
    
    // 2. メールアドレスの重複チェック
    existingUser, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
    if err != nil && err != model.ErrNotFound {
        return nil, err
    }
    if existingUser != nil {
        return nil, errors.New("email already registered")
    }
    
    // 3. パスワードのハッシュ化
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        logx.Errorf("failed to hash password: %v", err)
        return nil, errors.New("internal server error")
    }
    
    // 4. ユーザー作成
    user := &model.Users{
        Name:     req.Name,
        Email:    req.Email,
        Password: string(hashedPassword),
        Status:   1, // アクティブ
    }
    
    result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
    if err != nil {
        logx.Errorf("failed to insert user: %v", err)
        return nil, errors.New("failed to create user")
    }
    
    userId, _ := result.LastInsertId()
    
    // 5. プロフィール初期化（オプション）
    profile := &model.UserProfiles{
        UserId: userId,
    }
    _, err = l.svcCtx.UserProfilesModel.Insert(l.ctx, profile)
    if err != nil {
        logx.Warnf("failed to create user profile: %v", err)
        // プロフィール作成失敗はエラーにしない
    }
    
    // 6. レスポンス作成
    return &types.UserInfoResp{
        Id:     userId,
        Name:   req.Name,
        Email:  req.Email,
        Status: 1,
    }, nil
}
```

> 目的：自動生成されたロジックファイルにビジネスロジックを実装

### 2.3.1.4 ServiceContextの設定（DI設定）

#### サービスコンテキストの編集

- [ ] ServiceContextにモデルを登録

```go
// internal/svc/servicecontext.go（最小限の編集）
package svc

import (
    "github.com/winyx/backend/user_service/internal/config"
    "github.com/winyx/backend/user_service/internal/model"
    "github.com/winyx/backend/user_service/internal/middleware"
    
    "github.com/zeromicro/go-zero/core/stores/cache"
    "github.com/zeromicro/go-zero/core/stores/sqlx"
    "github.com/zeromicro/go-zero/rest"
)

type ServiceContext struct {
    Config            config.Config
    
    // ========================================
    // モデルの登録（編集可能部分）
    // ========================================
    UsersModel        model.UsersModel
    UserProfilesModel model.UserProfilesModel
    OrgsModel         model.OrgsModel
    OrgMembersModel   model.OrgMembersModel
    SessionsModel     model.SessionsModel
    RolesModel        model.RolesModel
    UserRolesModel    model.UserRolesModel
    
    // ミドルウェアの登録
    UserAuth rest.Middleware
}

func NewServiceContext(c config.Config) *ServiceContext {
    // データベース接続
    conn := sqlx.NewMysql(c.Mysql.DataSource)
    
    // キャッシュ設定
    cacheConf := cache.CacheConf{
        c.Cache,
    }
    
    return &ServiceContext{
        Config: c,
        
        // ========================================
        // モデルの初期化（編集可能部分）
        // ========================================
        UsersModel:        model.NewUsersModel(conn, cacheConf),
        UserProfilesModel: model.NewUserProfilesModel(conn, cacheConf),
        OrgsModel:         model.NewOrgsModel(conn, cacheConf),
        OrgMembersModel:   model.NewOrgMembersModel(conn, cacheConf),
        SessionsModel:     model.NewSessionsModel(conn, cacheConf),
        RolesModel:        model.NewRolesModel(conn, cacheConf),
        UserRolesModel:    model.NewUserRolesModel(conn, cacheConf),
        
        // ミドルウェアの初期化
        UserAuth: middleware.NewUserAuthMiddleware(c).Handle,
    }
}
```

> 目的：自動生成されたServiceContextにモデルとミドルウェアを登録

### 2.3.2 データベースモデル生成（Redisキャッシュ対応）

- [ ] Redisキャッシュ対応モデルの生成

```bash
cd /var/www/winyx/backend/user_service
goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/winyx_core_schema_no_fk.sql \
  -dir ./internal/model \
  -c
```

> 目的：CRUD操作とRedisキャッシュ対応のモデルコードを自動生成

### 2.3.3 サービス設定（CLAUDE.md規約準拠）

- [ ] UserService設定ファイルの作成

```bash
vim /var/www/winyx/backend/user_service/etc/user_service-api.yaml
```
```yaml
Name: user_service
Host: 0.0.0.0
Port: 8888

Mysql:
  DataSource: "winyx_app:Winyx$7377@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

Cache:
  - Host: 127.0.0.1:6379
    Pass: ""
    Type: node

Auth:
  AccessSecret: "CHANGE_ME_SUPER_SECRET_256BIT"
  AccessExpire: 86400

Log:
  Level: info
  Compress: true
  KeepDays: 7
  StackCooldownMillis: 100
```

> 目的：CLAUDE.md命名規約に従った設定ファイル

### 2.3.4 systemdサービス化（Winyx標準）

- [ ] systemdサービスファイルの作成

```bash
sudo vim /etc/systemd/system/winyx-user.service
```
```ini
[Unit]
Description=Winyx User Service
After=network.target mysql.service redis.service
Wants=mysql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/winyx/backend/user_service
Environment=GOPATH=/tmp/go
Environment=GOCACHE=/tmp/go-cache
ExecStart=/var/www/winyx/backend/user_service/user_service -f etc/user_service-api.yaml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=winyx-user

[Install]
WantedBy=multi-user.target
```

> 目的：CLAUDE.md規約（winyx-{service}.service）に従ったサービス化

### 2.3.5 ビルドと起動

- [ ] UserServiceのビルドと起動

```bash
cd /var/www/winyx/backend/user_service
go mod tidy
go build -o user_service userservice.go

# systemdサービスとして管理
sudo systemctl daemon-reload
sudo systemctl enable winyx-user
sudo systemctl start winyx-user
```

> 目的：サービスのビルドとsystemd管理下での起動

---

## 第4節 API仕様書とドキュメント生成

### 2.4.1 Swagger仕様書の生成

- [ ] OpenAPI仕様書の生成

```bash
cd /var/www/winyx/backend/user_service
goctl api swagger --api /var/www/winyx/contracts/user_service/user.api --dir /var/www/winyx/docs --filename swagger
```

> 目的：API仕様書を自動生成

- [ ] Swagger UIの準備（既存を活用）

```bash
# 既存のSwagger UIを確認
ls -la /var/www/winyx/docs/swagger-ui/

# swagger.jsonの参照先確認
grep -n "swagger.json" /var/www/winyx/docs/swagger-ui/swagger-initializer.js
```

> 目的：既存Swagger UIの活用確認

---

## 第5節 検証とテスト

### 2.5.1 データベース接続テスト

```bash
# マイクロサービス用データベースの確認
mysql -h 127.0.0.1 -u winyx_app -p"Winyx\$7377" -e "SHOW DATABASES LIKE 'winyx_%';"
```

期待される出力：
```
+------------------+
| Database (winyx_%) |
+------------------+
| winyx_core       |
| winyx_mem        |
| winyx_task       |
+------------------+
```

### 2.5.2 UserService API テスト

```bash
# サービス状態確認
sudo systemctl status winyx-user

# API疎通確認
curl -X POST http://127.0.0.1:8888/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }' | jq .
```

### 2.5.3 組織管理APIテスト

```bash
# ログインしてJWTトークン取得
TOKEN=$(curl -X POST http://127.0.0.1:8888/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.access_token')

# 組織作成
curl -X POST http://127.0.0.1:8888/api/v1/orgs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Organization",
    "description": "Test organization description"
  }' | jq .
```

---

## 第6節 トラブルシューティング

### 問題1：複数データベース接続エラー

**症状**: Database connection failed for winyx_core

**解決策**:
```bash
# データベース存在確認
mysql -h 127.0.0.1 -u winyx_app -p"Winyx\$7377" -e "USE winyx_core; SHOW TABLES;"

# 権限確認
mysql -h 127.0.0.1 -u winyx_app -p"Winyx\$7377" -e "SHOW GRANTS;"
```

### 問題2：goctl model生成エラー（外部キー制約）

**解決策**:
```bash
# 外部キー制約なしバージョンを使用
goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/winyx_core_schema_no_fk.sql \
  -dir ./internal/model -c
```

### 問題3：systemdサービス起動エラー

**解決策**:
```bash
# ログ確認
journalctl -u winyx-user -f

# 権限確認
sudo chown -R www-data:www-data /var/www/winyx/backend/user_service
```

---

## 第7節 注意点とベストプラクティス

### 命名規約（CLAUDE.md準拠）

1. **サービス名**: `snake_case` または `lowerCamel` （ハイフン禁止）
2. **設定ファイル名**: `{service}-api.yaml` （例：`user_service-api.yaml`）
3. **systemdサービス名**: `winyx-{service}.service` （例：`winyx-user.service`）

### データベース設計原則

1. **Database per Service**: 各マイクロサービスが専用データベースを持つ
2. **サービス間通信**: API呼び出しでデータ取得（直接DB接続禁止）
3. **データ整合性**: 各サービス内でのACID特性を保証

### 設定管理戦略

1. **YAML個別管理**: 各サービスが独自のYAML設定ファイルを持つ
2. **環境変数併用**: 共通設定は`.env`ファイルで管理（Optional）
3. **機密情報**: systemd EnvironmentFileまたは専用設定ファイル

---

## まとめ

第2章v1.1では以下を実現しました：

1. **マイクロサービス対応**: 複数データベース（winyx_core, winyx_task, winyx_mem）の構築
2. **契約駆動開発**: API契約ファイルからのコード自動生成
3. **実装反映**: 実際のプロジェクト構造に基づいたディレクトリ配置
4. **CLAUDE.md準拠**: 命名規約とファイル配置規則の遵守
5. **systemd管理**: 本番運用に適したサービス管理

### 主要変更点（v1.0 → v1.1）

| 項目 | v1.0 | v1.1 |
|------|------|------|
| **データベース** | 単一DB（winyx_core） | 複数DB（core/task/mem） |
| **設定管理** | .env一元管理 | YAML個別 + .env併用 |
| **ディレクトリ構造** | 理論的配置 | 実装済み構造 |
| **契約配置** | contracts/{api,rpc} | contracts/{user_service,service_communication} |
| **サービス名** | test_api | user_service（実際のサービス） |

---

**ドキュメント更新日**: 2025年8月16日  
**バージョン**: 1.1  
**作成者**: Winyx Team  
**更新内容**: マイクロサービス対応と実装状況反映で全面改訂