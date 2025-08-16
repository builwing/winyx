# 第6章 Next.jsフロントエンド基盤構築

> 本章では、WinyxプロジェクトのNext.js 15（App Router）を使用したモダンなフロントエンド基盤構築について解説します。TypeScript、Tailwind CSS、shadcnを活用し、Go-Zero RPC接続アーキテクチャに対応した開発手法を提供します。

## 重要な変更点（Next.js 15対応）

### バージョン情報
- **Next.js**: 14.x → 15.4.6
- **React**: 18.x → 19.1.1  
- **shadcn-ui**: 廃止 → **shadcn**（新パッケージ）

### 主な変更内容
1. **Next.js 15の新機能**
   - swcMinifyがデフォルトで有効化
   - App Routerの性能向上
   - React 19との完全な互換性

2. **shadcnパッケージの変更**
   - `npx shadcn-ui@latest` → `npx shadcn@latest`
   - Tailwind CSS v4対応（v3へのダウングレードも可能）
   - 新しいコンポーネント構造

3. **手動セットアップ推奨**
   - create-next-appの代わりに手動セットアップを詳細に記載
   - 既存プロジェクトへの統合手順を追加

---

## 第1節 Next.jsプロジェクトの初期設定

### 6.1.1 プロジェクトの作成

Next.js 15では手動セットアップまたはcreate-next-appを使用します。既存プロジェクトの場合は以下の手順に従います。

- [ ] プロジェクトディレクトリの作成と初期化
```bash
cd /var/www/winyx
mkdir frontend
cd frontend

# package.jsonの初期化
npm init -y
```

- [ ] Next.js 15と必要な依存関係のインストール
```bash
# Next.js 15と基本パッケージ
npm install next@latest react@latest react-dom@latest

# TypeScript関連
npm install --save-dev typescript @types/react @types/react-dom @types/node

# Tailwind CSS関連
npm install -D tailwindcss postcss autoprefixer
```

### 6.1.2 設定ファイルの作成

- [ ] package.jsonスクリプトの設定
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

- [ ] TypeScript設定（tsconfig.json）
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] Next.js設定（next.config.js）
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 静的エクスポート設定
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

- [ ] Tailwind CSS設定
```bash
# tailwind.config.jsの作成
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# postcss.config.jsの作成
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
```

### 6.1.3 基本ディレクトリ構造の作成

- [ ] 必要なディレクトリとファイルの作成
```bash
# ディレクトリ構造の作成
mkdir -p src/app
mkdir -p src/components/ui
mkdir -p src/lib/api
mkdir -p src/types/generated

# ルートレイアウトの作成
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Winyx Dashboard',
  description: 'System monitoring dashboard for Winyx project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

# グローバルCSSの作成
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# ホームページの作成
cat > src/app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Winyx Project</h1>
      <p className="mt-4 text-xl">System Monitoring Dashboard</p>
      <a 
        href="/dashboard" 
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </a>
    </main>
  )
}
EOF
```

### 6.1.4 追加パッケージのインストール

- [ ] 基本パッケージのインストール
```bash
# API通信とデータ管理
npm install axios zustand @tanstack/react-query zod react-hook-form
npm install @hookform/resolvers date-fns js-cookie
npm install --save-dev @types/js-cookie

# 契約駆動開発用パッケージ
npm install @grpc/grpc-js @grpc/proto-loader

# OpenAPI/TypeScript型生成
npm install openapi-typescript openapi-fetch
npm install --save-dev swagger-typescript-api

# アイコンライブラリ
npm install lucide-react
```

### 6.1.5 shadcnの初期化（最新版対応）

- [ ] shadcn（旧shadcn-ui）の初期化
```bash
# shadcnの初期化（最新バージョン）
npx shadcn@latest init

# 設定選択（プロンプトが表示される場合）
# ✔ Which color would you like to use as base color? → Neutral
# ✔ Do you want to use CSS variables for theming? → Yes

# 成功時のメッセージ:
# ✔ Checking registry.
# ✔ Installing dependencies.
# ✔ Created 1 file: src/lib/utils.ts
```

- [ ] 必要なUIコンポーネントの追加
```bash
# UIコンポーネントの追加（一括インストール）
npx shadcn@latest add card badge button progress

# 追加コンポーネント（必要に応じて）
npx shadcn@latest add form
npx shadcn@latest add input  
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add alert
```

### 6.1.6 契約駆動開発環境設定

- [ ] 型定義自動生成スクリプトの追加
```bash
# package.jsonにスクリプトを追加
cat >> package.json << 'EOF'
{
  "scripts": {
    "generate:types": "openapi-typescript ../contracts/api/openapi.yaml -o src/types/generated/api.ts",
    "generate:client": "swagger-typescript-api -p ../contracts/api/openapi.yaml -o src/lib/api/generated -n client.ts",
    "contracts:sync": "npm run generate:types && npm run generate:client",
    "postinstall": "npm run contracts:sync"
  }
}
EOF
```

- [ ] 契約ファイル監視設定
```bash
# 契約ファイル変更時の自動再生成設定
cat > scripts/watch-contracts.js << 'EOF'
const chokidar = require('chokidar');
const { exec } = require('child_process');

console.log('契約ファイルの監視を開始します...');

chokidar.watch('../contracts/**/*.{api,yaml,json}').on('change', (path) => {
  console.log(`契約ファイルが変更されました: ${path}`);
  exec('npm run contracts:sync', (error, stdout, stderr) => {
    if (error) {
      console.error(`エラー: ${error}`);
      return;
    }
    console.log('型定義とクライアントを再生成しました');
  });
});
EOF

# 監視用パッケージのインストール
npm install --save-dev chokidar
```

### 6.1.7 ESLint設定（オプション）

- [ ] ESLintのインストールと設定
```bash
# ESLintと関連パッケージのインストール
npm install --save-dev eslint eslint-config-next @typescript-eslint/parser @typescript-eslint/eslint-plugin

# .eslintrc.jsonの作成
cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
EOF
```

### 6.1.8 開発サーバーの起動

- [ ] 開発環境の起動と確認
```bash
# 開発サーバーの起動
npm run dev

# ブラウザでアクセス
# http://localhost:3000 または http://localhost:3001（ポート3000が使用中の場合）

# ビルドの確認
npm run build
npm run start
```

### 6.1.9 環境設定

- [ ] 環境別API設定
```bash
# .env.local（開発環境）
cat > .env.local << 'EOF'
# API設定（開発環境）
NEXT_PUBLIC_API_URL=http://localhost:8888
NEXT_PUBLIC_RPC_URL=http://localhost:9090

# 認証設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key

# 契約駆動開発設定
NEXT_PUBLIC_CONTRACTS_PATH=../contracts
NEXT_PUBLIC_ENABLE_MOCKS=true

# 機能フラグ
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
EOF

# .env.production（本番環境）
cat > .env.production << 'EOF'
# API設定（本番環境ではNginxプロキシ経由）
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_RPC_URL=

# 認証設定
NEXTAUTH_URL=https://winyx.jp
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# 契約駆動開発設定
NEXT_PUBLIC_ENABLE_MOCKS=false

# 機能フラグ
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
EOF
```

### 6.1.10 トラブルシューティング

**shadcnエラーの場合:**
```bash
# フレームワークが検出されない場合
# components.jsonを手動で作成
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

# 再度shadcnを初期化
npx shadcn@latest init
```

**Tailwind CSS v4エラーの場合:**
```bash
# PostCSS設定をv4対応に更新
npm install -D @tailwindcss/postcss

# postcss.config.jsを修正
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
EOF

# または、Tailwind CSS v3を使用する場合
npm uninstall tailwindcss @tailwindcss/postcss
npm install -D tailwindcss@^3.4.0

# v3用のpostcss.config.jsに戻す
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
```

**React Query v5エラーの場合:**
```typescript
// src/lib/providers.tsx でcacheTimeをgcTimeに変更
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30, // v5では cacheTime から gcTime に変更
    },
  },
})
```

---

## 第1.5節 契約駆動開発統合

### 6.1.5.1 契約ファイルからの型定義生成

WinyxプロジェクトではGo-Zero契約駆動開発手法を採用し、APIの型定義をバックエンドの契約ファイル（.api）から自動生成します。

- [ ] OpenAPI仕様書の生成確認
```bash
# バックエンドからOpenAPI仕様を生成
cd /var/www/winyx/backend/user_service
goctl api plugin -plugin goctl-swagger="swagger -filename user.json -host winyx.jp -basepath /api/v1" -api user.api -dir .

# 生成されたOpenAPI仕様をフロントエンド用に配置
cp user.json ../../contracts/api/user-service.json
```

- [ ] TypeScript型の自動生成
```bash
cd /var/www/winyx/frontend

# OpenAPIからTypeScript型を生成
npm run generate:types

# APIクライアントコードの生成
npm run generate:client

# 生成結果の確認
ls -la src/types/generated/
ls -la src/lib/api/generated/
```

### 6.1.5.2 契約変更時の自動同期

契約ファイル（.api）が更新されると、フロントエンドの型定義とAPIクライアントが自動で再生成される仕組みを実装します。

- [ ] 契約ファイル監視システム
```bash
# 開発時の契約監視モード
npm run dev &
npm run contracts:watch &

# または統合開発コマンド
npm run dev:with-contracts
```

### 6.1.5.3 型安全なAPIクライアント

生成された型定義により、コンパイル時にAPIリクエスト・レスポンスの型チェックが行われます。

```typescript
// 例：型安全なユーザー作成
import { api } from '@/lib/api/client'
import type { Generated } from '@/types/generated/api'

// リクエストデータの型チェック
const userData: Generated.CreateUserRequest = {
  name: "田中太郎",
  email: "tanaka@example.com",
  password: "securepass123"
}

// レスポンスデータの型チェック
const user: Generated.UserResponse = await api.users.create(userData)
console.log(user.id) // number型として安全にアクセス
```

### 6.1.5.4 モックAPIサーバー

開発環境では、契約ファイルから生成されたモックサーバーを使用してバックエンド非依存での開発が可能です。

- [ ] モックサーバーの設定
```bash
# prismを使ったモックサーバー
npm install -g @stoplight/prism-cli

# OpenAPI仕様からモックサーバーを起動
prism mock ../contracts/api/user-service.json --port 8888 --host 0.0.0.0
```

- [ ] 環境切り替え設定
```typescript
// src/lib/api/config.ts
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_ENABLE_MOCKS 
    ? 'http://localhost:8888' 
    : process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  enableMocks: process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'
}
```

---

## 第2節 プロジェクト構成とアーキテクチャ

### 6.2.1 ディレクトリ構造

```
frontend/
├── src/
│   ├── app/                     # App Router
│   │   ├── (auth)/              # 認証が必要なルートグループ
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── profile/         # プロフィール
│   │   │   └── layout.tsx       # 認証レイアウト
│   │   ├── (public)/            # 公開ルートグループ
│   │   │   ├── login/           # ログイン
│   │   │   ├── register/        # 登録
│   │   │   └── layout.tsx       # 公開レイアウト
│   │   ├── api/                 # API Routes
│   │   │   ├── auth/            # 認証API
│   │   │   └── users/           # ユーザーAPI
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # ホームページ
│   │   └── globals.css          # グローバルCSS
│   ├── components/              # Reactコンポーネント
│   │   ├── ui/                  # shadcn/uiコンポーネント
│   │   ├── layout/              # レイアウトコンポーネント
│   │   ├── features/            # 機能別コンポーネント
│   │   └── common/              # 共通コンポーネント
│   ├── lib/                     # ライブラリ設定
│   │   ├── api/                 # API クライアント
│   │   ├── auth/                # 認証ユーティリティ
│   │   └── utils/               # ユーティリティ関数
│   ├── hooks/                   # カスタムフック
│   ├── types/                   # TypeScript型定義
│   ├── store/                   # Zustand ストア
│   ├── services/                # ビジネスロジック
│   └── middleware.ts            # Next.js ミドルウェア
├── public/                      # 静的ファイル
├── .env.local                   # 環境変数
└── next.config.js              # Next.js設定
```

### 6.2.2 マイクロサービス対応設定

- [ ] マルチサービス環境変数設定
```bash
vim /var/www/winyx/frontend/.env.local
```

```env
# マイクロサービスAPI設定
NEXT_PUBLIC_USER_API_URL=/api/users
NEXT_PUBLIC_TASK_API_URL=/api/tasks
NEXT_PUBLIC_MESSAGE_API_URL=/api/messages

# 開発環境設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8889

# 認証設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# 契約駆動開発設定
NEXT_PUBLIC_CONTRACTS_BASE=/contracts
NEXT_PUBLIC_OPENAPI_SPEC_URL=/api/docs/openapi.json

# 機能フラグ
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_MOCK_API=true
```

### 6.2.3 Next.js 15の高度な設定

- [ ] Next.js設定ファイル（完全版）
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 15では swcMinify がデフォルトで有効のため削除
  
  // 画像ドメイン設定
  images: {
    domains: ['localhost', 'winyx.jp'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ]
  },
  
  // Webpack設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
```

### 6.2.4 RPC接続アーキテクチャ

Winyxプロジェクトでは、フロントエンドからバックエンドへの通信は以下のアーキテクチャを採用しています。

#### 全体アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ブラウザ       │────▶│    Nginx        │────▶│   Go-Zero       │────▶│  Go-Zero RPC    │
│  (winyx.jp)     │ HTTP│  (Reverse Proxy)│ HTTP│   REST API      │ gRPC│  (Port: 9090)   │
│                 │     │  /api/* → :8888 │     │  (Port: 8888)   │     │   (内部のみ)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                    [JWT認証]
                                                    [APIゲートウェイ]
```

**アーキテクチャの特徴:**
- ブラウザからの全てのAPIリクエストはNginxを経由
- Nginxが`/api/*`へのリクエストをREST API（8888）にプロキシ
- REST APIがバックエンドのgRPCサービス（9090）と内部通信
- RPCポートは外部に公開されず、セキュリティが強化

#### 静的エクスポート対応

Next.js 15では静的エクスポート（`output: 'export'`）を使用しているため：

```
┌─────────────────┐
│  静的HTMLファイル  │
│ (out/ディレクトリ) │
└─────────────────┘
         ▼
┌─────────────────┐
│     Nginx       │  ← 静的ファイル配信
│   /api/* proxy  │  ← APIプロキシ
└─────────────────┘
```

**静的エクスポートの利点:**
- サーバーサイドのNode.js不要
- 高速な静的ファイル配信
- Nginxのみで配信可能
- スケーラビリティの向上

### 6.2.5 マイクロサービス対応Nginxプロキシ設定

- [ ] Nginx設定ファイル（/etc/nginx/sites-available/winyx）
```nginx
server {
    listen 80;
    server_name winyx.jp www.winyx.jp;
    
    # マイクロサービスAPI プロキシ設定
    # UserService (ユーザー管理)
    location /api/users/ {
        proxy_pass http://localhost:8888/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Service-Name "user_service";
    }
    
    # TaskService (タスク管理)
    location /api/tasks/ {
        proxy_pass http://localhost:8889/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Service-Name "task_service";
    }
    
    # MessageService (メッセージ管理)
    location /api/messages/ {
        proxy_pass http://localhost:8890/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Service-Name "message_service";
    }
    
    # WebSocket接続（リアルタイム通信）
    location /ws/ {
        proxy_pass http://localhost:8890;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # OpenAPI仕様書配信
    location /api/docs/ {
        proxy_pass http://localhost:8888/docs/;
        proxy_set_header Host $host;
    }
    
    # フロントエンド静的ファイル（Static Export）
    root /var/www/winyx/frontend/out;
    index index.html;
    
    # SPAのルーティング対応
    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }
}
```

---

## 第3節 認証システムの実装

### 6.3.1 認証コンテキストの作成

- [ ] 認証プロバイダーの実装
```bash
vim /var/www/winyx/frontend/src/lib/auth/auth-context.tsx
```

```typescript
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { api } from '@/lib/api/client'

interface User {
  id: number
  email: string
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

interface RegisterData {
  email: string
  password: string
  name: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 初回マウント時にユーザー情報を取得
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('access_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await api.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      })

      const { user, access_token, refresh_token } = response.data

      // トークンをCookieに保存
      Cookies.set('access_token', access_token, {
        expires: 1, // 1日
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })

      Cookies.set('refresh_token', refresh_token, {
        expires: 7, // 7日
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })

      setUser(user)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'ログインに失敗しました')
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/api/auth/register', data)
      const { user, access_token, refresh_token } = response.data

      Cookies.set('access_token', access_token, {
        expires: 1,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })

      Cookies.set('refresh_token', refresh_token, {
        expires: 7,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })

      setUser(user)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '登録に失敗しました')
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      setUser(null)
      router.push('/login')
    }
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 6.3.2 Go-Zero API統合クライアント設定

- [ ] マイクロサービス対応APIクライアントの設定
```bash
vim /var/www/winyx/frontend/src/lib/api/client.ts
```

```typescript
import Cookies from 'js-cookie'
import type { Generated } from '@/types/generated/api'

// マイクロサービス別URLを管理
interface ServiceEndpoints {
  users: string
  tasks: string
  messages: string
}

const SERVICE_ENDPOINTS: ServiceEndpoints = {
  users: process.env.NEXT_PUBLIC_USER_API_URL || '/api/users',
  tasks: process.env.NEXT_PUBLIC_TASK_API_URL || '/api/tasks',
  messages: process.env.NEXT_PUBLIC_MESSAGE_API_URL || '/api/messages',
}

class GoZeroApiClient {
  private getServiceUrl(service: keyof ServiceEndpoints): string {
    return SERVICE_ENDPOINTS[service]
  }

  private async request<T>(
    service: keyof ServiceEndpoints,
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<T> {
    const baseUrl = this.getServiceUrl(service)
    const url = `${baseUrl}${endpoint}`
    
    const token = Cookies.get('access_token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, config)
      
      if (response.status === 401) {
        await this.handleTokenRefresh()
        // リトライ
        headers.Authorization = `Bearer ${Cookies.get('access_token')}`
        const retryResponse = await fetch(url, { ...config, headers })
        
        if (!retryResponse.ok) {
          throw new Error(`API Error: ${retryResponse.status}`)
        }
        
        return retryResponse.json()
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || `API Error: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return response.json()
      }
      
      return response.text() as any
    } catch (error) {
      console.error(`API Request failed [${service}${endpoint}]:`, error)
      throw error
    }
  }

  private async handleTokenRefresh(): Promise<void> {
    const refreshToken = Cookies.get('refresh_token')
    if (!refreshToken) {
      window.location.href = '/login'
      return
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const { access_token } = await response.json()
      Cookies.set('access_token', access_token, {
        expires: 1,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
    } catch (error) {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      window.location.href = '/login'
    }
  }

  // UserService API
  users = {
    get: <T = Generated.UserResponse>(id: number): Promise<T> =>
      this.request('users', `/${id}`),
    list: <T = Generated.UserListResponse>(params?: Generated.UserListParams): Promise<T> =>
      this.request('users', `?${new URLSearchParams(params as any)}`),
    create: <T = Generated.UserResponse>(data: Generated.CreateUserRequest): Promise<T> =>
      this.request('users', '/', 'POST', data),
    update: <T = Generated.UserResponse>(id: number, data: Generated.UpdateUserRequest): Promise<T> =>
      this.request('users', `/${id}`, 'PUT', data),
    delete: (id: number): Promise<void> =>
      this.request('users', `/${id}`, 'DELETE'),
  }

  // TaskService API
  tasks = {
    get: <T = Generated.TaskResponse>(id: number): Promise<T> =>
      this.request('tasks', `/${id}`),
    list: <T = Generated.TaskListResponse>(params?: Generated.TaskListParams): Promise<T> =>
      this.request('tasks', `?${new URLSearchParams(params as any)}`),
    create: <T = Generated.TaskResponse>(data: Generated.CreateTaskRequest): Promise<T> =>
      this.request('tasks', '/', 'POST', data),
    update: <T = Generated.TaskResponse>(id: number, data: Generated.UpdateTaskRequest): Promise<T> =>
      this.request('tasks', `/${id}`, 'PUT', data),
    delete: (id: number): Promise<void> =>
      this.request('tasks', `/${id}`, 'DELETE'),
  }

  // MessageService API
  messages = {
    get: <T = Generated.MessageResponse>(id: number): Promise<T> =>
      this.request('messages', `/${id}`),
    list: <T = Generated.MessageListResponse>(params?: Generated.MessageListParams): Promise<T> =>
      this.request('messages', `?${new URLSearchParams(params as any)}`),
    send: <T = Generated.MessageResponse>(data: Generated.SendMessageRequest): Promise<T> =>
      this.request('messages', '/', 'POST', data),
    delete: (id: number): Promise<void> =>
      this.request('messages', `/${id}`, 'DELETE'),
  }

  // 認証API
  auth = {
    login: <T = Generated.LoginResponse>(data: Generated.LoginRequest): Promise<T> =>
      this.request('users', '/auth/login', 'POST', data),
    register: <T = Generated.RegisterResponse>(data: Generated.RegisterRequest): Promise<T> =>
      this.request('users', '/auth/register', 'POST', data),
    logout: (): Promise<void> =>
      this.request('users', '/auth/logout', 'POST'),
    me: <T = Generated.UserResponse>(): Promise<T> =>
      this.request('users', '/auth/me'),
  }
}

export const api = new GoZeroApiClient()
export type ApiClient = typeof api

// 後方互換性のためのエクスポート
export const apiRequest = api
```

### 6.3.3 認証ミドルウェア

- [ ] Next.jsミドルウェアの実装
```bash
vim /var/www/winyx/frontend/src/middleware.ts
```

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護されたルート
const protectedRoutes = ['/dashboard', '/profile', '/settings']

// 公開ルート（認証済みユーザーはアクセス不可）
const authRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')
  const { pathname } = request.nextUrl

  // 保護されたルートへのアクセス
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 認証済みユーザーの認証ページへのアクセス
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // CSRFトークンの設定
  const response = NextResponse.next()
  
  // セキュリティヘッダーの追加
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

## 第4節 状態管理とAPI統合

### 6.4.1 Zustandストアの設定

- [ ] グローバル状態管理の実装
```bash
vim /var/www/winyx/frontend/src/store/app-store.ts
```

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // UI状態
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // ユーザー設定
  language: 'ja' | 'en'
  notifications: boolean
  
  // アクション
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: 'ja' | 'en') => void
  setNotifications: (enabled: boolean) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // 初期状態
        sidebarOpen: false,
        theme: 'light',
        language: 'ja',
        notifications: true,
        
        // アクション
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        setLanguage: (language) => set({ language }),
        setNotifications: (enabled) => set({ notifications: enabled }),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          notifications: state.notifications,
        }),
      }
    ),
    { name: 'AppStore' }
  )
)
```

### 6.2.6 React Query最適化設定

- [ ] Go-Zero対応React Query設定
```bash
vim /var/www/winyx/frontend/src/hooks/use-contract-api.ts
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from '@/components/ui/use-toast'
import type { Generated } from '@/types/generated/api'

// 契約駆動APIクエリーキー
export const QueryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...QueryKeys.users.all, 'list'] as const,
    list: (params: Generated.UserListParams) => [...QueryKeys.users.lists(), params] as const,
    details: () => [...QueryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...QueryKeys.users.details(), id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...QueryKeys.tasks.all, 'list'] as const,
    list: (params: Generated.TaskListParams) => [...QueryKeys.tasks.lists(), params] as const,
    details: () => [...QueryKeys.tasks.all, 'detail'] as const,
    detail: (id: number) => [...QueryKeys.tasks.details(), id] as const,
  },
  messages: {
    all: ['messages'] as const,
    lists: () => [...QueryKeys.messages.all, 'list'] as const,
    list: (params: Generated.MessageListParams) => [...QueryKeys.messages.lists(), params] as const,
    details: () => [...QueryKeys.messages.all, 'detail'] as const,
    detail: (id: number) => [...QueryKeys.messages.details(), id] as const,
  },
} as const

// ユーザー管理フック
export function useUser(id: number) {
  return useQuery({
    queryKey: QueryKeys.users.detail(id),
    queryFn: () => api.users.get(id),
    enabled: !!id,
  })
}

export function useUsers(params: Generated.UserListParams = {}) {
  return useQuery({
    queryKey: QueryKeys.users.list(params),
    queryFn: () => api.users.list(params),
    staleTime: 1000 * 60 * 5, // 5分
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.users.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all })
      toast({
        title: '成功',
        description: 'ユーザーが作成されました',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'エラー',
        description: error.message || 'ユーザーの作成に失敗しました',
        variant: 'destructive',
      })
    },
  })
}

// タスク管理フック
export function useTask(id: number) {
  return useQuery({
    queryKey: QueryKeys.tasks.detail(id),
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
  })
}

export function useTasks(params: Generated.TaskListParams = {}) {
  return useQuery({
    queryKey: QueryKeys.tasks.list(params),
    queryFn: () => api.tasks.list(params),
    staleTime: 1000 * 60 * 2, // 2分（タスクは更新頻度が高い）
    refetchOnWindowFocus: true,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all })
      toast({
        title: '成功',
        description: 'タスクが作成されました',
      })
    },
  })
}

// メッセージ管理フック
export function useMessages(params: Generated.MessageListParams = {}) {
  return useQuery({
    queryKey: QueryKeys.messages.list(params),
    queryFn: () => api.messages.list(params),
    staleTime: 1000 * 30, // 30秒（リアルタイム性重視）
    refetchInterval: 1000 * 30,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.messages.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.messages.all })
    },
    onError: (error: any) => {
      toast({
        title: 'エラー',
        description: error.message || 'メッセージの送信に失敗しました',
        variant: 'destructive',
      })
    },
  })
}
```

### 6.4.2 React Query設定

- [ ] React Queryプロバイダーの設定
```bash
vim /var/www/winyx/frontend/src/lib/query/query-provider.tsx
```

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5分
            gcTime: 1000 * 60 * 30, // 30分
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // 401エラーの場合は再試行しない
              if (error?.response?.status === 401) {
                return false
              }
              // その他のエラーは3回まで再試行
              return failureCount < 3
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // 4xxエラーは再試行しない
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### 6.4.3 カスタムフック

- [ ] APIリクエスト用カスタムフック
```bash
vim /var/www/winyx/frontend/src/hooks/use-api.ts
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import { toast } from '@/components/ui/use-toast'

// GET リクエスト用フック
export function useApiQuery<T = any>(
  key: string | string[],
  url: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
  }
) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => apiRequest.get<T>(url),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

// POST リクエスト用フック
export function useApiMutation<TData = any, TVariables = any>(
  url: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: any, variables: TVariables) => void
    invalidateQueries?: string[]
    showSuccessToast?: boolean
    showErrorToast?: boolean
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => 
      apiRequest.post<TData>(url, variables),
    onSuccess: (data, variables) => {
      // 指定されたクエリを無効化
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        })
      }

      // 成功トーストの表示
      if (options?.showSuccessToast) {
        toast({
          title: '成功',
          description: '操作が正常に完了しました。',
        })
      }

      options?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      // エラートーストの表示
      if (options?.showErrorToast) {
        toast({
          title: 'エラー',
          description: error?.response?.data?.message || '操作に失敗しました。',
          variant: 'destructive',
        })
      }

      options?.onError?.(error, variables)
    },
  })
}

// PUT リクエスト用フック
export function useApiUpdateMutation<TData = any, TVariables = any>(
  url: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: any, variables: TVariables) => void
    invalidateQueries?: string[]
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => 
      apiRequest.put<TData>(url, variables),
    onSuccess: (data, variables) => {
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        })
      }
      options?.onSuccess?.(data, variables)
    },
    onError: options?.onError,
  })
}

// DELETE リクエスト用フック
export function useApiDeleteMutation<TVariables = any>(
  url: string,
  options?: {
    onSuccess?: (variables: TVariables) => void
    onError?: (error: any, variables: TVariables) => void
    invalidateQueries?: string[]
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => 
      apiRequest.delete(url),
    onSuccess: (data, variables) => {
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        })
      }
      options?.onSuccess?.(variables)
    },
    onError: options?.onError,
  })
}
```

---

## 第5節 UIコンポーネントの構築

### 6.5.1 レイアウトコンポーネント

- [ ] ダッシュボードレイアウト
```bash
vim /var/www/winyx/frontend/src/components/layout/dashboard-layout.tsx
```

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth/auth-context'
import {
  HomeIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
} from 'lucide-react'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon },
  { name: 'プロフィール', href: '/profile', icon: UserIcon },
  { name: '設定', href: '/settings', icon: SettingsIcon },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モバイルサイドバー */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-64 max-w-xs bg-white">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <span className="text-xl font-semibold">Winyx</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <XIcon className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* デスクトップサイドバー */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <nav className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-6 border-b">
            <span className="text-xl font-semibold">Winyx</span>
          </div>
          <div className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="lg:pl-64">
        {/* ヘッダー */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="h-6 w-6" />
            </Button>

            <div className="flex items-center ml-auto space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">プロフィール</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">設定</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* メインコンテンツエリア */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 6.5.2 フォームコンポーネント

- [ ] ログインフォーム
```bash
vim /var/www/winyx/frontend/src/components/features/auth/login-form.tsx
```

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from '@/components/ui/use-toast'

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
    } catch (error) {
      toast({
        title: 'ログインエラー',
        description: error instanceof Error ? error.message : 'ログインに失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          ログイン
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="パスワードを入力"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
```

### 6.5.3 共通コンポーネント

- [ ] ローディングコンポーネント
```bash
vim /var/www/winyx/frontend/src/components/common/loading.tsx
```

```typescript
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ size = 'md', className }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size]
        )}
      />
    </div>
  )
}
```

- [ ] エラーバウンダリ
```bash
vim /var/www/winyx/frontend/src/components/common/error-boundary.tsx
```

```typescript
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">
                エラーが発生しました
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                申し訳ございませんが、予期しないエラーが発生しました。
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs">
                  <summary>詳細</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                ページを再読み込み
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## まとめ

本章で構築したNext.jsフロントエンド基盤により：

1. **契約駆動開発統合** - Go-Zero契約ファイルからの型自動生成、リアルタイム同期
2. **モダンな開発環境** - Next.js 15 App Router、TypeScript、Tailwind CSS
3. **マイクロサービス対応** - UserService、TaskService、MessageService個別対応
4. **静的エクスポート対応** - 高速配信、Node.js不要、Nginxのみで動作
5. **型安全なAPI通信** - 自動生成型、コンパイル時チェック、エラーハンドリング
6. **堅牢な認証システム** - JWTトークン、リフレッシュトークン、認証ミドルウェア
7. **効率的な状態管理** - Zustand、React Query v5、カスタムフック
8. **再利用可能なUI** - shadcn/ui、コンポーネント設計

**契約駆動開発とマイクロサービス最適化**により、Go-Zeroバックエンドと完全に統合された高速でスケーラブルなフロントエンド基盤が整いました。開発時は型安全性を確保し、本番では静的配信による高速アクセスを実現します。