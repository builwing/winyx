# 第6章 Next.jsフロントエンド基盤構築

> 本章では、WinyxプロジェクトのNext.js 14（App Router）を使用したモダンなフロントエンド基盤構築について解説します。TypeScript、Tailwind CSS、shadcn/uiを活用した開発手法を提供します。

---

## 第1節 Next.jsプロジェクトの初期設定

### 6.1.1 プロジェクトの作成

- [ ] Next.js 14プロジェクトの初期化
```bash
cd /var/www/winyx
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"

# 対話形式の選択
# ✔ Would you like to use ESLint? → Yes
# ✔ Would you like to use `src/` directory? → Yes
# ✔ Would you like to use App Router? → Yes
# ✔ Would you like to customize the default import alias? → No
```

### 6.1.2 必要なパッケージのインストール

- [ ] 基本パッケージのインストール
```bash
cd /var/www/winyx/frontend
npm install axios zustand @tanstack/react-query zod react-hook-form
npm install @hookform/resolvers date-fns js-cookie
npm install --save-dev @types/js-cookie
```

- [ ] UIライブラリのインストール
```bash
# shadcn/uiの初期化
npx shadcn-ui@latest init

# 設定選択
# ✔ Which style would you like to use? → Default
# ✔ Which color would you like to use as base color? → Slate
# ✔ Would you like to use CSS variables for colors? → Yes

# 必要なコンポーネントの追加
npx shadcn-ui@latest add button
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add alert
```

### 6.1.3 TypeScript設定

- [ ] TypeScript設定の最適化
```bash
vim /var/www/winyx/frontend/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/store/*": ["./src/store/*"],
      "@/services/*": ["./src/services/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6.1.4 ESLint設定

- [ ] ESLint設定のカスタマイズ
```bash
vim /var/www/winyx/frontend/.eslintrc.json
```

```json
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

### 6.2.2 環境変数設定

- [ ] 環境変数ファイルの作成
```bash
vim /var/www/winyx/frontend/.env.local
```

```env
# API設定
NEXT_PUBLIC_API_URL=http://localhost:8888
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 認証設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# 機能フラグ
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### 6.2.3 Next.js設定

- [ ] Next.js設定ファイル
```bash
vim /var/www/winyx/frontend/next.config.js
```

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
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

### 6.2.4 環境別通信アーキテクチャ

Winyxプロジェクトでは、開発効率と本番パフォーマンスの最適化のため、環境別に異なる通信方式を採用しています。

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
                        [開発者ツール]
```

**開発環境の特徴:**
- Next.js開発サーバー（3000）からHTTP/RESTでGo-Zero API（8888）に直接接続
- ホットリロード、開発者ツールの活用が可能
- デバッグが容易で、レスポンス内容を直接確認可能
- CORS設定により外部からのアクセスが可能

#### 本番環境アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ブラウザ       │────▶│  Next.js        │────▶│  Go-Zero RPC    │
│  (Public)       │ HTTP│  API Routes     │ gRPC│  (Port: 9090)   │
│                 │     │  (内部実行)      │     │   (内部のみ)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                      [Server-Side Execution]
                      [高速内部通信]
```

**本番環境の特徴:**
- Next.js API Routesがサーバーサイドで内部gRPCによりGo-Zero RPC（9090）と通信
- 高速な内部通信によるレスポンス時間の最適化
- RPCポートは外部に公開されず、セキュリティが強化
- サーバーサイドレンダリング（SSR）との親和性が高い

#### 環境切り替えの仕組み

- [ ] 環境判定とAPI接続先の自動切り替え
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

### 6.3.2 環境別APIクライアントの設定

- [ ] 環境対応APIクライアントの設定
```bash
vim /var/www/winyx/frontend/src/lib/api/client.ts
```

```typescript
import axios, { AxiosError, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'
import { getApiConfig } from './config'

const apiConfig = getApiConfig()

// APIクライアントの作成（環境別設定）
export const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 開発環境用：直接REST API接続
const createDirectApiClient = () => {
  const directApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return directApi
}

// 本番環境用：API Routes経由接続
const createProxyApiClient = () => {
  const proxyApi = axios.create({
    baseURL: '/api', // Next.js API Routes
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return proxyApi
}

// 環境に応じたAPIクライアント
export const environmentApi = process.env.NODE_ENV === 'production' 
  ? createProxyApiClient() 
  : createDirectApiClient()

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// レスポンスインターセプター
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // 401エラーでリフレッシュトークンがある場合
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = Cookies.get('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
            { refresh_token: refreshToken }
          )

          const { access_token } = response.data
          Cookies.set('access_token', access_token, {
            expires: 1,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
          })

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          // リフレッシュも失敗した場合はログアウト
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    return Promise.reject(error)
  }
)

// 型安全なAPIリクエスト関数
export const apiRequest = {
  get: <T = any>(url: string, config?: any): Promise<T> =>
    api.get(url, config).then((res) => res.data),
    
  post: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    api.post(url, data, config).then((res) => res.data),
    
  put: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    api.put(url, data, config).then((res) => res.data),
    
  delete: <T = any>(url: string, config?: any): Promise<T> =>
    api.delete(url, config).then((res) => res.data),
    
  patch: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    api.patch(url, data, config).then((res) => res.data),
}
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

1. **モダンな開発環境** - Next.js 14 App Router、TypeScript、Tailwind CSS
2. **堅牢な認証システム** - JWTトークン、リフレッシュトークン、認証ミドルウェア
3. **効率的な状態管理** - Zustand、React Query、カスタムフック
4. **再利用可能なUI** - shadcn/ui、コンポーネント設計
5. **環境別最適化** - 開発時REST API、本番時RPC接続

**開発効率と本番パフォーマンスの両立**を実現する基盤が整いました。次章では、この基盤を活用した契約駆動開発とAPI統合について詳しく解説します。