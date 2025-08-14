# 第7章 契約駆動開発とAPI統合

> 本章では、Go-Zero API契約ファイルを中心とした契約駆動開発手法と、フロントエンドとの型安全なAPI統合について解説します。

---

## 第1節 契約駆動開発の概要

### 7.1.1 契約駆動開発とは

WinyxプロジェクトではGo-ZeroのAPI契約ファイル（.api）を単一の信頼できる情報源として使用し、バックエンドとフロントエンドの仕様齟齬を防ぐ開発手法を採用しています。

#### アーキテクチャ図

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Go-Zero .api   │────▶│  Backend Code   │     │ TypeScript Types│
│  契約ファイル     │     │  (自動生成)      │     │   (自動生成)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  OpenAPI Spec   │     │   API Server    │     │ Frontend Client │
│  (自動生成)      │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 7.1.2 契約駆動開発のメリット

- **型安全性の保証**: バックエンドとフロントエンド間での型の不整合を防止
- **自動同期**: 契約ファイルの変更時に自動的にクライアントコードを生成
- **開発効率の向上**: 手動での型定義やAPIクライアント作成が不要
- **仕様書の自動生成**: OpenAPI/Swagger仕様書の自動生成
- **チーム間の連携強化**: 統一された契約による認識の一致

---

## 第2節 Go-Zero契約ファイルからの型生成

### 7.2.1 TypeScript型定義生成ツール

- [ ] フロントエンド型生成スクリプトの確認
```bash
vim /var/www/winyx/scripts/generate_frontend_types.js
```

このスクリプトは以下の機能を提供します：
- Go-Zero .apiファイルの解析
- TypeScript型定義の自動生成
- APIクライアント関数の生成
- React Queryフックの自動生成

### 7.2.2 生成されるファイル構成

```
frontend/src/
├── types/generated/
│   └── types.ts                # Go-Zero型定義から生成された型
├── lib/api/generated/
│   ├── index.ts               # APIクライアント関数
│   └── hooks.ts               # React Queryフック
```

### 7.2.3 型生成の実行

- [ ] 手動実行
```bash
cd /var/www/winyx/scripts
node generate_frontend_types.js
```

- [ ] 自動実行（契約ファイル監視）
```bash
./sync_contracts.sh --watch
```

---

## 第3節 自動同期システムの構築

### 7.3.1 同期スクリプトの詳細

- [ ] 統合同期スクリプト
```bash
vim /var/www/winyx/scripts/sync_contracts.sh
```

主な機能：
- 契約ファイルの変更検出
- Go-Zeroコードの生成
- TypeScript型定義の生成
- OpenAPI仕様書の生成
- エラーハンドリングと通知

### 7.3.2 自動同期の設定

- [ ] Git Hooksの設定
```bash
# Git hooksを自動インストール
./scripts/sync_contracts.sh --install-hooks

# 手動でhooksを確認
cat .git/hooks/pre-commit
```

生成されるpre-commitフック：
```bash
#!/bin/bash
# Winyx契約ファイル同期 pre-commitフック

if git diff --cached --name-only | grep -E '\.api$' >/dev/null; then
    echo "🔄 契約ファイルの変更を検出しました。同期を実行中..."
    
    if /var/www/winyx/scripts/sync_contracts.sh; then
        git add frontend/src/types/generated/
        git add frontend/src/lib/api/generated/
        git add mobile/flutter_app/lib/generated/
        git add docs/swagger.json
        echo "✅ 契約同期が完了しました"
    else
        echo "❌ 契約同期に失敗しました"
        exit 1
    fi
fi
```

### 7.3.3 ファイル監視モード

- [ ] リアルタイム監視の開始
```bash
./scripts/sync_contracts.sh --watch
```

この機能により、契約ファイルの変更を検出して即座に同期を実行します。

---

## 第4節 型安全なAPIクライアントの使用

### 7.4.1 契約ファイルの定義例

```go
// backend/test_api/test_api.api
type UserProfileReq {
    Name     string `json:"name"`
    Email    string `json:"email"`
    Bio      string `json:"bio,optional"`
}

type UserProfileRes {
    Id       int64  `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Bio      string `json:"bio"`
    Avatar   string `json:"avatar,optional"`
    Created  string `json:"created_at"`
}

@server(
    jwt: Auth
    group: profile
    prefix: /api/profile
)
service test_api-api {
    @handler updateProfile
    put /update (UserProfileReq) returns (UserProfileRes)
    
    @handler getProfile  
    get /me returns (UserProfileRes)
}
```

### 7.4.2 自動生成されるTypeScript型

```typescript
// frontend/src/types/generated/types.ts (自動生成)
export interface UserProfileReq {
  name: string;
  email: string;
  bio?: string;
}

export interface UserProfileRes {
  id: number;
  name: string;
  email: string;
  bio: string;
  avatar?: string;
  created_at: string;
}
```

### 7.4.3 自動生成されるAPIクライアント

```typescript
// frontend/src/lib/api/generated/index.ts (自動生成)
export const profile = {
  /**
   * updateProfile endpoint
   * @requires Authentication
   */
  updateProfile: (data: UserProfileReq): Promise<UserProfileRes> => {
    return apiRequest.put<UserProfileRes>('/api/profile/update', data);
  },

  /**
   * getProfile endpoint  
   * @requires Authentication
   */
  getProfile: (): Promise<UserProfileRes> => {
    return apiRequest.get<UserProfileRes>('/api/profile/me');
  },
};
```

### 7.4.4 自動生成されるReact Queryフック

```typescript
// frontend/src/lib/api/generated/hooks.ts (自動生成)
export function useGetProfile() {
  return useQuery({
    queryKey: ['getProfile'],
    queryFn: () => api.profile.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserProfileReq) => api.profile.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getProfile'] });
    },
  });
}
```

### 7.4.5 実際のコンポーネントでの使用

```typescript
// src/components/features/profile/profile-form.tsx
import { useGetProfile, useUpdateProfile } from '@/lib/api/generated/hooks';

export function ProfileForm() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfileMutation = useUpdateProfile();

  const handleSubmit = async (data: UserProfileReq) => {
    await updateProfileMutation.mutateAsync(data);
  };

  // 型安全なAPIクライアント使用
  // profileの型は UserProfileRes として自動推論される
}
```

---

## 第5節 環境別API通信アーキテクチャ

### 7.5.1 開発環境と本番環境の違い

#### 開発環境アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ブラウザ       │────▶│  Next.js        │────▶│   Go-Zero       │
│  localhost      │ HTTP│  Dev Server     │ HTTP│   REST API      │
│                 │     │  (Port: 3000)   │     │  (Port: 8888)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        [Hot Reload]
                        [デバッグ容易]
```

#### 本番環境アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ブラウザ       │────▶│  Next.js        │────▶│  Go-Zero RPC    │
│  (Public)       │ HTTP│  API Routes     │ gRPC│  (Port: 9090)   │
│                 │     │  (内部実行)      │     │   (内部のみ)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                      [高速内部通信]
                      [セキュリティ強化]
```

### 7.5.2 環境切り替えの実装

- [ ] API設定の環境別管理
```typescript
// src/lib/api/config.ts
const API_CONFIG = {
  development: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888',
    mode: 'direct', // 直接REST API接続
  },
  production: {
    baseURL: '/api', // Next.js API Routes経由
    mode: 'proxy', // API Routes経由でRPC接続
  },
};

export const getApiConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG[env as keyof typeof API_CONFIG];
};
```

### 7.5.3 本番環境用API Routes（RPC接続）

- [ ] RPC接続用API Routeの実装
```typescript
// src/app/api/profile/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRpcClient, callRpc } from '@/lib/rpc/client'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    // JWTトークンの検証
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.slice(7)
    const payload = verifyToken(token)
    
    const client = getRpcClient('user')

    // RPC呼び出し
    const userProfile = await callRpc(client, 'GetProfile', {
      user_id: payload.userId
    })

    return NextResponse.json({ user: userProfile })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get profile', message: error.message },
      { status: 500 }
    )
  }
}
```

### 7.5.4 パフォーマンス比較

| 項目 | 開発環境 | 本番環境 | 改善率 |
|------|----------|----------|--------|
| API応答時間 | ~100ms (REST) | ~20ms (RPC) | **80%向上** |
| ネットワーク往復 | HTTP/JSON | 内部gRPC | **90%削減** |
| セキュリティ | CORS依存 | 内部通信 | **大幅向上** |
| デバッグ容易性 | **高** | 中 | - |
| 開発効率 | **高** | 中 | - |

---

## 第6節 OpenAPI/Swagger仕様書生成

### 7.6.1 OpenAPI生成スクリプト

- [ ] OpenAPI仕様書生成
```bash
vim /var/www/winyx/scripts/generate_openapi.js
```

このスクリプトは以下の機能を提供：
- Go-Zero契約ファイルからOpenAPI 3.0仕様書を生成
- 認証スキーム（Bearer JWT）の自動設定
- エラーレスポンス定義の自動生成
- Swagger UIとの連携

### 7.6.2 生成される仕様書の確認

- [ ] Swagger UI での確認
```bash
# OpenAPI仕様書を生成
node scripts/generate_openapi.js

# Swagger UIでアクセス
open http://localhost:8888/docs/swagger-ui/
```

### 7.6.3 仕様書の活用

生成されたOpenAPI仕様書は以下の用途で活用：
- API ドキュメントの提供
- Postmanコレクションの生成
- モックサーバーの構築
- APIテストの自動化

---

## 第7節 監視とトラブルシューティング

### 7.7.1 リアルタイム監視

- [ ] 契約ファイルの変更監視
```bash
# 監視モードで実行
./scripts/sync_contracts.sh --watch

# ログの確認
tail -f /var/log/winyx/contract-sync.log
```

### 7.7.2 同期エラーの対処

- [ ] 一般的なエラーと解決方法
```bash
# 型チェックエラーの場合
cd /var/www/winyx/frontend
npm run type-check

# Go-Zeroビルドエラーの場合
cd /var/www/winyx/backend/test_api
go build .

# 強制的な再生成
rm -rf /var/www/winyx/frontend/src/types/generated/*
rm -rf /var/www/winyx/frontend/src/lib/api/generated/*
./scripts/sync_contracts.sh
```

### 7.7.3 デバッグ機能

- [ ] デバッグログの有効化
```bash
# デバッグモードで同期実行
DEBUG=true ./scripts/sync_contracts.sh

# 詳細ログの確認
grep ERROR /var/log/winyx/contract-sync.log
```

---

## 第8節 CI/CDとの統合

### 7.8.1 GitHub Actions での自動チェック

- [ ] 契約同期チェックワークフロー
```yaml
# .github/workflows/contract-sync.yml
name: Contract Sync Check

on: [push, pull_request]

jobs:
  contract-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v3
        with:
          go-version: '1.22'
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install goctl
        run: go install github.com/zeromicro/go-zero/tools/goctl@latest
        
      - name: Run contract sync
        run: ./scripts/sync_contracts.sh --test
        
      - name: Check for changes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            echo "契約ファイルの変更が自動生成ファイルに反映されていません"
            git diff
            exit 1
          fi
```

### 7.8.2 プルリクエストでの自動検証

このワークフローにより、プルリクエスト時に以下が自動実行されます：
- 契約ファイルの変更検出
- 自動生成ファイルの更新チェック
- TypeScriptの型チェック
- Go-Zeroコードのビルド確認

---

## 第9節 開発ワークフロー

### 7.9.1 日常的な開発フロー

```bash
# 1. Go-Zero契約ファイルを編集
vim /var/www/winyx/backend/test_api/test_api.api

# 2. 自動同期の実行（Git pre-commitフック）
git add backend/test_api/test_api.api
git commit -m "新しいAPIエンドポイントを追加"
# → pre-commitフックが自動的に型定義を生成

# 3. フロントエンド開発
cd frontend
npm run dev
# → 自動生成された型安全なAPIクライアントを使用

# 4. テストの実行
npm run test
# → 型安全性が保証されたAPIクライアントのテスト
```

### 7.9.2 チーム開発での活用

- **バックエンド開発者**: 契約ファイルの更新のみでフロントエンド連携が完了
- **フロントエンド開発者**: 自動生成されたAPIクライアントで型安全な開発が可能
- **QAエンジニア**: 自動生成されたOpenAPI仕様書でAPIテストが容易

### 7.9.3 品質保証

- **型安全性**: コンパイル時に型の不整合を検出
- **自動テスト**: 契約変更時の回帰テストが自動実行
- **ドキュメント同期**: 仕様書が常に最新状態で維持

---

## まとめ

本章で構築した契約駆動開発システムにより：

1. **型安全性の保証** - バックエンドとフロントエンド間での型の一致
2. **自動化されたワークフロー** - 契約変更の自動検出と同期
3. **開発効率の向上** - 手動でのAPIクライアント作成が不要
4. **品質保証の強化** - コンパイル時エラーによる早期問題検出
5. **チーム連携の改善** - 統一された契約による認識共有
6. **ドキュメント自動化** - 常に最新のAPI仕様書

**Contract-First Development**のアプローチにより、高品質で保守性の高いAPI統合が実現できます。次章では、この契約システムを活用したモバイルアプリケーション開発について詳しく解説します。