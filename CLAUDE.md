# CLAUDE.md - Winyx プロジェクト固有の指示書

## 重要な指示

### 言語設定
**必ず日本語で返答すること。** すべてのコミュニケーション、説明、エラーメッセージ、コメントは日本語で記述してください。

---

## 0. ゴール
- 初学者にも分かる説明を徹底し、**先走らず**に常に *複数の選択肢（A/B...）と採用理由* を示す。
- すべてのコード断片・コマンドの直前に、**チェックボックス付きの簡潔な説明**を置く（進捗が見えるように）。
- Winyxの**命名規約と配置規約**を守り、同じ表記を全ドキュメント・コードに反映する。
- 返答は日本語。端末操作の説明は **vim 前提**（nanoは不可）。

---

## 1. 返答のフォーマット規則（厳守）
- 各コードの**直前**に最小限のチェックリストを置く：

  ```md
  - [ ] 何をするか（1行説明）

  ```bash
  # 実行コマンド/コード
  ```
  > 目的や結果（1行メモ）
  ```

- セクション構成は以下を基本とする：
  1) 背景と選択肢（A/B/C）  
  2) 推奨の根拠（3点以内）  
  3) 手順（チェックボックス + コード）  
  4) 検証/ロールバック手順  
  5) 注意点（落とし穴）

- **vim操作**の例示を優先（`:wq`, 検索置換 `:%s/old/new/g` 等）。

---

## 2. プロジェクト情報

### プロジェクト概要
Winyxは契約駆動開発（Contract-First）を採用し、バックエンドをVPS上で稼働させ、フロントエンドはローカルPCで開発・ビルド後にVPSへデプロイする構成ですが、VPS上で、開発してビルドすることも可能。契約ファイル（.api/.proto）を単一ソースとして集中管理し、CI/CDパイプラインで型定義、SDK、ドキュメント、モックを自動生成して配布します。

### リポジトリ構造
- `/var/www/winyx` - プロジェクトルートディレクトリ
- `backend/` - Go-Zeroによるサービス実装
  - `test_api/` - テストAPIサービス (Go-Zero)
- `frontend/` - ビルド済み静的ファイル（Next.js出力）
- `contracts/` - 契約ファイルの管理リポジトリ
  - `api/` - .api（REST契約定義）とDDLスキーマ
  - `rpc/` - .proto（gRPC契約定義）
- `scripts/` - セットアップスクリプトや管理用ツール
- `docs/` - プロジェクトドキュメント
- `.env` - 環境変数設定ファイル（Git管理外）
- `.env.example` - 環境変数テンプレート

### 命名とファイル配置（Winyx標準）
- **サービス名**：`snake_case` または `lowerCamel`。**ハイフン禁止**（例：`user_service` はOK、`user-service` はNG）。
- **YAMLの Name:** は **サービス名と同一**（例：`Name: user_service`）。
- **設定ファイル名**：`etc/<service>-api.yaml` を推奨（例：`etc/user_service-api.yaml`）。
- **サービスディレクトリ**：`/var/www/winyx/backend/` 配下に `<service_name>` で作成（例：`user_service`, `order_service`）。
- **systemdサービス名**：`winyx-<service>.service` 形式（例：`winyx-user.service`, `winyx-order.service`）。
- **VPS 配置**：`/var/www/winyx/` 配下（`backend/`, `frontend/`, `contracts/`）。

### 開発・デプロイフロー
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

---

## 3. 開発環境

### バージョンと環境前提
- OS: Ubuntu 24.04 LTS
- Timezone: Asia/Tokyo
- DB: MariaDB（`winyx_core`）、Redis（ローカル）
- Go version: 1.22+
- Framework: Go-Zero + goctl (最新)
- フロント：Next.js 15（VPSにはビルド結果のみ配置）
- Cache: Redis

### コーディング規約
- Goファイル名は小文字のみを使用（例: `loginhandler.go`、`servicecontext.go`）
- ケースセンシティブなファイルシステムでの動作を前提とする

---

## 4. 契約駆動開発（Contract-First Development）**【厳守】**

### 4.0 **絶対原則：Contract-First + Go-Zero自動生成**
- **絶対に守る**：すべてのAPIは**契約ファイル（.api）を先に作成**してから実装
- **手動実装禁止**：`goctl api generate`を使わない手動実装は**一切禁止**
- **単一情報源**：`/var/www/winyx/contracts/`を**唯一の契約管理場所**とする

### 4.1 **必須ワークフロー**
```bash
# 1. 契約ファイル作成・更新（必須）
vim /var/www/winyx/contracts/<service_name>/<service>.api

# 2. Go-Zero自動生成（必須）
cd /var/www/winyx/backend/<service_name>
goctl api go -api /var/www/winyx/contracts/<service_name>/<service>.api -dir . -style go_zero

# 3. 生成されたファイルにビジネスロジックを追加
# internal/logic/ 内のファイルのみ編集可能

# 4. 契約同期スクリプト実行（必須）
/var/www/winyx/scripts/sync_contracts.sh
```

### 4.2 **編集可能ファイル制限**
- ✅ **編集可能**：`internal/logic/` - ビジネスロジックのみ
- ✅ **編集可能**：`etc/` - 設定ファイル
- ❌ **編集禁止**：`internal/handler/` - 自動生成のため
- ❌ **編集禁止**：`internal/types/` - 自動生成のため
- ❌ **編集禁止**：`routes.go` - 自動生成のため

### 4.3 **契約ファイル命名規則**
- **場所**：`/var/www/winyx/contracts/<service_name>/<service>.api`
- **例**：`/var/www/winyx/contracts/user_service/user.api`
- **スタイル**：`go_zero`形式で統一

---

## 5. よくある判断（先に結論 → 根拠）

### 5.1 go-zero 導入コマンド
- **結論**：
  - プロジェクトの依存として go-zero を入れる → `go get github.com/zeromicro/go-zero@latest`
  - CLI（goctl）は**実行バイナリ**として入れる → `go install github.com/zeromicro/go-zero/tools/goctl@latest`
- **根拠**：`go get` はモジュール依存（`go.mod`）を更新、`go install` は `$GOBIN` にツール配置。役割が異なる。

### 5.2 サービス名と YAML Name の統一
- **結論**：`user_service`（ディレクトリ） ⇄ `Name: user_service`（YAML）で**完全一致**させる。
- **理由**：監視・systemd・ログ、OpenAPI名寄せの混乱を防ぐ／チーム内検索のヒット率を上げる。

### 5.3 設定ファイル名の統一
- **結論**：`etc/<service>-api.yaml`（例：`etc/user_service-api.yaml`）で統一。
- **理由**：goctl 生成物の慣習に沿いつつ、人間可読性（どのサービスの API 設定か即分かる）。

---

## 6. テストとビルド
- ビルドコマンド: `go build`
- テストコマンド: `go test ./...`
- 型チェック（フロントエンド）: `npm run type-check`
- リント: `npm run lint`

### サービス管理
- systemdサービス名: `winyx-test-api.service`
- 設定ファイル: `etc/test_api-api.yaml`

---

## 7. Claude Code 作業テンプレート

### 6.1 「選択肢 → 手順 → 検証」テンプレート（雛形）
**A/B/C の提示と採用理由を先に書く。**

- [ ] A案（推奨）：〜〜 / B案：〜〜 / C案：〜〜（採用理由を3点以内で）

```md
- [ ] 手順 1（何をするか）

```bash
# コマンド
```

- [ ] 手順 2（何をするか）

```bash
# コマンド
```
> 検証：curl / health など1行
```

### 6.2 Go-Zero：最小サービスの生成と起動
- [ ] サービス雛形を生成（ハイフン不可）

```bash
cd /var/www/winyx/backend
goctl api new test_api
cd test_api
```

- [ ] types/logic を JSON返却に修正（自動 or vim）

```bash
# types.go の最小例
cat > internal/types/types.go <<'EOF'
package types

type Request struct {
    Name string `path:"name"` // ※デフォルト値はロジック側で補う
}
type Response struct {
    Message string `json:"message"`
}
EOF
```

> 目的：文字列を JSON で返す基本挙動を固定

- [ ] 依存解決とビルド

```bash
go mod tidy
go build -o test_api
```

- [ ] 設定ファイルを作成（統一命名）

```bash
mkdir -p etc
cat > etc/test_api-api.yaml <<'YAML'
Name: test_api
Host: 0.0.0.0
Port: 8888

Mysql:
  DataSource: "winyx_app:YOUR_DB_PASSWORD@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

Cache:
  - Host: 127.0.0.1:6379
    Pass: "" # 付ける場合のみ値を設定
YAML
```

- [ ] 起動と疎通

```bash
./test_api -f etc/test_api-api.yaml &
PID=$!; echo $PID > /tmp/test_api.pid
curl -s http://127.0.0.1:8888/from/you | jq . || true
kill "$(cat /tmp/test_api.pid)"
```

> 期待：JSONで `{ "message": "Hello you!" }`

---

## 7. 設定・実装ガイド

### 7.1 DB/Redis
- [ ] MariaDB の疎通確認（最低限）

```bash
mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core -e "SELECT NOW() AS now, @@version AS version;"
```

- [ ] Redis の疎通確認

```bash
redis-cli -h 127.0.0.1 ping
# → PONG（パスワードありなら -a を付与）
```

### 7.2 goctl model（キャッシュ有効）
- [ ] DDL から model を生成（DDLスキーマは contracts/api で管理）

```bash
cd /var/www/winyx/backend/test_api
goctl model mysql ddl -src /var/www/winyx/contracts/api/schema.sql -dir ./internal/model -c
```

### 7.3 Handler / Logic の最小構成（CRUD例）
- [ ] ルーティング登録（5本：POST/GET/GET/LIST/DELETE）

```bash
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
# server.AddRoutes([...]) に Users の5本を追加
```

- [ ] Handler → Logic → Model の薄い三層を維持（複雑化を避ける）

---

## 8. ドキュメント作成の流儀
- 「第N章 第M節 ...」の**章番号を崩さない**。草案に異なる数字が混在している場合は**この規約に従って修正**。
- 設定ファイルの**表記ゆれを許容しない**：
  - **Name** は `test_api` 固定
  - **設定ファイル名**は `test_api-api.yaml` 固定
  - 本文内に `testapi_api.yaml` / `testapi-api.yaml` の両方が現れた場合は **前者に統一**ではなく、本規約（`test_api-api.yaml`）へ合わせる。

---

## 9. 安全策・落とし穴
- **サービス名ハイフン**は生成済みコードの import path に齟齬を生む。必ず snake_case。
- **path タグのデフォルト値**はパーサにより無視されることがあるため、**ロジック側で空文字を補完**する。
- **機微情報**は YAML に直書きせず、環境変数（`.env`ファイル）または `/etc/winyx.d/<service>.env` ＋ systemd `EnvironmentFile=` を推奨。
- **RESTとRPC使い分け**：外部公開APIはREST、内部高速通信はRPCを推奨。

---

## 10. 提案の出し方（Claude Code 内部ルール）
- 同じ結果に至る手段が複数ある場合、**3件以内の選択肢**と**採用基準**（安定性/運用容易性/学習コスト等）を短く提示。
- 初学者向けに、**落とし穴（3つ以内）**と**検証コマンド（1～2個）**を必ず添える。
- 返信の最後に「次の一歩」を1行示す（例：*「WorkDir を systemd 化しましょう」*）。

---

## 11. 契約駆動開発（Contract-Driven Development）

### 11.1 基本概念
- 契約ファイル（.api/.proto）を単一の信頼できる情報源として使用
- バックエンドとフロントエンドの仕様齟齬を防ぐ開発手法
- RESTは `.api` → `goctl api plugin` でOpenAPIに変換
- RPCは `.proto` → `buf`でlintおよび後方互換性チェック

### 11.2 自動生成システム
CIで以下を生成し配布：
- TypeScript型定義とAPIクライアント（fetch/axios または gRPCクライアント）
- Flutter/Dart用コード
- APIドキュメント（Redoc/Swagger UI）
- モックサーバ定義（Prism / connect dev server）
- 契約ファイル変更時の自動同期（Git hooks連携）

### 11.3 実行コマンド
```bash
# 手動実行
./scripts/sync_contracts.sh

# 監視モード
./scripts/sync_contracts.sh --watch

# Git hooks インストール
./scripts/sync_contracts.sh --install-hooks
```

### 11.4 契約例

#### REST契約例（.api）
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

#### RPC契約例（.proto）
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

### 11.5 エラーモデル統一
全APIで同一フォーマットを返却：
```json
{
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "details": { "id": 123 }
}
```

### 11.6 変更検知と安全装置
- REST: `oasdiff --fail-on-breaking`で破壊的変更検知
- RPC: `buf breaking`で後方互換性チェック
- CIで違反が検出された場合はマージ不可に設定

### 11.7 フロント利用手順
1. npm経由でSDKインストール：`npm install @winyx/api-client` または `@winyx/rpc-client`
2. 型安全な呼び出しでバックエンドAPIやRPCサービスを利用
3. モックサーバを起動してバックエンド依存なしでUI開発可能

---

## 付録A：vim 置換ショートカット

- [ ] ドキュメント一括置換（ファイル内）

```vim
:%s/testapi_api\.yaml/test_api-api.yaml/g
```

- [ ] 章番号の置換例

```vim
:%s/^1\.6 /2.1.6 /g
```

---

### 以上