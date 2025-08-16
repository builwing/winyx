# 第7章 契約駆動開発とAPI統合

> 本章では、Go-Zero API契約ファイルを中心とした契約駆動開発手法と、フロントエンドとの型安全なAPI統合について解説します。

---

## 第1節 契約駆動開発の概要

### 7.1.1 契約駆動開発とは

WinyxプロジェクトではGo-ZeroのAPI契約ファイル（.api）とRPC契約ファイル（.proto）を単一の信頼できる情報源として使用し、マイクロサービス間およびフロントエンドとの仕様齟齬を防ぐ開発手法を採用しています。

#### マイクロサービス契約駆動アーキテクチャ

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Go-Zero契約管理     │    │   UserService        │    │   TaskService       │
│ /contracts/api/     │───▶│  user_service.api    │    │  task_service.api   │
│ /contracts/rpc/     │    │  user_service.proto  │    │  task_service.proto │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                          │                          │
           │                          ▼                          ▼
           │               ┌──────────────────┐    ┌──────────────────┐
           │               │  REST API Server │    │  gRPC Server     │
           │               │  (Port: 8888)    │    │  (Port: 9091)    │
           │               └──────────────────┘    └──────────────────┘
           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  TypeScript Types   │    │   OpenAPI Spec       │    │   Frontend Client   │
│  (自動生成)         │    │   (自動生成)         │    │   (型安全)           │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### 7.1.2 マイクロサービス契約駆動開発のメリット

- **型安全性の保証**: マイクロサービス間およびフロントエンド間での型の不整合を防止
- **サービス独立性**: 各サービスが独自の契約を持ち、独立して開発・デプロイ可能
- **自動同期**: 契約ファイルの変更時に自動的にクライアントコードを生成
- **破壊的変更検出**: API変更の後方互換性を自動チェック
- **開発効率の向上**: 手動での型定義やAPIクライアント作成が不要
- **仕様書の自動生成**: OpenAPI/Swagger仕様書の自動生成
- **チーム間の連携強化**: 統一された契約による認識の一致
- **RPC最適化**: 内部通信にgRPCを使用した高速通信

---

## 第2節 マイクロサービス別契約管理

### 7.2.1 CLAUDE.md規約準拠の契約ファイル配置

契約ファイルはCLAUDE.md規約に従い、サービス別に管理されます：

```
contracts/
├── user_service/           # UserService契約
│   ├── user.api           # REST API契約
│   ├── user.proto         # gRPC契約
│   └── schema.sql         # データベーススキーマ
├── task_service/          # TaskService契約
│   ├── task.api
│   ├── task.proto
│   └── schema.sql
├── message_service/       # MessageService契約
│   ├── message.api
│   ├── message.proto
│   └── schema.sql
└── shared/               # 共通定義
    ├── common.api        # 共通型定義
    └── errors.api        # エラー型定義
```

### 7.2.2 マルチサービス型定義生成ツール

- [ ] サービス別型生成スクリプトの確認
```bash
vim /var/www/winyx/scripts/generate_types_multi_service.js
```

このスクリプトは以下の機能を提供します：
- マルチサービス対応Go-Zero .apiファイルの解析
- サービス別TypeScript型定義の自動生成
- サービス別APIクライアント関数の生成
- サービス別React Queryフックの自動生成
- 契約依存関係の自動解決

### 7.2.3 生成されるファイル構成（マイクロサービス対応）

```
frontend/src/
├── types/generated/
│   ├── user-service.ts        # UserService型定義
│   ├── task-service.ts        # TaskService型定義
│   ├── message-service.ts     # MessageService型定義
│   ├── common.ts              # 共通型定義
│   └── index.ts               # 型定義の統合エクスポート
├── lib/api/generated/
│   ├── user-service/
│   │   ├── client.ts          # UserService APIクライアント
│   │   └── hooks.ts           # UserService React Queryフック
│   ├── task-service/
│   │   ├── client.ts          # TaskService APIクライアント
│   │   └── hooks.ts           # TaskService React Queryフック
│   ├── message-service/
│   │   ├── client.ts          # MessageService APIクライアント
│   │   └── hooks.ts           # MessageService React Queryフック
│   └── index.ts               # サービス統合エクスポート
```

### 7.2.4 マルチサービス型生成の実行

- [ ] 全サービス一括生成
```bash
cd /var/www/winyx/scripts
# 全サービスの型定義を生成
node generate_types_multi_service.js --all
```

- [ ] 特定サービスのみ生成
```bash
# UserServiceのみ生成
node generate_types_multi_service.js --service user_service

# TaskServiceのみ生成
node generate_types_multi_service.js --service task_service
```

- [ ] 自動実行（契約ファイル監視）
```bash
# 全サービス監視モード
./sync_contracts.sh --watch --multi-service

# 特定サービス監視モード
./sync_contracts.sh --watch --service user_service
```

---

## 第3節 自動同期システムの構築

### 7.3.1 マイクロサービス対応同期システム

- [ ] 統合同期スクリプト（最新goctl対応）
```bash
vim /var/www/winyx/scripts/sync_contracts_multi.sh
```

主な機能：
- マルチサービス契約ファイルの変更検出
- 最新goctlコマンドでGo-Zeroコードの生成
- サービス別TypeScript型定義の生成
- サービス別OpenAPI仕様書の生成
- Protocol Buffers同期対応
- 破壊的変更の自動検出
- Etcdサービスディスカバリ連携
- エラーハンドリングとSlack通知

### 7.3.2 マイクロサービス対応自動同期設定

- [ ] Git Hooksの設定（マルチサービス対応）
```bash
# Git hooksを自動インストール（マルチサービス対応）
./scripts/sync_contracts_multi.sh --install-hooks

# 手動でhooksを確認
cat .git/hooks/pre-commit
```

生成されるpre-commitフック（マイクロサービス対応）：
```bash
#!/bin/bash
# Winyxマイクロサービス契約ファイル同期 pre-commitフック

# 契約ファイルの変更検出（.apiと.proto）
changed_contracts=$(git diff --cached --name-only | grep -E '\.(api|proto)$')

if [ -n "$changed_contracts" ]; then
    echo "🔄 契約ファイルの変更を検出: $changed_contracts"
    echo "🔍 破壊的変更チェックと同期を実行中..."
    
    # 破壊的変更のチェック
    if ! /var/www/winyx/scripts/check_breaking_changes.sh; then
        echo "⚠️ 破壊的変更が検出されました。コミットを中止します。"
        echo "📝 APIバージョンを更新するか、後方互換性を保つ必要があります。"
        exit 1
    fi
    
    # マルチサービス同期実行
    if /var/www/winyx/scripts/sync_contracts_multi.sh --pre-commit; then
        # 生成されたファイルをコミットに追加
        git add frontend/src/types/generated/
        git add frontend/src/lib/api/generated/
        git add backend/*/internal/types/
        git add backend/*/internal/handler/
        git add docs/openapi/
        
        echo "✅ マイクロサービス契約同期が完了しました"
        
        # Slack通知（オプション）
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            /var/www/winyx/scripts/notify_contract_changes.sh "$changed_contracts"
        fi
    else
        echo "❌ マイクロサービス契約同期に失敗しました"
        echo "🔍 ログ確認: tail -f /var/log/winyx/contract-sync.log"
        exit 1
    fi
fi

# RPCサービスのビルドテスト
if echo "$changed_contracts" | grep -q '\.proto$'; then
    echo "🛠️ RPCサービスのビルドテストを実行中..."
    if ! /var/www/winyx/scripts/test_rpc_services.sh; then
        echo "❌ RPCサービスのビルドテストに失敗しました"
        exit 1
    fi
    echo "✅ RPCサービスのビルドテストが成功しました"
fi
```

### 7.3.3 マイクロサービス対応リアルタイム監視

- [ ] マルチサービスリアルタイム監視の開始
```bash
# 全サービス監視モード
./scripts/sync_contracts_multi.sh --watch --all

# 特定サービスのみ監視
./scripts/sync_contracts_multi.sh --watch --service user_service

# 監視サービスのステータス確認
./scripts/sync_contracts_multi.sh --status
```

この機能により、以下が実現されます：
- サービス別契約ファイルの変更検出
- 影響範囲の自動判定（依存サービスの特定）
- 最適化された部分的再生成
- リアルタイムエラー通知
- 破壊的変更の即座アラート

---

## 第4節 型安全なAPIクライアントの使用

### 7.4.1 CLAUDE.md規約準拠の契約ファイル定義例

#### UserService契約ファイル例
```go
// contracts/user_service/user.api
syntax = "v1"

info (
    title:   "UserService API"
    desc:    "User management endpoints"
    author:  "Winyx Team"
    version: "v1.0"
)

import "../shared/common.api"

type UserProfileReq {
    Name     string `json:"name" validate:"required,min=1,max=50"`
    Email    string `json:"email" validate:"required,email"`
    Bio      string `json:"bio,optional" validate:"max=200"`
}

type UserProfileRes {
    Id       int64  `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Bio      string `json:"bio"`
    Avatar   string `json:"avatar,optional"`
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
}

type UserListReq {
    Page     int `form:"page,default=1" validate:"min=1"`
    PageSize int `form:"page_size,default=10" validate:"min=1,max=100"`
    Keyword  string `form:"keyword,optional"`
}

type UserListRes {
    Users []UserProfileRes `json:"users"`
    Total int64           `json:"total"`
    Page  int             `json:"page"`
    PageSize int          `json:"page_size"`
}

@server(
    jwt: Auth
    group: user
    prefix: /api/v1/users
    middleware: RateLimit
)
service user_service {
    @doc "Update user profile"
    @handler updateProfile
    put /:id (UserProfileReq) returns (UserProfileRes)
    
    @doc "Get current user profile"
    @handler getProfile  
    get /me returns (UserProfileRes)
    
    @doc "List users with pagination"
    @handler listUsers
    get / (UserListReq) returns (UserListRes)
}

@server(
    group: auth
    prefix: /api/v1/auth
)
service user_service {
    @doc "User login"
    @handler login
    post /login (LoginReq) returns (LoginRes)
    
    @doc "User registration"
    @handler register
    post /register (RegisterReq) returns (RegisterRes)
}
```

#### TaskService契約ファイル例
```go
// contracts/task_service/task.api
syntax = "v1"

info (
    title:   "TaskService API"
    desc:    "Task management endpoints"
    author:  "Winyx Team"
    version: "v1.0"
)

import "../shared/common.api"

type TaskReq {
    Title       string `json:"title" validate:"required,min=1,max=100"`
    Description string `json:"description,optional" validate:"max=500"`
    Priority    int    `json:"priority" validate:"min=1,max=5"`
    DueDate     string `json:"due_date,optional"`
    AssigneeId  int64  `json:"assignee_id,optional"`
}

type TaskRes {
    Id          int64  `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description"`
    Priority    int    `json:"priority"`
    Status      string `json:"status"`
    DueDate     string `json:"due_date"`
    AssigneeId  int64  `json:"assignee_id"`
    CreatedBy   int64  `json:"created_by"`
    CreatedAt   string `json:"created_at"`
    UpdatedAt   string `json:"updated_at"`
}

@server(
    jwt: Auth
    group: task
    prefix: /api/v1/tasks
    middleware: RateLimit
)
service task_service {
    @doc "Create new task"
    @handler createTask
    post / (TaskReq) returns (TaskRes)
    
    @doc "Get task by ID"
    @handler getTask
    get /:id returns (TaskRes)
    
    @doc "Update task"
    @handler updateTask
    put /:id (TaskReq) returns (TaskRes)
    
    @doc "Delete task"
    @handler deleteTask
    delete /:id returns ()
}
```

### 7.4.2 自動生成されるTypeScript型（マイクロサービス対応）

```typescript
// frontend/src/types/generated/user-service.ts (自動生成)
export namespace UserService {
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
    updated_at: string;
  }

  export interface UserListReq {
    page?: number;
    page_size?: number;
    keyword?: string;
  }

  export interface UserListRes {
    users: UserProfileRes[];
    total: number;
    page: number;
    page_size: number;
  }

  export interface LoginReq {
    email: string;
    password: string;
  }

  export interface LoginRes {
    user: UserProfileRes;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }
}

// frontend/src/types/generated/task-service.ts (自動生成)
export namespace TaskService {
  export interface TaskReq {
    title: string;
    description?: string;
    priority: number;
    due_date?: string;
    assignee_id?: number;
  }

  export interface TaskRes {
    id: number;
    title: string;
    description: string;
    priority: number;
    status: string;
    due_date: string;
    assignee_id: number;
    created_by: number;
    created_at: string;
    updated_at: string;
  }
}

// frontend/src/types/generated/index.ts (統合エクスポート)
export * from './user-service';
export * from './task-service';
export * from './message-service';
export * from './common';
```

### 7.4.3 自動生成されるサービス別APIクライアント

```typescript
// frontend/src/lib/api/generated/user-service/client.ts (自動生成)
import { UserService } from '@/types/generated/user-service';
import { apiRequest } from '@/lib/api/client';

export const userServiceApi = {
  // User Profile Management
  user: {
    /**
     * Update user profile
     * @requires Authentication
     * @path PUT /api/v1/users/:id
     */
    updateProfile: (id: number, data: UserService.UserProfileReq): Promise<UserService.UserProfileRes> => {
      return apiRequest.put<UserService.UserProfileRes>(`/api/v1/users/${id}`, data);
    },

    /**
     * Get current user profile
     * @requires Authentication  
     * @path GET /api/v1/users/me
     */
    getProfile: (): Promise<UserService.UserProfileRes> => {
      return apiRequest.get<UserService.UserProfileRes>('/api/v1/users/me');
    },

    /**
     * List users with pagination
     * @requires Authentication
     * @path GET /api/v1/users
     */
    listUsers: (params?: UserService.UserListReq): Promise<UserService.UserListRes> => {
      return apiRequest.get<UserService.UserListRes>('/api/v1/users', { params });
    },
  },

  // Authentication
  auth: {
    /**
     * User login
     * @path POST /api/v1/auth/login
     */
    login: (data: UserService.LoginReq): Promise<UserService.LoginRes> => {
      return apiRequest.post<UserService.LoginRes>('/api/v1/auth/login', data);
    },

    /**
     * User registration
     * @path POST /api/v1/auth/register
     */
    register: (data: UserService.RegisterReq): Promise<UserService.RegisterRes> => {
      return apiRequest.post<UserService.RegisterRes>('/api/v1/auth/register', data);
    },
  },
};

// frontend/src/lib/api/generated/task-service/client.ts (自動生成)
import { TaskService } from '@/types/generated/task-service';

export const taskServiceApi = {
  task: {
    /**
     * Create new task
     * @requires Authentication
     * @path POST /api/v1/tasks
     */
    createTask: (data: TaskService.TaskReq): Promise<TaskService.TaskRes> => {
      return apiRequest.post<TaskService.TaskRes>('/api/v1/tasks', data);
    },

    /**
     * Get task by ID
     * @requires Authentication
     * @path GET /api/v1/tasks/:id
     */
    getTask: (id: number): Promise<TaskService.TaskRes> => {
      return apiRequest.get<TaskService.TaskRes>(`/api/v1/tasks/${id}`);
    },

    /**
     * Update task
     * @requires Authentication
     * @path PUT /api/v1/tasks/:id
     */
    updateTask: (id: number, data: TaskService.TaskReq): Promise<TaskService.TaskRes> => {
      return apiRequest.put<TaskService.TaskRes>(`/api/v1/tasks/${id}`, data);
    },

    /**
     * Delete task
     * @requires Authentication
     * @path DELETE /api/v1/tasks/:id
     */
    deleteTask: (id: number): Promise<void> => {
      return apiRequest.delete<void>(`/api/v1/tasks/${id}`);
    },
  },
};

// frontend/src/lib/api/generated/index.ts (統合エクスポート)
export { userServiceApi } from './user-service/client';
export { taskServiceApi } from './task-service/client';
export { messageServiceApi } from './message-service/client';

// 統合APIクライアント
export const api = {
  user: userServiceApi,
  task: taskServiceApi,
  message: messageServiceApi,
};
```

### 7.4.4 自動生成されるサービス別React Queryフック

```typescript
// frontend/src/lib/api/generated/user-service/hooks.ts (自動生成)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userServiceApi } from './client';
import { UserService } from '@/types/generated/user-service';

// Query Keys
export const userServiceKeys = {
  all: ['userService'] as const,
  users: () => [...userServiceKeys.all, 'users'] as const,
  user: (id: number) => [...userServiceKeys.users(), id] as const,
  profile: () => [...userServiceKeys.all, 'profile'] as const,
  userList: (params: UserService.UserListReq) => [...userServiceKeys.users(), 'list', params] as const,
};

// User Profile Hooks
export function useGetProfile() {
  return useQuery({
    queryKey: userServiceKeys.profile(),
    queryFn: () => userServiceApi.user.getProfile(),
    staleTime: 1000 * 60 * 5, // 5分
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserService.UserProfileReq }) => 
      userServiceApi.user.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userServiceKeys.profile() });
      queryClient.invalidateQueries({ queryKey: userServiceKeys.users() });
    },
  });
}

// User List Hooks
export function useUserList(params: UserService.UserListReq = {}) {
  return useQuery({
    queryKey: userServiceKeys.userList(params),
    queryFn: () => userServiceApi.user.listUsers(params),
    staleTime: 1000 * 60 * 2, // 2分
  });
}

// Authentication Hooks
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserService.LoginReq) => userServiceApi.auth.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userServiceKeys.profile() });
    },
  });
}

// frontend/src/lib/api/generated/task-service/hooks.ts (自動生成)
import { TaskService } from '@/types/generated/task-service';

export const taskServiceKeys = {
  all: ['taskService'] as const,
  tasks: () => [...taskServiceKeys.all, 'tasks'] as const,
  task: (id: number) => [...taskServiceKeys.tasks(), id] as const,
  taskList: (params: any) => [...taskServiceKeys.tasks(), 'list', params] as const,
};

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TaskService.TaskReq) => taskServiceApi.task.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskServiceKeys.tasks() });
    },
  });
}

export function useGetTask(id: number) {
  return useQuery({
    queryKey: taskServiceKeys.task(id),
    queryFn: () => taskServiceApi.task.getTask(id),
    enabled: !!id,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskService.TaskReq }) => 
      taskServiceApi.task.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskServiceKeys.task(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskServiceKeys.tasks() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => taskServiceApi.task.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskServiceKeys.tasks() });
    },
  });
}

// frontend/src/lib/api/generated/index.ts (統合フックエクスポート)
export * from './user-service/hooks';
export * from './task-service/hooks';
export * from './message-service/hooks';
```

### 7.4.5 マイクロサービス対応コンポーネントでの使用

```typescript
// src/components/features/profile/profile-form.tsx
import { useGetProfile, useUpdateProfile } from '@/lib/api/generated/user-service/hooks';
import { UserService } from '@/types/generated/user-service';

export function ProfileForm() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfileMutation = useUpdateProfile();

  const handleSubmit = async (data: UserService.UserProfileReq) => {
    if (profile?.id) {
      await updateProfileMutation.mutateAsync({ 
        id: profile.id, 
        data 
      });
    }
  };

  // 型安全なAPIクライアント使用
  // profileの型は UserService.UserProfileRes として自動推論される
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        defaultValue={profile?.name} 
        placeholder="Name" 
      />
      <input 
        defaultValue={profile?.email} 
        placeholder="Email" 
        type="email" 
      />
      <textarea 
        defaultValue={profile?.bio} 
        placeholder="Bio" 
      />
      <button type="submit">
        {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
}

// src/components/features/tasks/task-list.tsx
import { useTaskList, useDeleteTask } from '@/lib/api/generated/task-service/hooks';
import { TaskService } from '@/types/generated/task-service';

export function TaskList() {
  const { data: tasks, isLoading } = useTaskList({ page: 1, page_size: 10 });
  const deleteTaskMutation = useDeleteTask();

  const handleDelete = async (taskId: number) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  if (isLoading) return <div>Loading tasks...</div>;

  return (
    <div>
      {tasks?.tasks.map((task: TaskService.TaskRes) => (
        <div key={task.id} className="task-item">
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <span>Priority: {task.priority}</span>
          <span>Status: {task.status}</span>
          <button 
            onClick={() => handleDelete(task.id)}
            disabled={deleteTaskMutation.isPending}
          >
            {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}

// src/components/features/common/service-health.tsx (マイクロサービス状態監視)
import { api } from '@/lib/api/generated';

export function ServiceHealth() {
  const checkServiceHealth = async () => {
    try {
      // 各サービスのヘルスチェック
      const [userHealth, taskHealth, messageHealth] = await Promise.allSettled([
        api.user.health.check(),
        api.task.health.check(),
        api.message.health.check(),
      ]);
      
      return {
        user: userHealth.status === 'fulfilled',
        task: taskHealth.status === 'fulfilled',
        message: messageHealth.status === 'fulfilled',
      };
    } catch (error) {
      console.error('Service health check failed:', error);
      return { user: false, task: false, message: false };
    }
  };
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

### 7.6.1 マイクロサービス対応 OpenAPI生成（goctl最新対応）

- [ ] goctl swagger pluginでOpenAPI仕様書生成
```bash
# 最新goctl swagger pluginのインストール
go install github.com/zeromicro/goctl-swagger@latest

# UserService OpenAPI生成
cd /var/www/winyx/backend/user_service
goctl api plugin \
  -plugin goctl-swagger="swagger -filename user-service.json -host winyx.jp -basepath /api/v1" \
  -api ../../contracts/user_service/user.api \
  -dir .

# TaskService OpenAPI生成
cd /var/www/winyx/backend/task_service
goctl api plugin \
  -plugin goctl-swagger="swagger -filename task-service.json -host winyx.jp -basepath /api/v1" \
  -api ../../contracts/task_service/task.api \
  -dir .

# 生成されたOpenAPI仕様書を統合
node /var/www/winyx/scripts/merge_openapi_specs.js
```

この最新アプローチは以下の機能を提供：
- 最新goctl swagger plugin使用での正確なOpenAPI 3.0仕様書生成
- サービス別OpenAPI仕様書の自動生成
- JWT認証スキームの自動設定
- Go-Zeroエラーレスポンス定義の自動生成
- マイクロサービス統合Swagger UI連携
- APIバージョニング対応

### 7.6.2 マイクロサービス統合仕様書の確認

- [ ] サービス別Swagger UIでの確認
```bash
# 全サービスのOpenAPI仕様書を生成
./scripts/generate_openapi_multi.sh --all

# サービス別Swagger UIでアクセス
# UserService
open http://localhost:8888/docs/user-service/swagger-ui/

# TaskService  
open http://localhost:8889/docs/task-service/swagger-ui/

# MessageService
open http://localhost:8890/docs/message-service/swagger-ui/

# 統合APIドキュメント
open http://localhost:8888/docs/unified/
```

- [ ] Redocでの高品質ドキュメント確認
```bash
# Redocでの美しいAPIドキュメント
open http://localhost:8888/docs/redoc/

# APIチェンジログの自動生成
./scripts/generate_api_changelog.sh
open http://localhost:8888/docs/changelog/
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

### 7.8.1 マイクロサービス対応GitHub Actions

- [ ] マイクロサービス契約同期チェックワークフロー
```yaml
# .github/workflows/microservice-contract-sync.yml
name: Microservice Contract Sync Check

on: 
  push:
  pull_request:
    paths:
      - 'contracts/**/*.api'
      - 'contracts/**/*.proto'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed-services: ${{ steps.changes.outputs.services }}
      has-changes: ${{ steps.changes.outputs.has-changes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Detect changed services
        id: changes
        run: |
          # 変更された契約ファイルから影響サービスを特定
          changed_files=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E '\.(api|proto)$' || true)
          
          if [ -z "$changed_files" ]; then
            echo "has-changes=false" >> $GITHUB_OUTPUT
            echo "services=[]" >> $GITHUB_OUTPUT
          else
            echo "has-changes=true" >> $GITHUB_OUTPUT
            
            services=$(echo "$changed_files" | sed -n 's|contracts/\([^/]*\)/.*|\1|p' | sort -u | jq -R -s -c 'split("\n")[:-1]')
            echo "services=$services" >> $GITHUB_OUTPUT
            
            echo "Changed services: $services"
            echo "Changed files: $changed_files"
          fi

  contract-sync:
    needs: detect-changes
    if: needs.detect-changes.outputs.has-changes == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.changed-services) }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.22'
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install goctl and plugins
        run: |
          go install github.com/zeromicro/go-zero/tools/goctl@latest
          go install github.com/zeromicro/goctl-swagger@latest
          
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Check breaking changes for ${{ matrix.service }}
        run: |
          ./scripts/check_breaking_changes.sh --service ${{ matrix.service }}
          
      - name: Run contract sync for ${{ matrix.service }}
        run: |
          ./scripts/sync_contracts_multi.sh --service ${{ matrix.service }} --test
          
      - name: Verify TypeScript compilation
        run: |
          cd frontend
          npm run type-check
          
      - name: Check for uncommitted changes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            echo "⚠️ ${{ matrix.service }} の契約変更が自動生成ファイルに反映されていません"
            echo "📝 以下のファイルをコミットしてください:"
            git status --porcelain
            echo "🔄 再生成コマンド: ./scripts/sync_contracts_multi.sh --service ${{ matrix.service }}"
            exit 1
          fi
          
  build-test:
    needs: [detect-changes, contract-sync]
    if: needs.detect-changes.outputs.has-changes == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.changed-services) }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.22'
          
      - name: Build ${{ matrix.service }}
        run: |
          if [ -d "backend/${{ matrix.service }}" ]; then
            cd backend/${{ matrix.service }}
            go mod tidy
            go build -v ./...
            go test -v ./...
          fi
          
      - name: Test RPC service (if proto changed)
        run: |
          if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -q "contracts/${{ matrix.service }}/.*\.proto"; then
            ./scripts/test_rpc_service.sh ${{ matrix.service }}
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

### 7.9.1 マイクロサービス日常開発フロー

```bash
# 1. サービス別Go-Zero契約ファイルを編集
# UserServiceの新しいAPIエンドポイントを追加
vim /var/www/winyx/contracts/user_service/user.api

# 2. 破壊的変更チェックと自動同期（Git pre-commitフック）
git add contracts/user_service/user.api
git commit -m "feat(user_service): ユーザーリストAPIエンドポイントを追加"
# → pre-commitフックが以下を自動実行:
#   - 破壊的変更のチェック
#   - UserServiceの型定義を生成
#   - 依存サービスの確認と更新
#   - OpenAPI仕様書の生成

# 3. フロントエンド開発（サービス別型安全性）
cd frontend
npm run dev
# → サービス別に自動生成された型安全なAPIクライアントを使用

# 4. サービス別テストの実行
npm run test:user-service
npm run test:integration
# → UserServiceの型安全性とサービス間連携をテスト

# 5. サービス別ビルドテスト
cd ../backend/user_service
go test ./...
go build .

# 6. RPCサービスのテスト（必要に応じて）
if grep -q "proto" /var/www/winyx/contracts/user_service/*; then
    /var/www/winyx/scripts/test_rpc_service.sh user_service
fi

# 7. サービスディスカバリテスト（Etcd連携）
/var/www/winyx/scripts/test_service_discovery.sh user_service
```

### 7.9.2 マイクロサービスチーム開発での活用

- **UserService開発者**: 
  - ユーザー関連契約ファイルの更新のみで、フロントエンドと他サービス連携が完了
  - 破壊的変更の自動検出で安全なリファクタリング
  - 独立したデプロイとスケーリング

- **TaskService開発者**:
  - UserServiceの型定義を自動インポートして連携機能開発
  - サービス間通信のgRPCクライアント自動生成
  - 依存サービスのバージョン管理

- **フロントエンド開発者**: 
  - サービス別自動生成APIクライアントで型安全開発
  - マイクロサービス障害時のフォールバック処理
  - サービス別モックでの独立開発

- **QAエンジニア**: 
  - サービス別OpenAPI仕様書でのシステマチックAPIテスト
  - サービス間連携テストの自動化
  - 契約ベースのテストケース自動生成

- **DevOpsエンジニア**:
  - サービス別CI/CDパイプライン管理
  - 契約バージョンに基づいたカナリアデプロイ
  - サービスメッシュ監視とアラート

### 7.9.3 マイクロサービス品質保証

- **サービス別型安全性**: 
  - コンパイル時にサービス間型の不整合を検出
  - マイクロサービスインターフェースの安全性保証

- **破壊的変更の早期検出**:
  - APIバージョン管理と後方互換性チェック
  - サービスデプロイ前の互換性検証

- **自動統合テスト**: 
  - 契約変更時のサービス間結合テスト自動実行
  - エンドツーエンドシナリオテストの自動実行

- **リアルタイムドキュメント同期**: 
  - サービス別API仕様書が常に最新状態で維持
  - サービス間連携図の自動更新

- **サービスメッシュ監視**:
  - Etcdサービスディスカバリ連携監視
  - gRPCヘルスチェックとメトリクス収集
  - 契約バージョン不整合のリアルタイムアラート

---

## まとめ

本章で構築したマイクロサービス契約駆動開発システムにより：

1. **CLAUDE.md規約準拠の統一管理** - サービス別契約ファイルの体系的管理
2. **マイクロサービス型安全性** - サービス間およびフロントエンド間での型の一致
3. **破壊的変更の自動検出** - APIバージョン管理と後方互換性保証
4. **最新Go-Zero機能連携** - goctl最新コマンドとProtocol Buffers統合
5. **自動化されたマルチサービスワークフロー** - サービス別契約変更の自動検出と同期
6. **サービス独立性の実現** - サービス別独立開発・デプロイ・スケーリング
7. **企業レベルCI/CD** - GitHub Actionsでのサービス別ビルド・テスト・デプロイ
8. **統合ドキュメント管理** - サービス別および統合OpenAPI仕様書の自動生成
9. **サービスメッシュ監視** - EtcdサービスディスカバリとgRPCメトリクス連携
10. **チーム間コラボレーション強化** - サービスオーナー制と統一契約管理

**Microservice Contract-First Development**のアプローチにより、スケーラブルで保守性の高いマイクロサービスアーキテクチャが実現できます。次章では、この契約システムを活用したモバイルアプリケーション開発について詳しく解説します。