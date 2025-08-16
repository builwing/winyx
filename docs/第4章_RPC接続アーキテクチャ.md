# 第4章 RPC接続アーキテクチャ

> 本章ではNext.jsからGo-Zero RPCへの内部接続とモバイル向けAPI設計について解説します。

---

## 第1節 アーキテクチャ概要

### 4.1.1 システム構成図

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  ブラウザ    │────▶│  Next.js App │────▶│ Go-Zero RPC     │
│ (Client)    │HTTP │  API Routes  │gRPC │ (Port: 9090)    │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │                       ▲
                           │                       │
┌─────────────┐     ┌──────────────┐            │
│ モバイル     │────▶│  REST API    │─────────────┘
│   アプリ     │HTTP │ (Port: 8888) │   gRPC
└─────────────┘     └──────────────┘
```

### 4.1.2 ポート設計

- **8888**: REST APIゲートウェイ（外部公開）
- **9090**: Go-Zero RPCサービス（内部のみ）
- **3000**: Next.js開発サーバー（開発環境）

---

## 第2節 Go-Zero RPCサービスの構築

### 4.2.1 RPCサービスの定義（契約駆動開発）

- [ ] Proto定義ファイルの作成（CLAUDE.md規約準拠）
```bash
# 契約ファイルはサービス別に管理
mkdir -p /var/www/winyx/contracts/user_service
vim /var/www/winyx/contracts/user_service/user.proto
```

```protobuf
syntax = "proto3";

package user;
option go_package = "./user";

message GetUserRequest {
  int64 id = 1;
}

message GetUserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
}

message ListUsersResponse {
  repeated GetUserResponse users = 1;
  int32 total = 2;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}
```

### 4.2.2 RPCサービスの生成（最新goctl形式）

- [ ] Go-Zero RPCサービスの生成
```bash
cd /var/www/winyx/backend
mkdir -p user_rpc
cd user_rpc

# 最新のgoctl rpc生成コマンド
goctl rpc protoc ../../contracts/user_service/user.proto \
  --go_out=. \
  --go-grpc_out=. \
  --zrpc_out=. \
  --style=go_zero
```

> 目的：契約ファイルからRPCサービスコードを自動生成

### 4.2.2.1 RPC編集可能ファイルと制限【重要】

生成後のディレクトリ構造と編集制限：

```
user_rpc/
├── etc/
│   └── user.yaml           # ✅ 編集可能（設定）
├── internal/
│   ├── config/
│   │   └── config.go       # ❌ 編集禁止（自動生成）
│   ├── logic/              # ✅ 編集可能（ビジネスロジック）
│   │   ├── get_user_logic.go
│   │   └── list_users_logic.go
│   ├── server/             # ❌ 編集禁止（自動生成）
│   │   └── user_service_server.go
│   ├── svc/                # ⚠️ 最小限の編集（DI設定）
│   │   └── service_context.go
│   └── pb/                 # ❌ 編集禁止（Protocol Buffers）
│       ├── user.pb.go
│       └── user_grpc.pb.go
├── user_client/            # ❌ 編集禁止（クライアントコード）
│   └── user.go
└── user.go                 # ❌ 編集禁止（メインファイル）
```

**編集ルール**:
- ✅ **編集可能**: ビジネスロジックと設定のみ
- ❌ **編集禁止**: 再生成で上書きされるファイル
- ⚠️ **条件付き編集**: DI設定の追加のみ可能

> 目的：goctl再生成時にビジネスロジックを保護

### 4.2.3 RPC設定ファイル

- [ ] RPC設定ファイルの作成（CLAUDE.md命名規約準拠）
```bash
vim /var/www/winyx/backend/user_rpc/etc/user_rpc.yaml
```

```yaml
Name: user_rpc
ListenOn: 127.0.0.1:9090  # 内部接続のみ
Etcd:
  Hosts:
  - 127.0.0.1:2379
  Key: user.rpc

Mysql:
  DataSource: "winyx_app:Winyx$7377@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

Cache:
  - Host: 127.0.0.1:6379
    Pass: ""
    Type: node

Log:
  ServiceName: user_rpc
  Mode: console
  Level: info

# Telemetry設定（監視用）
Telemetry:
  Name: user_rpc
  Endpoint: http://localhost:14268/api/traces
  Sampler: 1.0
  Batcher: jaeger
```

### 4.2.4 RPCロジックの実装

- [ ] GetUserロジックの実装
```bash
vim /var/www/winyx/backend/user-rpc/internal/logic/getuserlogic.go
```

```go
package logic

import (
    "context"
    
    "github.com/winyx/backend/user-rpc/internal/svc"
    "github.com/winyx/backend/user-rpc/types/user"
    
    "github.com/zeromicro/go-zero/core/logx"
)

type GetUserLogic struct {
    ctx    context.Context
    svcCtx *svc.ServiceContext
    logx.Logger
}

func NewGetUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserLogic {
    return &GetUserLogic{
        ctx:    ctx,
        svcCtx: svcCtx,
        Logger: logx.WithContext(ctx),
    }
}

func (l *GetUserLogic) GetUser(in *user.GetUserRequest) (*user.GetUserResponse, error) {
    // データベースからユーザー取得
    userModel, err := l.svcCtx.UserModel.FindOne(l.ctx, in.Id)
    if err != nil {
        return nil, err
    }
    
    return &user.GetUserResponse{
        Id:    userModel.Id,
        Name:  userModel.Name,
        Email: userModel.Email,
    }, nil
}
```

### 4.2.5 REST APIからRPCサービスの呼び出し

#### REST APIゲートウェイからの内部RPC呼び出し

- [ ] REST API設定にRPC接続を追加

```yaml
# backend/user_service/etc/user_service-api.yaml に追加
Name: user_service
Host: 0.0.0.0
Port: 8888

# RPC接続設定
UserRpc:
  Etcd:
    Hosts:
      - 127.0.0.1:2379
    Key: user.rpc
  # または直接接続
  # Target: 127.0.0.1:9090
  # NonBlock: true
```

- [ ] ServiceContextにRPCクライアントを追加

```go
// backend/user_service/internal/svc/servicecontext.go
package svc

import (
    "github.com/winyx/backend/user_service/internal/config"
    "github.com/winyx/backend/user_rpc/userclient"
    
    "github.com/zeromicro/go-zero/zrpc"
)

type ServiceContext struct {
    Config  config.Config
    UserRpc userclient.User  // RPCクライアント追加
    // ... 他のフィールド
}

func NewServiceContext(c config.Config) *ServiceContext {
    return &ServiceContext{
        Config: c,
        // RPCクライアント初期化
        UserRpc: userclient.NewUser(zrpc.MustNewClient(c.UserRpc)),
        // ... 他の初期化
    }
}
```

- [ ] REST APIロジックからRPCを呼び出し

```go
// backend/user_service/internal/logic/userinfologic.go
package logic

import (
    "context"
    
    "github.com/winyx/backend/user_service/internal/svc"
    "github.com/winyx/backend/user_service/internal/types"
    "github.com/winyx/backend/user_rpc/user"
    
    "github.com/zeromicro/go-zero/core/logx"
)

type UserInfoLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewUserInfoLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserInfoLogic {
    return &UserInfoLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *UserInfoLogic) UserInfo() (resp *types.UserInfoResp, err error) {
    // JWTからユーザーIDを取得
    userId := l.ctx.Value("userId").(int64)
    
    // RPCサービスを呼び出し
    rpcResp, err := l.svcCtx.UserRpc.GetUser(l.ctx, &user.GetUserRequest{
        Id: userId,
    })
    if err != nil {
        logx.Errorf("failed to get user from rpc: %v", err)
        return nil, err
    }
    
    // レスポンスを変換
    return &types.UserInfoResp{
        Id:     rpcResp.Id,
        Name:   rpcResp.Name,
        Email:  rpcResp.Email,
        Status: 1,
    }, nil
}
```

> 目的：RESTエンドポイントから内部RPCサービスを活用し、マイクロサービス間通信を実現

---

## 第3節 Next.jsからのRPC接続

### 4.3.1 必要なパッケージのインストール

- [ ] gRPCクライアントパッケージのインストール
```bash
cd /var/www/winyx/frontend
npm install @grpc/grpc-js @grpc/proto-loader
```

### 4.3.2 Next.js API Routesの実装

- [ ] API Routeの作成（App Router使用）
```bash
mkdir -p /var/www/winyx/frontend/app/api/users
vim /var/www/winyx/frontend/app/api/users/[id]/route.ts
```

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Proto定義のロード（CLAUDE.md規約準拠のパス）
const PROTO_PATH = path.join(process.cwd(), '../contracts/user_service/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition) as any;

// gRPCクライアントの作成（シングルトン）
let client: any = null;

function getClient() {
  if (!client) {
    client = new userProto.user.UserService(
      process.env.RPC_HOST || '127.0.0.1:9090',
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = getClient();
  
  return new Promise((resolve) => {
    client.GetUser(
      { id: parseInt(params.id) },
      (error: any, response: any) => {
        if (error) {
          resolve(NextResponse.json(
            { error: error.message },
            { status: 500 }
          ));
        } else {
          resolve(NextResponse.json(response));
        }
      }
    );
  });
}
```

### 4.3.3 フロントエンドコンポーネントの実装

- [ ] Reactコンポーネントの作成
```bash
vim /var/www/winyx/frontend/app/components/UserProfile.tsx
```

```typescript
'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Next.js API Routeを経由してRPCを呼び出し
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### 4.3.4 環境変数の設定

- [ ] Next.js環境変数の設定
```bash
vim /var/www/winyx/frontend/.env.local
```

```env
# RPC接続設定（内部接続）
RPC_HOST=127.0.0.1:9090

# 開発環境
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# 本番環境（必要に応じて）
# NEXT_PUBLIC_API_URL=https://winyx.jp/api
```

---

## 第4節 モバイル向けREST APIゲートウェイ

### 4.4.1 APIゲートウェイの実装

- [ ] REST APIハンドラーの作成
```bash
vim /var/www/winyx/backend/test_api/internal/handler/userhandler.go
```

```go
package handler

import (
    "net/http"
    "strconv"
    
    "github.com/winyx/backend/test_api/internal/logic"
    "github.com/winyx/backend/test_api/internal/svc"
    "github.com/winyx/backend/test_api/internal/types"
    
    "github.com/zeromicro/go-zero/rest/httpx"
)

func GetUserHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userId := r.URL.Query().Get("id")
        id, err := strconv.ParseInt(userId, 10, 64)
        if err != nil {
            httpx.Error(w, err)
            return
        }
        
        l := logic.NewGetUserLogic(r.Context(), svcCtx)
        resp, err := l.GetUser(id)
        if err != nil {
            httpx.Error(w, err)
        } else {
            httpx.OkJson(w, resp)
        }
    }
}
```

### 4.4.2 APIロジックでRPCを呼び出し

- [ ] RPCクライアントの統合
```bash
vim /var/www/winyx/backend/test_api/internal/logic/getuserlogic.go
```

```go
package logic

import (
    "context"
    
    "github.com/winyx/backend/test_api/internal/svc"
    "github.com/winyx/backend/test_api/internal/types"
    "github.com/winyx/backend/user-rpc/userclient"
    
    "github.com/zeromicro/go-zero/core/logx"
)

type GetUserLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewGetUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserLogic {
    return &GetUserLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *GetUserLogic) GetUser(id int64) (*types.UserResponse, error) {
    // RPCサービスを呼び出し
    resp, err := l.svcCtx.UserRpc.GetUser(l.ctx, &userclient.GetUserRequest{
        Id: id,
    })
    if err != nil {
        return nil, err
    }
    
    return &types.UserResponse{
        Id:    resp.Id,
        Name:  resp.Name,
        Email: resp.Email,
    }, nil
}
```

### 4.4.3 サービスコンテキストの設定

- [ ] RPCクライアントの設定
```bash
vim /var/www/winyx/backend/test_api/internal/svc/servicecontext.go
```

```go
package svc

import (
    "github.com/winyx/backend/test_api/internal/config"
    "github.com/winyx/backend/user-rpc/userclient"
    
    "github.com/zeromicro/go-zero/zrpc"
)

type ServiceContext struct {
    Config  config.Config
    UserRpc userclient.User
}

func NewServiceContext(c config.Config) *ServiceContext {
    return &ServiceContext{
        Config: c,
        UserRpc: userclient.NewUser(zrpc.MustNewClient(zrpc.RpcClientConf{
            Endpoints: []string{"127.0.0.1:9090"},
            NonBlock:  true,
        })),
    }
}
```

---

## 第5節 systemdサービス設定

### 4.5.1 RPCサービスのsystemd設定

- [ ] RPCサービスファイルの作成
```bash
sudo vim /etc/systemd/system/winyx-user-rpc.service
```

```ini
[Unit]
Description=Winyx User RPC Service
After=network.target mysql.service redis.service
Wants=mysql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/winyx/backend/user-rpc
Environment=GOPATH=/tmp/go
Environment=GOCACHE=/tmp/go-cache
EnvironmentFile=/var/www/winyx/.env
ExecStart=/var/www/winyx/backend/user-rpc/user-rpc -f /var/www/winyx/backend/user-rpc/etc/user.yaml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=winyx-user-rpc

[Install]
WantedBy=multi-user.target
```

### 4.5.2 サービスの起動順序

- [ ] サービスの起動設定
```bash
# RPCサービスを先に起動
sudo systemctl enable winyx-user-rpc
sudo systemctl start winyx-user-rpc

# REST APIサービスを起動（RPCに依存）
sudo systemctl restart winyx-test-api

# 状態確認
sudo systemctl status winyx-user-rpc
sudo systemctl status winyx-test-api
```

---

## 第6節 セキュリティ設定

### 4.6.1 内部ポートの保護

- [ ] ファイアウォール設定の更新
```bash
# RPCポート9090は内部のみアクセス可能
sudo ufw deny 9090/tcp

# localhostからのみ許可
sudo iptables -A INPUT -p tcp --dport 9090 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9090 -j DROP
```

### 4.6.2 認証トークンの実装

- [ ] RPC認証インターセプターの追加
```go
// RPCサービスに認証を追加
func AuthInterceptor(ctx context.Context, req interface{}, 
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    
    // メタデータから認証トークンを取得
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.Unauthenticated, "no metadata")
    }
    
    tokens := md.Get("authorization")
    if len(tokens) == 0 {
        return nil, status.Error(codes.Unauthenticated, "no token")
    }
    
    // トークン検証
    if !validateToken(tokens[0]) {
        return nil, status.Error(codes.Unauthenticated, "invalid token")
    }
    
    return handler(ctx, req)
}
```

---

## 第7節 パフォーマンス最適化

### 4.7.1 接続プーリング

- [ ] gRPC接続プールの設定
```typescript
// Next.js API Routes用の接続プール
class GrpcConnectionPool {
  private connections: Map<string, any> = new Map();
  private maxConnections = 10;
  
  getConnection(service: string): any {
    if (!this.connections.has(service)) {
      const client = new userProto.user.UserService(
        process.env.RPC_HOST || '127.0.0.1:9090',
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 10000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.max_receive_message_length': 1024 * 1024 * 4,
        }
      );
      this.connections.set(service, client);
    }
    return this.connections.get(service);
  }
}

export const grpcPool = new GrpcConnectionPool();
```

### 4.7.2 キャッシュ戦略

- [ ] Redisキャッシュの活用
```go
// RPCサービスでのキャッシュ実装
func (l *GetUserLogic) GetUser(in *user.GetUserRequest) (*user.GetUserResponse, error) {
    // キャッシュキー
    cacheKey := fmt.Sprintf("user:%d", in.Id)
    
    // Redisから取得を試みる
    var cachedUser user.GetUserResponse
    err := l.svcCtx.Cache.Get(cacheKey, &cachedUser)
    if err == nil {
        return &cachedUser, nil
    }
    
    // DBから取得
    userModel, err := l.svcCtx.UserModel.FindOne(l.ctx, in.Id)
    if err != nil {
        return nil, err
    }
    
    resp := &user.GetUserResponse{
        Id:    userModel.Id,
        Name:  userModel.Name,
        Email: userModel.Email,
    }
    
    // キャッシュに保存（TTL: 5分）
    l.svcCtx.Cache.SetWithExpire(cacheKey, resp, 300)
    
    return resp, nil
}
```

---

## 第8節 監視とデバッグ

### 4.8.1 RPCメトリクスの収集

- [ ] Prometheusメトリクスの追加
```go
// RPCサービスにメトリクスを追加
import (
    "github.com/zeromicro/go-zero/core/metric"
)

var (
    rpcCallTotal = metric.NewCounterVec(&metric.CounterVecOpts{
        Namespace: "winyx",
        Subsystem: "rpc",
        Name:      "call_total",
        Help:      "rpc call total",
        Labels:    []string{"method", "status"},
    })
    
    rpcCallDuration = metric.NewHistogramVec(&metric.HistogramVecOpts{
        Namespace: "winyx",
        Subsystem: "rpc",
        Name:      "call_duration_seconds",
        Help:      "rpc call duration",
        Labels:    []string{"method"},
    })
)
```

### 4.8.2 ログ設定

- [ ] 統合ログ管理
```yaml
# RPCサービスのログ設定
Log:
  ServiceName: user-rpc
  Mode: file
  Path: /var/log/winyx/rpc
  Level: info
  KeepDays: 7
  StackCooldownMillis: 100
```

---

## 第9節 トラブルシューティング

### 4.9.1 よくある問題と解決策

#### RPC接続エラー
```bash
# 接続テスト
grpcurl -plaintext 127.0.0.1:9090 list

# サービス確認
netstat -tlnp | grep 9090
```

#### Next.js API Routeエラー
```typescript
// エラーハンドリングの改善
export async function GET(request: NextRequest) {
  try {
    const client = getClient();
    // ... RPC呼び出し
  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

## まとめ

本章で構築したアーキテクチャにより：

1. **Next.js** → サーバーサイドで内部RPCを直接呼び出し（高速）
2. **モバイル** → REST API経由でRPCサービスにアクセス（互換性重視）
3. **セキュリティ** → RPCポートは内部のみ、外部はREST APIのみ公開
4. **パフォーマンス** → 接続プーリングとキャッシュで最適化

この構成により、フロントエンドは高速な内部通信を実現し、モバイルアプリは標準的なREST APIを利用できます。