# 第1章 Winyxプロジェクト仕様書 v1.1

## 第1節 プロジェクト概要

### 1.1.1 プロジェクト目的

Winyxプロジェクトは、バックエンドをVPS上で稼働させ、フロントエンドはローカルPCで開発・ビルド後にVPSへデプロイする構成を採用します。契約ファイル（.api/.proto）を単一ソースとして集中管理し、CI/CDパイプラインで型定義、SDK、ドキュメント、モックを自動生成して配布します。この構成により、バックエンドとフロントエンド間の仕様齟齬を防ぎ、開発効率と品質を最大化します。

### 1.1.2 開発・デプロイフロー

```
[ローカル開発環境]
├── フロントエンド（Next.js）: コーディング → ビルド → 静的ファイル生成
├── 契約ファイル編集（.api/.proto）: コミット → CIで自動生成
└── 生成物（型/SDK/ドキュメント/モック）をnpmや静的配信でフロントへ配布

[VPS本番環境（/var/www/winyx）]
├── frontend/（ビルド済み静的ファイルをNginxで配信）
├── backend/（Go-Zeroサービス群: REST APIやRPCサービスをsystemdで常駐）
├── contracts/（契約ファイルの管理リポジトリ）
└── docs/（プロジェクトドキュメント）
```

### 1.1.3 ディレクトリ構成（実際の構造に基づく）

```
/var/www/winyx/
  contracts/
    api/              # DDLスキーマファイル
    rpc/              # .proto（gRPC契約定義）
    user_service/     # ユーザーサービス契約
    service_communication/  # 内部通信契約
  backend/            # Go-Zeroによるサービス実装
    user_service/     # UserService実装
    dashboard_gateway/ # 監視ダッシュボード
    common/           # 共通ライブラリ
  frontend/           # ビルド済み静的ファイル（Next.js出力）
    out/              # Next.js静的エクスポート
  scripts/            # セットアップスクリプトや管理用ツール
  docs/               # プロジェクトドキュメント
  .env                # 環境変数設定ファイル（Git管理外）
  .env.example        # 環境変数テンプレート
```

---

## 第2節 バックエンド契約配布仕様

### 1.2.1 契約管理方針（実装状況反映）

* 契約は `/contracts` ディレクトリに集約し、バージョン管理。
* サービス別契約は `/contracts/{service_name}/` で管理（例：`user_service/`）。
* RESTは `.api` → `goctl api plugin` でOpenAPIに変換。
* RPCは `.proto` → `buf`でlintおよび後方互換性チェック。
* DDLスキーマは `/contracts/api/` で管理し、モデル生成の基盤とする。
* **設定管理**: 各サービスのYAMLファイルで個別管理（統一された環境変数活用も併用）。
* CIで以下を生成し配布：

  * TypeScript型定義ファイル
  * 型付きSDK（fetch/axios または gRPCクライアント）
  * APIドキュメント（Redoc/Swagger UI）
  * モックサーバ定義（Prism / connect dev server）

### 1.2.2 REST契約例

```api
syntax = "v1";
info(
  title: "User Service API"
  desc:  "User CRUD endpoints"
)

type (
  UserResp {
    id    int64  `json:"id"`
    name  string `json:"name"`
    email string `json:"email"`
  }
)

@server(group: user)
service user-api {
  @doc "Get user by ID"
  get /api/v1/users/:id returns(UserResp)
}
```

### 1.2.3 RPC契約例

```proto
syntax = "proto3";
package user.v1;
option go_package = "./pb;pb";

message GetUserReq { int64 id = 1; }
message User { int64 id = 1; string name = 2; string email = 3; }
service UserService {
  rpc GetUser(GetUserReq) returns (User);
}
```

### 1.2.4 ドキュメント配布

* `openapi.json` を Redocでビルドし、`/docs` に静的配置。
* `.proto` からHTMLドキュメントを生成（`protoc-gen-doc`）し、同様に配布。
* Nginxで`/docs`エンドポイントとして公開。

### 1.2.5 モック配布

* REST: OpenAPI → Prism CLIでモックAPI起動。
* gRPC: `.proto` → connect dev server または grpc-tools でモックサーバ起動。
* MSW（Mock Service Worker）を利用してフロント単体でのUI開発を可能に。

### 1.2.6 エラーモデル統一

```json
{
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "details": { "id": 123 }
}
```

* 全APIで同一フォーマットを返却。
* SDKにもこのエラー構造を型として反映。

### 1.2.7 変更検知と安全装置

* REST: `oasdiff --fail-on-breaking`で破壊的変更検知。
* RPC: `buf breaking`で後方互換性チェック。
* CIで違反が検出された場合はマージ不可に設定。

### 1.2.8 フロント利用手順

1. npm経由でSDKインストール：`npm install @winyx/api-client` または `@winyx/rpc-client`
2. 型安全な呼び出しでバックエンドAPIやRPCサービスを利用。
3. モックサーバを起動してバックエンド依存なしでUI開発可能。

### 1.2.9 goctl自動生成ワークフロー【必須手順】

#### ステップ1: 契約ファイル作成
```bash
# 契約ファイルを先に作成（絶対原則）
vim /var/www/winyx/contracts/{service_name}/{service}.api
```

#### ステップ2: Go-Zero自動生成
```bash
cd /var/www/winyx/backend/{service_name}
goctl api go -api ../../contracts/{service_name}/{service}.api -dir . -style go_zero
```

#### ステップ3: 編集可能ファイル
- ✅ **編集可能**: `internal/logic/` - ビジネスロジックのみ
- ✅ **編集可能**: `etc/{service}-api.yaml` - 設定ファイル
- ❌ **編集禁止**: `internal/handler/` - 自動生成で上書きされる
- ❌ **編集禁止**: `internal/types/` - 自動生成で上書きされる
- ❌ **編集禁止**: `internal/svc/` - サービスコンテキスト（最小限の編集のみ）

#### ステップ4: モデル生成（DB使用時）
```bash
goctl model mysql ddl -src ../../contracts/api/schema.sql -dir ./internal/model -c
```

---

## 第3節　ポートマップ（現状反映版）

### 🎯 アプリケーションサービス

| ポート  | サービス                 | 公開範囲      | 説明               |
  |------|----------------------|-----------|------------------|
  | 8888 | UserService REST API | Nginx経由のみ | 認証・ユーザー管理・組織管理   |
  | 8889 | Dashboard Gateway    | 管理者のみ     | システム監視ダッシュボード    |
  | 9090 | UserService RPC      | 内部通信のみ    | 高速内部通信（外部公開禁止）   |

### 🌐 Webサーバー・フロントエンド

| ポート  | サービス               | 公開範囲   | 説明                |
  |------|--------------------|--------|-------------------|
  | 80   | Nginx HTTP         | 外部公開   | HTTPSリダイレクト       |
  | 443  | Nginx HTTPS        | 外部公開   | メイン公開ポート（SSL/TLS） |
  | 3000 | Next.js Dev Server | 開発環境のみ | 開発時のホットリロード       |

### 📊 監視・メトリクス

| ポート  | サービス       | 公開範囲  | 説明        |
  |------|------------|-------|-----------|
  | 9091 | Prometheus | 管理者のみ | メトリクス収集   |
  | 3001 | Grafana    | 管理者のみ | 監視ダッシュボード |

### 🗄️ データベース・キャッシュ（マイクロサービス対応）

| ポート  | サービス    | 公開範囲   | 説明                                |
  |------|---------|--------|-----------------------------------|
  | 3306 | MariaDB | ローカルのみ | winyx_core, winyx_task, winyx_mem |
  | 6379 | Redis   | ローカルのみ | セッション・キャッシュ・メトリクス                 |
  | 2379 | etcd    | ローカルのみ | サービスディスカバリ                        |

### 🔗 Nginx構成（実装済み）

| サブドメイン     | 用途                 | 説明                    |
  |------------|--------------------|-----------------------|
  | winyx.jp   | メインWebサイト         | フロントエンド + API プロキシ    |
  | api.winyx.jp | API専用アクセス         | より厳格なIP制限でAPI直接アクセス |

---

## 第4節 データベース設計戦略

### 1.4.1 ハイブリッド型Database per Service

Winyxプロジェクトでは**ハイブリッド型Database per Service**パターンを採用：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   winyx_core    │    │   winyx_task    │    │   winyx_mem     │
│   (共通・認証)   │    │  (タスク管理)    │    │ (メッセージ)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ ✓ users         │    │ • tasks         │    │ • messages      │
│ ✓ sessions      │    │ • task_assign   │    │ • channels      │
│ ✓ user_profiles │    │ • categories    │    │ • participants  │
│ ✓ roles         │    │ • task_history  │    │ • attachments   │
│ ✓ permissions   │    │ • comments      │    │ • message_read  │
│ ✓ orgs          │    │ • task_deps     │    │ • notifications │
│ ✓ org_members   │    └─────────────────┘    └─────────────────┘
└─────────────────┘
```

### 1.4.2 データベース分散ルール

#### 📊 winyx_core（認証基盤・組織管理）
- **責任範囲**: ユーザー認証・認可、セッション管理、プロフィール管理、組織管理
- **対象サービス**: UserService、AuthService、GatewayService
- **接続設定**: `DataSource: "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true"`

#### 📋 winyx_task（タスク管理）
- **責任範囲**: タスク作成・管理、アサイン・スケジューリング、コメント・添付ファイル
- **対象サービス**: TaskService、ProjectService（将来実装）
- **接続設定**: `DataSource: "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_task?charset=utf8mb4&parseTime=true"`

#### 💬 winyx_mem（メッセージ管理）
- **責任範囲**: チャンネル管理、リアルタイムメッセージング、ファイル共有
- **対象サービス**: MessageService、NotificationService（将来実装）
- **接続設定**: `DataSource: "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_mem?charset=utf8mb4&parseTime=true"`

### 1.4.3 サービス間データアクセス方針

**基本原則**: 
- **サービス内**: 直接データベースアクセス可能
- **サービス間**: API呼び出しによるデータ取得（循環参照回避）
- **データ整合性**: 各サービス内でのACID特性を保証

### 1.4.4 goctl modelとの連携

各サービスは自データベースのみアクセス：

#### UserService（winyx_coreのみ）
```bash
cd /var/www/winyx/backend/user_service
goctl model mysql datasource \
  -url "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_core" \
  -table "users,sessions,user_profiles,roles,permissions,orgs,org_members" \
  -dir ./internal/model -c
```

#### TaskService（winyx_taskのみ）
```bash
cd /var/www/winyx/backend/task_service
goctl model mysql datasource \
  -url "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_task" \
  -table "tasks,task_assign,categories,task_history,comments" \
  -dir ./internal/model -c
```

#### MessageService（winyx_memのみ）
```bash
cd /var/www/winyx/backend/message_service
goctl model mysql datasource \
  -url "winyx_app:PASSWORD@tcp(127.0.0.1:3306)/winyx_mem" \
  -table "messages,channels,participants,attachments,notifications" \
  -dir ./internal/model -c
```

**注意事項**:
- `-c` オプションでRedisキャッシュ付きモデルを生成
- 各サービスは自身のDBテーブルのみモデル生成
- Cross-DBアクセスはAPI経由で実装

---

## 第5節 環境・設定管理戦略

### 1.5.1 設定管理の実装状況

**現在の方式**:
- **各サービス**: YAML設定ファイル（`etc/{service}-api.yaml`）
- **共通設定**: 環境変数ファイル（`.env`）での一元管理（Optional）
- **機密情報**: systemd `EnvironmentFile=` または専用設定ファイル

**例**: UserService設定
```yaml
Name: user_service
Host: 0.0.0.0
Port: 8888

Mysql:
  DataSource: "winyx_app:${DB_PASSWORD}@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true"

Cache:
  - Host: 127.0.0.1:6379
    Pass: "${REDIS_PASSWORD}"
```

### 1.5.2 契約駆動開発の実装パス

**実装済み**:
- ✅ UserService: `/contracts/user_service/user.api`
- ✅ DDLスキーマ: `/contracts/api/schema.sql`
- ✅ 自動生成: `goctl api go` による型・ハンドラー生成

**計画中**:
- 🔄 自動CI/CD: GitHub Actions による型定義自動生成
- 🔄 Frontend SDK: TypeScript型定義の自動配布
- 🔄 モックサーバ: 開発環境での自動起動

### 1.5.3 破壊的変更の防止策

#### 契約変更前チェック（必須）

**1. 変更前の差分確認**
```bash
# 既存APIとの差分確認
diff /var/www/winyx/contracts/{service_name}/{service}.api \
     /var/www/winyx/contracts/{service_name}/{service}.api.backup
```

**2. 自動生成前のバックアップ**
```bash
# 自動生成ファイルのバックアップ
cd /var/www/winyx/backend/{service_name}
cp -r internal/handler internal/handler.backup
cp -r internal/types internal/types.backup
```

**3. 再生成の実行**
```bash
# 契約ファイルから再生成
goctl api go -api ../../contracts/{service_name}/{service}.api -dir . -style go_zero
```

**4. ビジネスロジックの保持確認**
```bash
# logicディレクトリは変更されないことを確認
git diff internal/logic/

# 設定ファイルも保持されることを確認
git diff etc/
```

**5. 破壊的変更の検出**
```bash
# OpenAPI差分チェック（REST API）
goctl api plugin -plugin goctl-swagger="swagger -filename openapi.json" \
  -api ../../contracts/{service_name}/{service}.api -dir .
oasdiff breaking openapi.json.backup openapi.json

# Proto互換性チェック（RPC）
buf breaking --against '.git#branch=main'
```

**ロールバック手順**
```bash
# 問題があった場合のロールバック
mv internal/handler.backup internal/handler
mv internal/types.backup internal/types
```

---

## 第6節 まとめ

* **契約駆動開発（Contract-First）**: サービス別契約管理で、フロントとバックエンドの同期を保証。
* **VPS配置**: `/var/www/winyx` に contracts/backend/frontend/scripts/docs を配置し、役割を明確化。
* **マイクロサービス対応**: Database per Service パターンで将来のスケール拡張に対応。
* **RESTとRPCの両対応**: 外部公開APIはREST、内部高速通信はRPCを推奨。
* **実装重視**: 理想論ではなく、実際に動作する構成を重視した設計。
* **段階的実装**: 現在は UserService 中心、将来的にタスク管理・メッセージングサービスを分離。

### 主要変更点（v1.0 → v1.1）

| 項目 | v1.0 | v1.1 |
|------|------|------|
| **契約配置** | `contracts/api/`, `contracts/rpc/` | `contracts/{service_name}/` |
| **データベース** | 単一DB前提 | マイクロサービス向け複数DB |
| **設定管理** | `.env`一元管理 | YAML個別 + 環境変数併用 |
| **サブドメイン** | 理論設計 | 実装済み構成（winyx.jp, api.winyx.jp） |
| **実装状況** | 仕様書のみ | 実際の運用設定を反映 |

---

**ドキュメント更新日**: 2025年8月16日  
**バージョン**: 1.1  
**作成者**: Winyx Team  
**更新内容**: 実際のプロジェクト構造・実装状況に合わせて全面改訂