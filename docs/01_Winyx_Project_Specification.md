# 第1章 Winyxプロジェクト仕様書

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
└── contracts/（契約ファイルの管理リポジトリ）
```

### 1.1.3 ディレクトリ構成

```
/var/www/winyx/
  contracts/
    api/    # .api（REST契約定義）
    rpc/    # .proto（gRPC契約定義）
  backend/  # Go-Zeroによるサービス実装
  frontend/ # ビルド済み静的ファイル（Next.js出力）
```

---

## 第2節 バックエンド契約配布仕様

### 1.2.1 契約管理方針

* 契約は `/contracts` ディレクトリに集約し、バージョン管理。
* RESTは `.api` → `goctl api plugin` でOpenAPIに変換。
* RPCは `.proto` → `buf`でlintおよび後方互換性チェック。
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

---

## 第3節 まとめ

* 契約駆動開発（Contract-First）により、フロントとバックエンドの同期を保証。
* VPS上では `/var/www/winyx` に contracts/backend/frontend を配置し、役割を明確化。
* RESTとRPCの両対応を可能にし、外部公開APIはREST、内部高速通信はRPCを推奨。
