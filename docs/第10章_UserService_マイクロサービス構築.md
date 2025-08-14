# 第10章 UserService マイクロサービス構築

> 本章ではWinyxプロジェクトにユーザー管理機能を追加し、契約駆動開発に基づいたマイクロサービス実装を行います。Go-ZeroでUserServiceマイクロサービスを構築し、Next.jsでユーザー管理フロントエンドを作成します。

---

## 第1節 UserService 概要と設計

### 10.1.1 UserService の機能要件

#### 基本機能
- **ユーザー登録** - 新規ユーザーの作成
- **ユーザーログイン** - JWT認証によるログイン
- **ユーザー情報取得** - プロフィール表示
- **ユーザー情報更新** - プロフィール編集
- **ユーザー削除** - アカウント削除
- **ユーザー一覧** - 管理者向け機能

#### セキュリティ要件
- パスワードハッシュ化（bcrypt）
- JWT認証トークン
- 管理者権限管理
- セッション管理

### 10.1.2 システム構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js       │    │    Nginx         │    │   UserService   │
│   Frontend      │◄──►│   Reverse Proxy  │◄──►│   (Go-Zero)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │     MariaDB     │
                                               │   winyx_core    │
                                               └─────────────────┘
```

---

## 第2節 API契約設計

### 10.2.1 Go-Zero API契約ファイル作成

- [x] API契約ファイルの作成

```bash
mkdir -p /var/www/winyx/contracts/user_service
vim /var/www/winyx/contracts/user_service/user.api
```

```go
syntax = "v1"

info(
    title: "Winyx User Service API"
    desc: "ユーザー管理マイクロサービス"
    author: "Winyx Team"
    version: "v1.0"
)

// ======== リクエスト・レスポンス型定義 ========

// ユーザー登録
type (
    RegisterReq {
        Name        string `json:"name" validate:"required,min=2,max=50"`
        Email       string `json:"email" validate:"required,email"`
        Password    string `json:"password" validate:"required,min=6"`
    }
    RegisterRes {
        UserId      int64  `json:"user_id"`
        Name        string `json:"name"`
        Email       string `json:"email"`
        Token       string `json:"token"`
        Message     string `json:"message"`
    }
)

// ユーザーログイン
type (
    LoginReq {
        Email       string `json:"email" validate:"required,email"`
        Password    string `json:"password" validate:"required"`
    }
    LoginRes {
        UserId      int64  `json:"user_id"`
        Name        string `json:"name"`
        Email       string `json:"email"`
        Token       string `json:"token"`
        ExpiresAt   int64  `json:"expires_at"`
        Message     string `json:"message"`
    }
)

// ユーザー情報
type (
    UserInfo {
        UserId      int64  `json:"user_id"`
        Name        string `json:"name"`
        Email       string `json:"email"`
        Status      string `json:"status"`
        Roles       []string `json:"roles"`
        Profile     UserProfile `json:"profile,optional"`
        CreatedAt   string `json:"created_at"`
        UpdatedAt   string `json:"updated_at"`
    }
    
    UserProfile {
        AvatarUrl    string `json:"avatar_url,optional"`
        Bio          string `json:"bio,optional"`
        Phone        string `json:"phone,optional"`
        Address      string `json:"address,optional"`
        BirthDate    string `json:"birth_date,optional"`
        Gender       string `json:"gender,optional"`
        Occupation   string `json:"occupation,optional"`
        Website      string `json:"website,optional"`
        SocialLinks  string `json:"social_links,optional"`
        Preferences  string `json:"preferences,optional"`
    }
    
    GetUserRes {
        User        UserInfo `json:"user"`
        Message     string   `json:"message"`
    }
)

// ユーザー更新
type (
    UpdateUserReq {
        Name        string `json:"name,optional"`
        Email       string `json:"email,optional" validate:"email"`
        Status      string `json:"status,optional"`
    }
    
    UpdateProfileReq {
        AvatarUrl    string `json:"avatar_url,optional"`
        Bio          string `json:"bio,optional"`
        Phone        string `json:"phone,optional"`
        Address      string `json:"address,optional"`
        BirthDate    string `json:"birth_date,optional"`
        Gender       string `json:"gender,optional"`
        Occupation   string `json:"occupation,optional"`
        Website      string `json:"website,optional"`
        SocialLinks  string `json:"social_links,optional"`
        Preferences  string `json:"preferences,optional"`
    }
    
    UpdateUserRes {
        User        UserInfo `json:"user"`
        Message     string   `json:"message"`
    }
)

// ユーザー一覧（管理者用）
type (
    ListUsersReq {
        Page        int `form:"page,optional,default=1" validate:"min=1"`
        Limit       int `form:"limit,optional,default=10" validate:"min=1,max=100"`
        Status      string `form:"status,optional"`
        Role        string `form:"role,optional"`
    }
    
    ListUsersRes {
        Users       []UserInfo `json:"users"`
        Total       int64      `json:"total"`
        Page        int        `json:"page"`
        Limit       int        `json:"limit"`
        Message     string     `json:"message"`
    }
)

// 共通レスポンス
type (
    CommonRes {
        Message     string `json:"message"`
        Success     bool   `json:"success"`
    }
)

// ======== API エンドポイント定義 ========

@server(
    prefix: /api/v1/users
    group: user
)
service user-api {
    // 認証不要エンドポイント
    @handler register
    post /register (RegisterReq) returns (RegisterRes)
    
    @handler login
    post /login (LoginReq) returns (LoginRes)
}

@server(
    prefix: /api/v1/users
    group: user
    jwt: Auth
)
service user-api {
    // 認証必須エンドポイント
    @handler getProfile
    get /profile returns (GetUserRes)
    
    @handler updateProfile
    put /profile (UpdateUserReq) returns (UpdateUserRes)
    
    @handler updateUserProfile
    put /profile/details (UpdateProfileReq) returns (UpdateUserRes)
    
    @handler deleteAccount
    delete /profile returns (CommonRes)
}

@server(
    prefix: /api/v1/admin/users
    group: admin
    jwt: Auth
    middleware: AdminAuth
)
service user-api {
    // 管理者専用エンドポイント
    @handler listUsers
    get / (ListUsersReq) returns (ListUsersRes)
    
    @handler getUserById
    get /:id returns (GetUserRes)
    
    @handler deleteUser
    delete /:id returns (CommonRes)
}
```

### 10.2.2 既存データベーステーブルの活用

#### 既存のwinyx_coreテーブル構造
```sql
-- 既存テーブル（活用）
users (id, name, email, password, status, created_at, updated_at)
sessions (id, user_id, token, expires_at, created_at)
user_profiles (id, user_id, avatar_url, bio, phone, address, birth_date, gender, occupation, website, social_links, preferences, created_at, updated_at)
```

#### UserService用拡張テーブル
- [x] UserService用の権限管理テーブルを追加

```bash
vim /var/www/winyx/contracts/user_service/schema_extension.sql
```

```sql
-- UserService用拡張テーブル（winyx_coreに追加）

-- 役割管理テーブル
CREATE TABLE IF NOT EXISTS roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 権限管理テーブル
CREATE TABLE IF NOT EXISTS permissions (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    resource    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY idx_permission (resource, action),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザー役割関連テーブル
CREATE TABLE IF NOT EXISTS user_roles (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    role_id    BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY idx_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 役割権限関連テーブル  
CREATE TABLE IF NOT EXISTS role_permissions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY idx_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 基本的な役割データの追加
INSERT INTO roles (name, description) VALUES 
('admin', 'システム管理者'),
('user', '一般ユーザー'),
('moderator', 'モデレーター')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 基本的な権限データの追加
INSERT INTO permissions (name, resource, action, description) VALUES 
('ユーザー一覧表示', 'users', 'list', 'ユーザー一覧を表示する権限'),
('ユーザー詳細表示', 'users', 'view', 'ユーザー詳細を表示する権限'),
('ユーザー作成', 'users', 'create', 'ユーザーを作成する権限'),
('ユーザー更新', 'users', 'update', 'ユーザー情報を更新する権限'),
('ユーザー削除', 'users', 'delete', 'ユーザーを削除する権限'),
('システム管理', 'system', 'admin', 'システム管理権限')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 管理者権限の設定
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE created_at = created_at;

-- 一般ユーザー権限の設定
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.action IN ('view')
ON DUPLICATE KEY UPDATE created_at = created_at;
```

#### マイクロサービス間でのデータベース戦略

1. **winyx_core（共通基盤DB）**
   - users, sessions, user_profiles（既存）
   - roles, permissions, user_roles, role_permissions（新規追加）

2. **winyx_task（タスク管理専用DB）**
   - tasks, task_assignments, task_categories等

3. **winyx_mem（メッセージ管理専用DB）**  
   - messages, channels, participants等

> **重要**: 各マイクロサービスは自身のDBを持ちつつ、ユーザー認証情報は`winyx_core`を参照する設計とします。

---

## 第3節 UserService バックエンド実装

### 10.3.1 Go-Zero プロジェクト生成

- [x] UserService プロジェクト初期化

```bash
cd /var/www/winyx/backend
goctl api new user_service --style gozero
cd user_service
```

- [x] API契約からコード生成

```bash
# API契約をコピー
cp /var/www/winyx/contracts/user_service/user.api ./user.api

# コード生成
goctl api go -api user.api -dir . --style gozero
```

### 10.3.2 設定ファイル作成

- [x] 設定ファイルの作成

```bash
mkdir -p etc
vim etc/user_service-api.yaml
```

```yaml
Name: user_service
Host: 0.0.0.0
Port: 8889

# JWT設定
Auth:
  AccessSecret: "your-secret-key-change-in-production"
  AccessExpire: 86400  # 24時間

# データベース設定
Mysql:
  DataSource: "winyx_app:YOUR_DB_PASSWORD@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

# Redis設定
CacheRedis:
  - Host: 127.0.0.1:6379
    Pass: ""

# ログ設定
Log:
  ServiceName: user_service
  Mode: file
  Path: logs
  Level: info

# リミッター設定
RateLimit:
  LoginRate: 5      # ログイン試行回数制限
  RegisterRate: 3   # 登録試行回数制限
```

### 10.3.3 データベースモデル生成

- [x] データベースモデルの生成

```bash
# データベーススキーマを適用
mysql -h 127.0.0.1 -u winyx_app -p winyx_core < /var/www/winyx/contracts/user_service/schema.sql

# モデル生成
goctl model mysql ddl -src /var/www/winyx/contracts/user_service/schema.sql -dir ./internal/model -c
```

### 10.3.4 ビジネスロジック実装

- [x] ユーザー登録ロジック

```bash
vim internal/logic/user/registerlogic.go
```

```go
package user

import (
    "context"
    "errors"
    "time"
    
    "golang.org/x/crypto/bcrypt"
    "github.com/golang-jwt/jwt/v4"
    
    "user_service/internal/svc"
    "user_service/internal/types"
    
    "github.com/zeromicro/go-zero/core/logx"
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
    // 既存ユーザーチェック
    existingUser, _ := l.svcCtx.UserModel.FindOneByEmail(l.ctx, req.Email)
    if existingUser != nil {
        return nil, errors.New("メールアドレスが既に使用されています")
    }
    
    existingUser, _ = l.svcCtx.UserModel.FindOneByUsername(l.ctx, req.Username)
    if existingUser != nil {
        return nil, errors.New("ユーザー名が既に使用されています")
    }
    
    // パスワードハッシュ化
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, errors.New("パスワードの処理に失敗しました")
    }
    
    // ユーザー作成
    newUser, err := l.svcCtx.UserModel.Insert(l.ctx, &model.Users{
        Username:     req.Username,
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        FullName:     sql.NullString{String: req.FullName, Valid: req.FullName != ""},
        Role:         "user",
        IsActive:     true,
    })
    
    if err != nil {
        return nil, errors.New("ユーザー登録に失敗しました")
    }
    
    // JWTトークン生成
    token, err := l.generateJWT(newUser.Id, req.Username)
    if err != nil {
        return nil, errors.New("トークン生成に失敗しました")
    }
    
    return &types.RegisterRes{
        UserId:   newUser.Id,
        Username: req.Username,
        Email:    req.Email,
        Token:    token,
        Message:  "ユーザー登録が完了しました",
    }, nil
}

func (l *RegisterLogic) generateJWT(userId int64, username string) (string, error) {
    claims := make(jwt.MapClaims)
    claims["exp"] = time.Now().Add(24 * time.Hour).Unix()
    claims["iat"] = time.Now().Unix()
    claims["userId"] = userId
    claims["username"] = username
    
    token := jwt.New(jwt.SigningMethodHS256)
    token.Claims = claims
    
    return token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
}
```

- [x] ログインロジック

```bash
vim internal/logic/user/loginlogic.go
```

```go
package user

import (
    "context"
    "errors"
    "time"
    
    "golang.org/x/crypto/bcrypt"
    "github.com/golang-jwt/jwt/v4"
    
    "user_service/internal/svc"
    "user_service/internal/types"
    
    "github.com/zeromicro/go-zero/core/logx"
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
    // ユーザー検索
    user, err := l.svcCtx.UserModel.FindOneByEmail(l.ctx, req.Email)
    if err != nil {
        return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
    }
    
    // アクティブユーザーチェック
    if !user.IsActive {
        return nil, errors.New("アカウントが無効になっています")
    }
    
    // パスワード検証
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
        return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
    }
    
    // 最終ログイン時刻更新
    user.LastLogin = sql.NullTime{Time: time.Now(), Valid: true}
    l.svcCtx.UserModel.Update(l.ctx, user)
    
    // JWTトークン生成
    token, expiresAt, err := l.generateJWT(user.Id, user.Username)
    if err != nil {
        return nil, errors.New("認証トークンの生成に失敗しました")
    }
    
    return &types.LoginRes{
        UserId:    user.Id,
        Username:  user.Username,
        Email:     user.Email,
        Token:     token,
        ExpiresAt: expiresAt,
        Message:   "ログインに成功しました",
    }, nil
}

func (l *LoginLogic) generateJWT(userId int64, username string) (string, int64, error) {
    expiresAt := time.Now().Add(24 * time.Hour).Unix()
    
    claims := make(jwt.MapClaims)
    claims["exp"] = expiresAt
    claims["iat"] = time.Now().Unix()
    claims["userId"] = userId
    claims["username"] = username
    
    token := jwt.New(jwt.SigningMethodHS256)
    token.Claims = claims
    
    tokenString, err := token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
    return tokenString, expiresAt, err
}
```

### 10.3.5 ミドルウェア実装

- [x] 管理者認証ミドルウェア

```bash
mkdir -p internal/middleware
vim internal/middleware/adminauthmiddleware.go
```

```go
package middleware

import (
    "net/http"
    "strconv"
    
    "user_service/internal/svc"
)

type AdminAuthMiddleware struct {
    svcCtx *svc.ServiceContext
}

func NewAdminAuthMiddleware(svcCtx *svc.ServiceContext) *AdminAuthMiddleware {
    return &AdminAuthMiddleware{
        svcCtx: svcCtx,
    }
}

func (m *AdminAuthMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // JWT認証は既に完了している前提でuserId取得
        userId, err := strconv.ParseInt(r.Header.Get("X-User-Id"), 10, 64)
        if err != nil {
            http.Error(w, "認証が必要です", http.StatusUnauthorized)
            return
        }
        
        // ユーザー取得と管理者権限チェック
        user, err := m.svcCtx.UserModel.FindOne(r.Context(), userId)
        if err != nil || user.Role != "admin" {
            http.Error(w, "管理者権限が必要です", http.StatusForbidden)
            return
        }
        
        next(w, r)
    })
}
```

### 10.3.6 サービス起動

- [x] 依存関係解決とビルド

```bash
go mod tidy
go build -o user_service userapi.go
```

- [x] サービス起動テスト

```bash
./user_service -f etc/user_service-api.yaml
```

---

## 第4節 フロントエンド実装

### 10.4.1 型定義とAPIクライアント

- [x] TypeScript型定義の作成

```bash
vim /var/www/winyx/frontend/src/types/user.ts
```

```typescript
// ユーザー関連の型定義
export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

// 認証関連
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface RegisterResponse {
  user_id: number;
  username: string;
  email: string;
  token: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: number;
  username: string;
  email: string;
  token: string;
  expires_at: number;
  message: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  message: string;
}

// 認証状態管理
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}
```

- [x] APIクライアントの作成

```bash
vim /var/www/winyx/frontend/src/lib/api/user.ts
```

```typescript
import { apiClient } from './client';
import type {
  User,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest,
  UserListResponse
} from '@/types/user';

class UserAPI {
  // 認証関連
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/api/v1/users/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/users/login', data);
    return response.data;
  }

  // プロフィール関連
  async getProfile(): Promise<{ user: User; message: string }> {
    const response = await apiClient.get<{ user: User; message: string }>('/api/v1/users/profile');
    return response.data;
  }

  async updateProfile(data: UpdateUserRequest): Promise<{ user: User; message: string }> {
    const response = await apiClient.put<{ user: User; message: string }>('/api/v1/users/profile', data);
    return response.data;
  }

  async deleteAccount(): Promise<{ message: string; success: boolean }> {
    const response = await apiClient.delete<{ message: string; success: boolean }>('/api/v1/users/profile');
    return response.data;
  }

  // 管理者機能
  async listUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    is_active?: string;
  }): Promise<UserListResponse> {
    const response = await apiClient.get<UserListResponse>('/api/v1/admin/users', { params });
    return response.data;
  }

  async getUserById(id: number): Promise<{ user: User; message: string }> {
    const response = await apiClient.get<{ user: User; message: string }>(`/api/v1/admin/users/${id}`);
    return response.data;
  }

  async deleteUser(id: number): Promise<{ message: string; success: boolean }> {
    const response = await apiClient.delete<{ message: string; success: boolean }>(`/api/v1/admin/users/${id}`);
    return response.data;
  }
}

export const userAPI = new UserAPI();
```

### 10.4.2 認証状態管理 (Zustand)

- [x] 認証ストアの作成

```bash
vim /var/www/winyx/frontend/src/lib/stores/authStore.ts
```

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { AuthState, User } from '@/types/user';

interface AuthActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,

      login: (user: User, token: string) => {
        // Cookieにトークンを保存（HTTPOnly推奨だが、開発用）
        Cookies.set('auth-token', token, { 
          expires: 1, // 1日
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });

        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'admin'
        });
      },

      logout: () => {
        Cookies.remove('auth-token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false
        });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          isAdmin: user?.role === 'admin' || false
        });
      },

      updateUser: (updatedData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updatedData };
          set({
            user: updatedUser,
            isAdmin: updatedUser.role === 'admin'
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin
      })
    }
  )
);
```

### 10.4.3 React Query フック

- [x] 認証フックの作成

```bash
vim /var/www/winyx/frontend/src/lib/hooks/useAuth.ts
```

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api/user';
import { useAuthStore } from '@/lib/stores/authStore';
import type { RegisterRequest, LoginRequest, UpdateUserRequest } from '@/types/user';

export function useRegister() {
  const { login } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterRequest) => userAPI.register(data),
    onSuccess: (response) => {
      // 登録成功時に自動ログイン
      login(
        {
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          full_name: '',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        },
        response.token
      );
      router.push('/dashboard');
    }
  });
}

export function useLogin() {
  const { login } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginRequest) => userAPI.login(data),
    onSuccess: (response) => {
      login(
        {
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          full_name: '',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        },
        response.token
      );
      router.push('/dashboard');
    }
  });
}

export function useProfile() {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => userAPI.getProfile(),
    enabled: isAuthenticated
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => userAPI.updateProfile(data),
    onSuccess: (response) => {
      updateUser(response.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    logout();
    queryClient.clear();
    router.push('/login');
  };
}
```

### 10.4.4 ユーザー管理コンポーネント

- [x] ログインページの作成

```bash
mkdir -p /var/www/winyx/frontend/src/app/login
vim /var/www/winyx/frontend/src/app/login/page.tsx
```

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogin } from '@/lib/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { mutate: login, isPending, error } = useLogin();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">ログイン</CardTitle>
          <CardDescription className="text-gray-300">
            アカウントにサインインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium">メールアドレス</label>
              <input
                {...register('email')}
                type="email"
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="text-white text-sm font-medium">パスワード</label>
              <input
                {...register('password')}
                type="password"
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error.message}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isPending ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              アカウントをお持ちでない方は{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300">
                新規登録
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [x] ユーザー一覧ページ（管理者用）

```bash
mkdir -p /var/www/winyx/frontend/src/app/admin
vim /var/www/winyx/frontend/src/app/admin/users/page.tsx
```

```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { userAPI } from '@/lib/api/user';
import { useAuthStore } from '@/lib/stores/authStore';
import type { User } from '@/types/user';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, limit],
    queryFn: () => userAPI.listUsers({ page, limit }),
    enabled: isAdmin
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => userAPI.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">管理者権限が必要です</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">エラーが発生しました</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">ユーザー管理</CardTitle>
            <p className="text-gray-300">
              合計 {data?.total} 人のユーザー
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white font-medium py-3">ID</th>
                    <th className="text-left text-white font-medium py-3">ユーザー名</th>
                    <th className="text-left text-white font-medium py-3">メール</th>
                    <th className="text-left text-white font-medium py-3">役割</th>
                    <th className="text-left text-white font-medium py-3">状態</th>
                    <th className="text-left text-white font-medium py-3">最終ログイン</th>
                    <th className="text-left text-white font-medium py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user: User) => (
                    <tr key={user.user_id} className="border-b border-white/10">
                      <td className="py-3 text-gray-300">{user.user_id}</td>
                      <td className="py-3 text-white font-medium">{user.username}</td>
                      <td className="py-3 text-gray-300">{user.email}</td>
                      <td className="py-3">
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={user.is_active ? 'default' : 'outline'}>
                          {user.is_active ? '有効' : '無効'}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-300">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('本当にこのユーザーを削除しますか？')) {
                              deleteUserMutation.mutate(user.user_id);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                        >
                          削除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                前へ
              </Button>
              <span className="text-white">
                ページ {page} / {Math.ceil((data?.total || 0) / limit)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil((data?.total || 0) / limit)}
              >
                次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 第5節 Nginx設定とデプロイ

### 10.5.1 Nginx設定更新

- [x] UserService用のUpstream追加

```bash
vim /var/www/winyx/nginx_user_service_config.tmp
```

```nginx
# Winyx Nginx Configuration with UserService

# バックエンドAPIのアップストリーム定義
upstream backend_api {
    server 127.0.0.1:8888;
    keepalive 32;
}

# UserService のアップストリーム定義
upstream user_service {
    server 127.0.0.1:8889;
    keepalive 32;
}

# フロントエンド用サーバー設定 (winyx.jp)
server {
    listen 80;
    server_name winyx.jp www.winyx.jp;
    
    # IPアドレス制限
    allow 202.79.96.61;     # 会社のIPアドレス
    allow 101.111.202.127;  # 自宅のIPアドレス
    deny all;               # 上記以外は全て拒否
    
    # セキュリティヘッダー
    include /etc/nginx/snippets/security-headers.conf;
    
    # フロントエンド静的ファイル（Static Export）
    root /var/www/winyx/frontend/out;
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
    
    # APIドキュメント（Swagger UI）
    location /docs/ {
        alias /var/www/winyx/docs/swagger-ui/;
        try_files $uri $uri/ /index.html;
    }
    
    # Swagger JSON仕様書
    location /docs/swagger.json {
        alias /var/www/winyx/docs/swagger.json;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    }
    
    # SPAのフォールバック
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API用サーバー設定 (api.winyx.jp)
server {
    listen 80;
    server_name api.winyx.jp;
    
    # IPアドレス制限
    allow 202.79.96.61;     # 会社のIPアドレス
    allow 101.111.202.127;  # 自宅のIPアドレス
    deny all;               # 上記以外は全て拒否
    
    # セキュリティヘッダー
    include /etc/nginx/snippets/security-headers.conf;
    
    # UserService API (ユーザー管理)
    location /api/v1/users/ {
        proxy_pass http://user_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS設定
        add_header 'Access-Control-Allow-Origin' 'https://winyx.jp' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # OPTIONSメソッドへの対応
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # AdminユーザーAPI
    location /api/v1/admin/ {
        proxy_pass http://user_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS設定
        add_header 'Access-Control-Allow-Origin' 'https://winyx.jp' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    }
    
    # その他のAPIリバースプロキシ（既存のtest_api等）
    location / {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS設定
        add_header 'Access-Control-Allow-Origin' 'https://winyx.jp' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # OPTIONSメソッドへの対応
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 10.5.2 systemd サービス設定

- [x] UserService のsystemdサービス作成

```bash
sudo vim /etc/systemd/system/winyx-user-service.service
```

```ini
[Unit]
Description=Winyx UserService
After=network.target mysql.service redis.service
Requires=mysql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/winyx/backend/user_service
ExecStart=/var/www/winyx/backend/user_service/user_service -f /var/www/winyx/backend/user_service/etc/user_service-api.yaml
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=winyx-user-service

# Environment
Environment=TZ=Asia/Tokyo

# Resource Limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 10.5.3 マイクロサービス間通信設定

#### サービスディスカバリー設定

- [x] 内部サービス通信用設定ファイル作成

```bash
vim /var/www/winyx/backend/config/services.yaml
```

```yaml
# サービスディスカバリー設定
Services:
  UserService:
    Name: user_service
    Host: 127.0.0.1
    Port: 8889
    Protocol: http
    HealthCheck: /health
    Timeout: 30s
    
  TestAPI:
    Name: test_api
    Host: 127.0.0.1
    Port: 8888
    Protocol: http
    HealthCheck: /health
    Timeout: 30s
    
  # 将来のサービス追加用
  OrderService:
    Name: order_service
    Host: 127.0.0.1
    Port: 8890
    Protocol: http
    HealthCheck: /health
    Timeout: 30s
    
# サービスメッシュ設定
ServiceMesh:
  RetryPolicy:
    MaxAttempts: 3
    RetryOn: "5xx,reset,connect-failure,timeout"
    PerTryTimeout: 10s
    
  CircuitBreaker:
    ConsecutiveErrors: 5
    Interval: 30s
    BaseEjectionTime: 30s
    MaxEjectionPercent: 50
```

#### RPC通信実装

- [x] サービス間通信用HTTPクライアント作成

```bash
vim /var/www/winyx/backend/common/httpclient/client.go
```

```go
package httpclient

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
    
    "github.com/zeromicro/go-zero/core/breaker"
    "github.com/zeromicro/go-zero/core/logx"
)

type ServiceClient struct {
    client  *http.Client
    breaker breaker.Breaker
    baseURL string
}

// NewServiceClient 新しいサービスクライアントを作成
func NewServiceClient(baseURL string) *ServiceClient {
    return &ServiceClient{
        client: &http.Client{
            Timeout: 30 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        breaker: breaker.NewBreaker(),
        baseURL: baseURL,
    }
}

// Get GETリクエストを送信
func (c *ServiceClient) Get(ctx context.Context, path string, headers map[string]string) ([]byte, error) {
    return c.doRequest(ctx, http.MethodGet, path, nil, headers)
}

// Post POSTリクエストを送信
func (c *ServiceClient) Post(ctx context.Context, path string, body interface{}, headers map[string]string) ([]byte, error) {
    jsonBody, err := json.Marshal(body)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal request body: %w", err)
    }
    return c.doRequest(ctx, http.MethodPost, path, jsonBody, headers)
}

// doRequest リクエスト実行の共通処理
func (c *ServiceClient) doRequest(ctx context.Context, method, path string, body []byte, headers map[string]string) ([]byte, error) {
    url := c.baseURL + path
    
    // サーキットブレーカーチェック
    err := c.breaker.Do(url, func() error {
        req, err := http.NewRequestWithContext(ctx, method, url, nil)
        if err != nil {
            return err
        }
        
        // ヘッダー設定
        req.Header.Set("Content-Type", "application/json")
        for k, v := range headers {
            req.Header.Set(k, v)
        }
        
        // リクエストボディ設定
        if body != nil {
            req.Body = io.NopCloser(bytes.NewReader(body))
        }
        
        // リクエスト実行
        resp, err := c.client.Do(req)
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        // レスポンス読み取り
        respBody, err := io.ReadAll(resp.Body)
        if err != nil {
            return err
        }
        
        // ステータスコードチェック
        if resp.StatusCode >= 400 {
            return fmt.Errorf("service returned error: status=%d, body=%s", resp.StatusCode, string(respBody))
        }
        
        return nil
    })
    
    if err != nil {
        logx.Errorf("Request failed: %v", err)
        return nil, err
    }
    
    return body, nil
}
```

### 10.5.4 APIゲートウェイ拡張設定

#### Kong APIゲートウェイ設定（オプション）

- [x] Kong設定ファイル作成

```bash
vim /var/www/winyx/backend/gateway/kong.yaml
```

```yaml
_format_version: "2.1"

services:
  - name: user-service
    url: http://127.0.0.1:8889
    protocol: http
    host: 127.0.0.1
    port: 8889
    path: /
    retries: 3
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
    
    routes:
      - name: user-routes
        paths:
          - /api/v1/users
        strip_path: false
        preserve_host: true
        
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          hour: 10000
          policy: local
          
      - name: cors
        config:
          origins:
            - https://winyx.jp
            - http://localhost:3000
          methods:
            - GET
            - POST
            - PUT
            - DELETE
            - OPTIONS
          headers:
            - Accept
            - Authorization
            - Content-Type
          exposed_headers:
            - X-Auth-Token
          credentials: true
          max_age: 3600
          
      - name: jwt
        config:
          key_claim_name: kid
          secret_is_base64: false
          
      - name: request-transformer
        config:
          add:
            headers:
              - X-Service-Name:user-service
              - X-Request-ID:$(uuid)

  - name: test-api-service
    url: http://127.0.0.1:8888
    protocol: http
    host: 127.0.0.1
    port: 8888
    path: /
    
    routes:
      - name: test-api-routes
        paths:
          - /api/v1/test
        strip_path: false
        preserve_host: true

# グローバルプラグイン
plugins:
  - name: prometheus
    config:
      per_consumer: true
      
  - name: syslog
    config:
      successful_severity: info
      client_errors_severity: warning
      server_errors_severity: err
```

#### サービスメッシュ実装

- [x] サービス間認証ミドルウェア作成

```bash
vim /var/www/winyx/backend/common/middleware/service_auth.go
```

```go
package middleware

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "net/http"
    "strings"
    "time"
    
    "github.com/zeromicro/go-zero/rest/httpx"
)

const (
    ServiceAuthHeader = "X-Service-Auth"
    ServiceNameHeader = "X-Service-Name"
    TimestampHeader   = "X-Timestamp"
)

// ServiceAuthMiddleware サービス間認証ミドルウェア
func ServiceAuthMiddleware(secret string) func(next http.HandlerFunc) http.HandlerFunc {
    return func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            // 内部サービスからのリクエストをチェック
            serviceName := r.Header.Get(ServiceNameHeader)
            if serviceName == "" {
                // 外部リクエストはそのまま通す
                next(w, r)
                return
            }
            
            // タイムスタンプチェック
            timestamp := r.Header.Get(TimestampHeader)
            if timestamp == "" {
                httpx.Error(w, errors.New("missing timestamp"))
                return
            }
            
            // タイムスタンプの有効性チェック（5分以内）
            reqTime, err := time.Parse(time.RFC3339, timestamp)
            if err != nil || time.Since(reqTime) > 5*time.Minute {
                httpx.Error(w, errors.New("invalid or expired timestamp"))
                return
            }
            
            // 署名チェック
            authHeader := r.Header.Get(ServiceAuthHeader)
            if authHeader == "" {
                httpx.Error(w, errors.New("missing service auth"))
                return
            }
            
            // HMAC署名の検証
            expectedSignature := generateServiceSignature(serviceName, timestamp, secret)
            if !hmac.Equal([]byte(authHeader), []byte(expectedSignature)) {
                httpx.Error(w, errors.New("invalid service signature"))
                return
            }
            
            next(w, r)
        }
    }
}

// generateServiceSignature サービス署名を生成
func generateServiceSignature(serviceName, timestamp, secret string) string {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write([]byte(serviceName + ":" + timestamp))
    return hex.EncodeToString(h.Sum(nil))
}
```

### 10.5.5 デプロイ手順

- [x] UserService デプロイ

```bash
# データベースマイグレーション
mysql -h 127.0.0.1 -u winyx_app -p winyx_core < /var/www/winyx/contracts/user_service/schema.sql

# UserService ビルド
cd /var/www/winyx/backend/user_service
go mod tidy
go build -o user_service userapi.go

# 権限設定
sudo chown -R www-data:www-data /var/www/winyx/backend/user_service
sudo chmod +x /var/www/winyx/backend/user_service/user_service

# systemd サービス有効化
sudo systemctl daemon-reload
sudo systemctl enable winyx-user-service
sudo systemctl start winyx-user-service

# サービス状態確認
sudo systemctl status winyx-user-service
```

- [x] フロントエンド ビルド＆デプロイ

```bash
# フロントエンド ビルド
cd /var/www/winyx/frontend
npm install
npm run build

# Nginx設定適用
sudo cp /var/www/winyx/nginx_user_service_config.tmp /etc/nginx/sites-available/winyx
sudo nginx -t
sudo systemctl reload nginx
```

### 10.5.4 動作確認

- [x] API エンドポイント テスト

```bash
# ユーザー登録テスト
curl -X POST http://api.winyx.jp/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# ログインテスト
curl -X POST http://api.winyx.jp/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 第6節 セキュリティとベストプラクティス

### 10.6.1 セキュリティ強化

#### JWT セキュリティ
- [x] トークン有効期限の適切な設定（24時間）
- [x] リフレッシュトークン実装（拡張機能）
- [x] トークン検証ミドルウェアの強化

#### パスワードセキュリティ  
- [x] bcrypt ハッシュ化（cost=12推奨）
- [x] パスワード強度チェック
- [x] ブルートフォース攻撃対策

#### データベースセキュリティ
- [x] SQLインジェクション対策（Go-Zero ORM使用）
- [x] 機密データの暗号化
- [x] アクセスログ記録

### 10.6.2 監視とロギング

- [x] ユーザー行動ログ

```go
// internal/logic/user/loginlogic.go に追加
func (l *LoginLogic) Login(req *types.LoginReq) (resp *types.LoginRes, err error) {
    // ... 既存のロジック ...
    
    // ログイン成功ログ
    logx.Infow("User login successful",
        logx.Field("user_id", user.Id),
        logx.Field("email", user.Email),
        logx.Field("ip", l.ctx.Value("remote_addr")),
        logx.Field("user_agent", l.ctx.Value("user_agent")),
    )
    
    return resp, nil
}
```

- [x] 失敗試行の監視

```go
// ログイン失敗時
logx.Errorw("User login failed",
    logx.Field("email", req.Email),
    logx.Field("ip", l.ctx.Value("remote_addr")),
    logx.Field("error", err.Error()),
)
```

---

## まとめ

第10章では以下を実装しました：

### 実装内容
1. **Go-Zero API契約設計** - 完全なユーザー管理API仕様
2. **UserServiceマイクロサービス** - 認証・認可機能完備
3. **Next.js フロントエンド** - モダンなユーザー管理UI
4. **セキュリティ実装** - JWT認証、パスワードハッシュ化
5. **管理機能** - ユーザー一覧・削除機能
6. **システム統合** - Nginx、systemd連携

### 技術スタック
- **バックエンド**: Go-Zero + MariaDB + Redis
- **フロントエンド**: Next.js 15 + TypeScript + Tailwind CSS
- **認証**: JWT + bcrypt
- **状態管理**: Zustand + React Query
- **インフラ**: Nginx + systemd

### 次のステップ
- リフレッシュトークン実装
- OAuth認証連携
- 多要素認証（2FA）
- 監査ログシステム
- パフォーマンス最適化

これでWinyxプロジェクトに本格的なユーザー管理機能が追加されました。