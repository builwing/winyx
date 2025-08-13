# 第2章 環境構築・セットアップ編

## 第1節 VPS基盤環境整備

### 2.1.1 システム情報確認

まず、現在のVPS環境を確認しましょう。

- [x] Ubuntu バージョン確認

```bash
lsb_release -a
```
> Description:	Ubuntu 24.04.3 LTS

- [x] システムリソース確認

```bash
# CPU情報
cat /proc/cpuinfo | grep "model name" | head -1
```
> model name	: Intel Xeon Processor (Icelake)

```bash
# メモリ情報
free -h
```
>               total        used        free      shared  buff/cache   available
> Mem:           3.8Gi       941Mi       295Mi        15Mi       2.9Gi       2.9Gi
> Swap:          2.0Gi        40Mi       2.0Gi

```bash
# ディスク容量
df -h /var/www
```
> Filesystem      Size  Used Avail Use% Mounted on
/dev/vda2        99G   19G   76G  20% /

> Go-Zeroマイクロサービス群に最低2GB RAM、10GB以上のディスク領域を推奨

### 2.1.2 Go言語環境セットアップ

- [x] 既存Go環境の確認

```bash
which go
```
> /usr/local/go/bin/go

```bash
go version
```
> go version go1.24.4 linux/amd64

- [x] Go環境変数の設定

```bash
# bashrcファイルを編集
vim ~/.bashrc
```
vimエディタで以下を追加：
```bash
# Go environment
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN
```
### 2.1.3 Go-Zeroツールチェーンセットアップ

- [x] Go-Zero CLI（goctl）のインストール

```bash
# バージョン確認
goctl --version
```
> goctl version 1.8.4 linux/amd64

- [x] Protoc（Protocol Buffers）のインストール

```bash
# protocバージョン確認
protoc --version
```
> libprotoc 24.4

```bash
# Go用protoc-gen-goプラグイン
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```
> Protocol Buffers 3.0以上が必要

- [x] その他必要ツールのインストール

```bash
# Git のバージョン確認
sudo apt install -y git
```
> git version 2.43.0

```bash
# curl, jq（API テスト用）
sudo apt install -y curl jq

# build-essential（Go のビルド用）
sudo apt install -y build-essential
```

### 2.1.4 プロジェクトディレクトリ構造作成

- [x] Winyxプロジェクトディレクトリの作成

```bash
# プロジェクトルートディレクトリ作成
sudo mkdir -p /var/www/winyx
cd /var/www/winyx

# サブディレクトリ作成
sudo mkdir -p contracts/{api,rpc}
sudo mkdir -p backend
sudo mkdir -p frontend

# ディレクトリ構造確認
tree /var/www/winyx
```
最終的なディレクトリ構造：
```
/var/www/winyx/
├── contracts/
│   ├── api/     # RESTful API定義（.apiファイル）
│   └── rpc/     # gRPC定義（.protoファイル）
├── backend/     # Go-Zeroマイクロサービス群
└── frontend/    # Next.js ビルド済み静的ファイル
```

### 2.1.5 権限・セキュリティ設定

- [x] ユーザー・グループ設定

```bash
# www-data グループに現在のユーザーを追加
sudo usermod -a -G www-data $USER

# ディレクトリ所有者設定
sudo chown -R $USER:www-data /var/www/winyx

# 権限設定
sudo chmod -R 755 /var/www/winyx
sudo chmod -R g+w /var/www/winyx
```
> セキュリティを保ちつつ、開発・デプロイ作業を効率化

- [x] systemd用ユーザー作成（Go-Zeroサービス実行用）

```bash
# go-zero専用ユーザー作成
sudo useradd -r -s /bin/false -d /var/www/winyx gozero

# ディレクトリアクセス権限付与
sudo usermod -a -G www-data gozero
```
> セキュリティのため、専用ユーザーでサービス実行

### 2.1.6 Go Modules初期化

- [x] backendディレクトリでGo Modulesを初期化

```bash
cd /var/www/winyx/backend

# Go Modules初期化
go mod init github.com/winyx/backend

# Go-Zero依存関係追加
go get github.com/zeromicro/go-zero@latest
go get github.com/zeromicro/go-zero/tools/goctl@latest
```

- [x] contractsディレクトリでGit初期化

```bash
cd /var/www/winyx/contracts

# Git初期化
git init

# .gitignore作成
vim .gitignore
```

.gitignoreの内容：
```gitignore
# Generated files
generated/
*.gen.go
openapi.json
*.pb.go

# Build artifacts
build/
dist/

# IDE
.vscode/
.idea/
```

了解。**A案（安全版）と `null`解消（logic/types 実装）を“ひとつの処理”に統合**しました。
これを**そのままコピペ実行**すれば、テンプレ生成→JSON返却へ修正→ポート自動検出＆競合回避→起動→疎通→安全停止→片付け、まで一気通貫で完了します。
（オプションでテスト用ディレクトリを残す/消す、開始ポートを変える、も可能）

---

### 2.1.7 環境確認テスト＋`null`解消（A案・統合ワンショット）

> 目的：goctlテンプレ生成 → JSON返却へ修正（logic/types） → ビルド → 起動（-f） → 疎通 → 安全停止 → 片付け
> 注意：サービス名は **ハイフン不可**（`test-api` NG、`test_api`/`testApi` OK）

#### 使い方（そのまま実行）

* [ ] 必要ならオプションを環境変数で指定してから実行

  * `KEEP_TEST_API=1` … テスト用 `test_api` ディレクトリを**残す**（デフォルトは削除）
  * `PORT_START=8888` … 開始ポート（競合時は自動で順次+1）

```bash
# 例）ディレクトリを残し、開始ポートを8899にしたい場合
# export KEEP_TEST_API=1
# export PORT_START=8899
```

* [ ] ワンショット実行

```bash
# ===== 統合ワンショット開始 =====
set -Eeuo pipefail

ROOT="/var/www/winyx/backend"
APP="test_api"
APPDIR="${ROOT}/${APP}"
KEEP="${KEEP_TEST_API:-0}"
PORT_START="${PORT_START:-8888}"

cd "$ROOT"

# 0) 既存があれば削除（残したい場合は KEEP=1 をセットして手動で片付け）
if [ -d "$APPDIR" ]; then
  if [ "$KEEP" = "1" ]; then
    echo "WARN: ${APPDIR} が既に存在します。KEEP=1 のため削除しません。手動で片付けてから再実行してください。"
    exit 1
  else
    rm -rf "$APPDIR"
  fi
fi

# 1) サービス生成（ハイフン不可）
goctl api new "$APP"
cd "$APP"

# 2) logic/types を “JSON返却” 用に自動修正（vim不要）
# 2-1) types を上書き
cat > internal/types/types.go <<'EOF'
// internal/types/types.go
package types

// /from/:name に対応（未指定なら "you"）
type Request struct {
    Name string `path:"name,options=you"`
}

type Response struct {
    Message string `json:"message"`
}
EOF

# 2-2) logic ファイルの特定（goctl標準: internal/logic/testapilogic.go）
LOGIC_FILE="$(grep -Rl 'type Test_apiLogic' internal/logic || true)"
if [ -z "$LOGIC_FILE" ]; then
  # フォールバック（標準名を想定）
  LOGIC_FILE="internal/logic/testapilogic.go"
fi

# 余計な重複（手作りの test_api_logic.go など）があれば削除
if [ -f "internal/logic/test_api_logic.go" ] && [ "$LOGIC_FILE" != "internal/logic/test_api_logic.go" ]; then
  rm -f internal/logic/test_api_logic.go
fi

# 2-3) logic を上書き（必ず JSON を返す）
cat > "$LOGIC_FILE" <<'EOF'
// internal/logic/testapilogic.go（goctl生成の命名に合わせる）
package logic

import (
    "context"
    "fmt"

    "github.com/winyx/backend/test_api/internal/svc"
    "github.com/winyx/backend/test_api/internal/types"
    "github.com/zeromicro/go-zero/core/logx"
)

type Test_apiLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewTest_apiLogic(ctx context.Context, svcCtx *svc.ServiceContext) *Test_apiLogic {
    return &Test_apiLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *Test_apiLogic) Test_api(req *types.Request) (*types.Response, error) {
    name := req.Name
    if name == "" {
        name = "go-zero"
    }
    return &types.Response{
        Message: fmt.Sprintf("Hello %s!", name),
    }, nil
}
EOF

# 3) 依存解決 & ビルド
go mod tidy
go build -o "$APP"

# 4) 設定ファイル（YAML）検出
if ls etc/*.yaml >/dev/null 2>&1; then
  CONF="$(ls etc/*.yaml | head -1)"
else
  CONF="$(find . -maxdepth 3 -type f \( -name '*.yaml' -o -name '*.yml' \) | head -1 || true)"
fi

if [ -z "${CONF:-}" ]; then
  echo "WARN: 設定ファイルが見つかりませんでした。etc/testapi-api.yaml を作成してください。"
fi

# 5) PORT を Port: または ListenOn: から抽出（無ければ PORT_START）
detect_port() {
  local conf="$1" ; local fallback="$2" ; local port=""
  if [ -n "$conf" ] && [ -f "$conf" ]; then
    port="$(grep -E '^[[:space:]]*(P|p)ort[[:space:]]*:[[:space:]]*[0-9]+' "$conf" \
      | sed -E 's/.*:[[:space:]]*([0-9]+).*/\1/' | head -1 || true)"
    if [ -z "$port" ]; then
      port="$(grep -E '^[[:space:]]*(L|l)isten(O|o)n[[:space:]]*:[[:space:]]*[^ ]+' "$conf" \
        | sed -E 's/.*:[[:space:]]*[^:]*:([0-9]+).*/\1/' | head -1 || true)"
    fi
  fi
  [ -z "$port" ] && port="$fallback"
  echo "$port"
}
PORT="$(detect_port "${CONF:-}" "$PORT_START")"

# 6) 競合チェック→必要なら自動で空きポートへ書換え
is_in_use(){ ss -ltnp 2>/dev/null | grep -q ":${1} "; }
pick_free_port(){ local p="$1"; for _ in $(seq 0 50); do is_in_use "$p" || { echo "$p"; return; }; p=$((p+1)); done; echo "$1"; }
if is_in_use "$PORT"; then
  NEW_PORT="$(pick_free_port "$PORT")"
  echo "INFO: :$PORT は使用中 → :$NEW_PORT に切替えます"
  if [ -n "${CONF:-}" ] && [ -f "$CONF" ]; then
    grep -Eq '^[[:space:]]*(P|p)ort[[:space:]]*:[[:space:]]*[0-9]+' "$CONF" \
      && sed -i -E "s@(^[[:space:]]*(P|p)ort[[:space:]]*:[[:space:]]*)[0-9]+@\1${NEW_PORT}@g" "$CONF"
    grep -Eq '^[[:space:]]*(L|l)isten(O|o)n[[:space:]]*:[[:space:]]*[^ ]+' "$CONF" \
      && sed -i -E "s@(^[[:space:]]*(L|l)isten(O|o)n[[:space:]]*:[[:space:]]*[^:]*:)[0-9]+@\1${NEW_PORT}@g" "$CONF"
  fi
  PORT="$NEW_PORT"
fi
echo "CONF=${CONF:-<none>} PORT=$PORT"

# 7) バックグラウンド起動（-f を明示。CONF 無ければ未指定で起動）
if [ -n "${CONF:-}" ] && [ -f "$CONF" ]; then
  "./$APP" -f "$CONF" > "./${APP}.log" 2>&1 &
else
  "./$APP" > "./${APP}.log" 2>&1 &
fi
PID=$!
echo "PID=$PID"

# 8) 起動待ち（最大10秒／0.5秒刻み）
for _ in $(seq 1 20); do
  if curl -s "http://127.0.0.1:${PORT}/from/you" --max-time 1 >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 9) 疎通（JSONで返る：{"message":"Hello you!"}）
echo "----- RESPONSE -----"
curl -sS "http://127.0.0.1:${PORT}/from/you" --max-time 3 | sed -e 's/^/  /'
echo
echo "--------------------"

# 10) 停止（PID指定で安全）
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true

# 11) 片付け（KEEP=1 のときは残す）
cd "$ROOT"
if [ "$KEEP" != "1" ]; then
  rm -rf "$APPDIR"
  echo "OK: テスト完了（ディレクトリを削除しました）"
else
  echo "OK: テスト完了（ディレクトリは残しました） → ${APPDIR}"
fi
# ===== 統合ワンショット終了 =====
```

---

#### 補足（vimで中身を確認したい場合）

* [ ] 設定の確認/変更

```bash
ls -l /var/www/winyx/backend/test_api/etc
vim /var/www/winyx/backend/test_api/etc/testapi-api.yaml
# 例: Port: 8888 → Port: 8899 に変更（保存 :wq）
```

* [ ] ルートとハンドラ紐付け

```bash
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
```

* [ ] ログ確認

```bash
sed -n '1,200p' /var/www/winyx/backend/test_api/test_api.log
```

---

#### 何かあったときのワンポイント

* **重複エラー**（`redeclared`）が出たら、`internal/logic/` に同名系ファイルが複数ないか確認。
  本スクリプトは自動で `test_api_logic.go` を除去し、`testapilogic.go` に一本化します。
* **PORTが空**になるのを防ぐため、**常に** `CONF/PORT` を検出してから起動します。
* **ハング防止**のため `curl --max-time` を使用しています。
* **安全停止**のため **PID指定の `kill`** を徹底しています。

---

## 第2節 データベース・Redis連携設定

### 2.2.0 まずは方針を選択（提案）

* **A案（推奨）**: *goctl model* を使って **MySQL(MariaDB)+Redisキャッシュ** 連携

  * 利点: go-zero標準。`-c` オプションでRedisキャッシュ付きModel自動生成、保守しやすい
  * 注意: まずDDL（テーブル定義）を用意する
* **B案**: `sqlx` を直接使い **リポジトリ層を手書き**

  * 利点: 自由度が高い、薄い依存
  * 注意: コード量・レビューコストが増える
* **C案**: DBエンジンの再検討（MariaDB→PostgreSQL）

  * 利点: 複雑なクエリや型が得意
  * 注意: 既にMariaDB運用前提なので今回は非推奨

> 以降は **A案（推奨）** を具体化します。必要ならB/Cもすぐ書けます。

---

### 2.2.1 MariaDB 初期準備（DB/ユーザー作成・疎通）

**goctl model** を使って **MySQL(MariaDB)+Redisキャッシュ** 連携

* [ ] **DB・ユーザー作成（utf8mb4）**

```bash
# MariaDBにrootで入る
sudo mariadb

-- ★プロジェクト共通DB（例：winyx_core）
CREATE DATABASE winyx_core
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- ★アプリ用ユーザー（ローカルホスト限定）
CREATE USER 'winyx_app'@'127.0.0.1' IDENTIFIED BY '強固なパスワード';
GRANT ALL PRIVILEGES ON winyx_core.* TO 'winyx_app'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

* [ ] **疎通確認**

```bash
mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core -e "SELECT NOW() AS now, @@version AS version;"
```

> ここでエラーなら`bind-address`や`skip-networking`の有無、FWを確認。

---

### 2.2.2 Redis 初期準備（ローカル・パスワード任意）

* [ ] **設定確認（必要に応じてパスワード付与）**

```bash
# 設定ファイルを開く（場所は環境により /etc/redis/redis.conf など）
sudo vim /etc/redis/redis.conf

# 推奨設定例（行を探して必要に応じて編集）
# bind 127.0.0.1
# protected-mode yes
# requirepass  強固なパスワード   ← 付ける場合
```

* [ ] **再起動と疎通**

```bash
sudo systemctl restart redis-server

# PING確認（パスワードを設定した場合は -a を付与）
redis-cli -h 127.0.0.1 ping
# → PONG
```

---

### 2.2.3 スキーマ定義（DDL）を作る

> 例として **users** テーブル。先にDDLファイルをGitで管理しましょう。

* [ ] **DDLファイル作成**

```bash
# 置き場所の例：契約/スキーマ資産として管理
vim /var/www/winyx/contracts/api/schema.sql
```

```sql
-- usersテーブル（サンプル）
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)     NOT NULL,
  email         VARCHAR(191)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

* [ ] **適用（手動）**

```bash
mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core < /var/www/winyx/contracts/api/schema.sql
```

> 本格運用では goose / golang-migrate 等のマイグレーション導入を推奨（後述）。

---

### 2.2.4 マイグレーション導入（任意・推奨）

**選択肢:**

* *goose*（簡潔・使いやすい）
* *golang-migrate*（CLI豊富・CI連携実績多数）

ここでは **goose** を例示。

* [ ] **goose インストール**

```bash
# Goのbinに入る（$GOBINにPATHを通しておく）
go install github.com/pressly/goose/v3/cmd/goose@latest
```

* [ ] **マイグレーション雛形作成**

```bash
mkdir -p /var/www/winyx/migrations
goose -dir /var/www/winyx/migrations create add_users_table sql
```

* [ ] **up/down SQLを記述して適用**

```bash
vim /var/www/winyx/migrations/XXXXXX_add_users_table.sql
```

```sql
-- +goose Up
-- (ここに前述のCREATE TABLEを貼る)

-- +goose Down
DROP TABLE IF EXISTS users;
```

```bash
# 実行（環境変数で接続指定）
export GOOSE_DRIVER=mysql
export GOOSE_DBSTRING="winyx_app:パスワード@tcp(127.0.0.1:3306)/winyx_core?parseTime=true&charset=utf8mb4"
goose -dir /var/www/winyx/migrations up
```

---

### 2.2.5 goctl model 生成（Redisキャッシュ付き）

> 以降は **test\_api** サービスにDB/Redis接続チェック用のAPIを追加して動作検証します（前節で作成）。

* [ ] **Modelを生成（キャッシュ有効化）**

```bash
cd /var/www/winyx/backend/test_api

# DDLからModel生成（-cでRedisキャッシュ対応コードを出力）
goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/schema.sql \
  -dir ./internal/model \
  -c
```

> `internal/model` に `usersmodel.go` などが生成されます（キャッシュミックスイン込み）。

---

### 2.2.6 設定ファイル（YAML）にDB/Redisを追加

* [ ] **YAML編集（DataSource / Cache）**

```bash
vim /var/www/winyx/backend/test_api/etc/testapi-api.yaml
```

```yaml
Name: test-api
Host: 0.0.0.0
Port: 8888

Mysql:
  # ※パスワードは実値に置き換え
  DataSource: "winyx_app:YOUR_DB_PASSWORD@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"

Cache:        # go-zeroの cache.CacheConf 配列（単ノード例）
  - Host: 127.0.0.1:6379
    Pass: ""                 # Redisにパスワードがある場合は設定
    Type: node               # 単ノード(node) / クラスタ(cluster)
```

> 機微情報は**環境変数**や**systemd EnvironmentFile**に退避し、CI/CDでは配置のみでGitに残さないのが安全。

---

### 2.2.7 Config/ServiceContext を拡張

* [ ] **`internal/config/config.go`** を編集

```bash
vim /var/www/winyx/backend/test_api/internal/config/config.go
```

```go
package config

import (
	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/rest"
)

type MysqlConf struct {
	DataSource string
}

type Config struct {
	rest.RestConf
	Mysql MysqlConf
	Cache cache.CacheConf
}
```

* [ ] **`internal/svc/servicecontext.go`** を編集

```bash
vim /var/www/winyx/backend/test_api/internal/svc/servicecontext.go
```

```go
package svc

import (
	"github.com/winyx/backend/test_api/internal/config"
	"github.com/winyx/backend/test_api/internal/model"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config    config.Config
	UserModel model.UserModel
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	return &ServiceContext{
		Config:    c,
		UserModel: model.NewUserModel(conn, c.Cache), // ★キャッシュ有効
	}
}
```

---

### 2.2.8 「接続チェック用」APIを2本だけ追加（DB/Redis）

* [ ] **ルーティング（`internal/handler/routes.go`）**

```bash
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
```

```go
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

func RegisterHandlers(server *rest.Server, serverCtx *svc.ServiceContext) {
	// 既存ルート ...

	server.AddRoutes([]rest.Route{
		{
			Method:  http.MethodGet,
			Path:    "/api/v1/db/now",
			Handler: DbNowHandler(serverCtx),
		},
		{
			Method:  http.MethodGet,
			Path:    "/api/v1/redis/ping",
			Handler: RedisPingHandler(serverCtx),
		},
	})
}
```

* [ ] **ハンドラ2本**

```bash
vim /var/www/winyx/backend/test_api/internal/handler/dbnowhandler.go
```

```go
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func DbNowHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logic.NewDbNowLogic(r.Context(), ctx)
		resp, err := l.DbNow()
		httpx.OkJson(w, map[string]any{"now": resp, "error": errString(err)})
	}
}
```

```bash
vim /var/www/winyx/backend/test_api/internal/handler/redispinghandler.go
```

```go
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func RedisPingHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logic.NewRedisPingLogic(r.Context(), ctx)
		resp, err := l.RedisPing()
		httpx.OkJson(w, map[string]any{"pong": resp, "error": errString(err)})
	}
}
```

```bash
vim /var/www/winyx/backend/test_api/internal/handler/common.go
```

```go
package handler

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
```

* [ ] **ロジック2本（SQLとRedis）**

```bash
vim /var/www/winyx/backend/test_api/internal/logic/dbnowlogic.go
```

```go
package logic

import (
	"context"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/core/logx"
)

type DbNowLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDbNowLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DbNowLogic {
	return &DbNowLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// DBの現在時刻を返す（読み取りのみ）
func (l *DbNowLogic) DbNow() (string, error) {
	var now string
	// go-zeroのsqlxはRawを直接使わないため、簡易にSELECT 1をModel経由で…もできるが
	// ここでは素直にconnを取る場合の例（UserModelからConnを取り出す手がない場合は別途sqlx.NewMysqlをsvcに持たせる）
	// ──簡易対応：SELECT NOW()をユーザモデルのConn経由で実行したい場合は
	// modelにヘルパーを追加する設計に変えてもOK。ここでは直接クエリで示すために一時Connを生成してもよい。
	// （実運用は専用QueryメソッドをUserModelに置くことを推奨）
	err := l.svcCtx.UserModel.TransactCtx(l.ctx, func(ctx context.Context, session interface{}) error {
		// sessionはsqlx.Session（*sql.Tx）だが直接クエリは難しいため、
		// 実際にはモデルに「SelectNow」等の関数を1つ追加するのが綺麗です。
		return nil
	})
	// 簡易版：別途Connを切る（推奨は専用Modelメソッドを用意）
	// ここでは説明簡略化のため、固定文字列を返却→接続自体は後段のRedisで検証
	now = "use SELECT NOW() via model method in real code"
	return now, err
}
```

> ※ 上は最小限の「配線サンプル」です。実運用では `UserModel` に `SelectNow(ctx)` のような**読み取り専用メソッド**を1つ追加し、`conn.QueryRowCtx` で `SELECT NOW()` を返す形が綺麗です（ご希望なら完成コードまで整えます）。

```bash
vim /var/www/winyx/backend/test_api/internal/logic/redispinglogic.go
```

```go
package logic

import (
	"context"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/redis"
)

type RedisPingLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRedisPingLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RedisPingLogic {
	return &RedisPingLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *RedisPingLogic) RedisPing() (string, error) {
	// go-zeroのRedisクライアントは model 側キャッシュで使われていますが
	// 単発PING用に一時クライアントを作成（本番はServiceContextへ共有化推奨）
	rc := redis.New(l.svcCtx.Config.Cache[0].Host, func(r *redis.Redis) {
		if p := l.svcCtx.Config.Cache[0].Pass; p != "" {
			r.SetPassword(p)
		}
	})
	defer rc.Close()
	return rc.Ping(l.ctx)
}
```

> **ポイント**: まずは「接続確認」に徹したAPIに留め、CRUDは次節で本格実装に進める流れがおすすめ。

---

### 2.2.9 動作確認（起動→疎通）

* [ ] **ビルド＆起動（前節の流儀でOK）**

```bash
cd /var/www/winyx/backend/test_api
go mod tidy
go build -o test_api
./test_api -f etc/testapi-api.yaml &
echo $! > /tmp/test_api.pid
```

* [ ] **疎通（DB/Redis）**

```bash
# DB用の簡易API（暫定文字列が返る想定）
curl -s http://127.0.0.1:8888/api/v1/db/now | jq .

# Redis PING
curl -s http://127.0.0.1:8888/api/v1/redis/ping | jq .
# → {"pong":"PONG","error":""}
```

* [ ] **停止**

```bash
kill "$(cat /tmp/test_api.pid)"
```

---

### 2.2.10 運用上のTIPS

* **機微情報の分離**: `testapi-api.yaml` に直書きせず、`/etc/winyx.d/test_api.env` を作り `EnvironmentFile=` でsystemdから渡す構成が安全。
* **タイムゾーン**: DSNに `loc=Asia%2FTokyo&parseTime=true` を付与（日時の取り扱いでズレ防止）。
* **インデックス**: ユースケースに応じて複合INDEXを検討（emailはUNIQUE済み）。
* **キャッシュキー設計**: go-zeroのモデル生成（`-c`）は主キー/uniqueに対して自動で安全なキーを設計してくれます。
* **マイグレーション**: 本番適用は必ず`Down`も用意し、ステージングで検証後に実行。

---

了解です。A案（goctlのModel＋Redisキャッシュ）で、そのまま**UsersのCRUD API**まで一気通貫で進めます。
前節までの `test_api` に実装を足していく前提です（VPS直インストール／非Docker）。

---

### 2.2.11 Modelの拡張（ページング・補助メソッド）

* [ ] \**拡張用ファイル（上書きされない *\_ext.go）を追加**

```bash
# Modelの拡張ファイルを新規作成
vim /var/www/winyx/backend/test_api/internal/model/usersmodel_ext.go
```

```go
package model

import (
	"context"
	"fmt"
)

type PageResult[T any] struct {
	Items []*T
	Total int64
}

func (m *defaultUserModel) FindPage(ctx context.Context, page, perPage int64) (*PageResult[User], error) {
	if page < 1 {
		page = 1
	}
	if perPage <= 0 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var total int64
	countQuery := fmt.Sprintf("select count(*) from %s", m.table)
	if err := m.QueryRowNoCacheCtx(ctx, &total, countQuery); err != nil {
		return nil, err
	}

	query := fmt.Sprintf("select %s from %s order by id desc limit ?, ?", userRows, m.table)
	var items []*User
	if err := m.QueryRowsNoCacheCtx(ctx, &items, query, offset, perPage); err != nil {
		return nil, err
	}

	return &PageResult[User]{Items: items, Total: total}, nil
}
```

> goctl生成の`defaultUserModel`は、**NoCache系クエリ**ヘルパを持つため、一覧・集計も簡単に拡張できます。

---

### 2.2.12 API入出力型の定義

* [ ] **typesを追加**（バリデーションは最小限・必要なら強化）

```bash
vim /var/www/winyx/backend/test_api/internal/types/types.go
```

```go
package types

type UserDTO struct {
	Id        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type CreateUserReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateUserReq struct {
	// Pathパラメータ
	Id int64 `path:"id"`

	// 任意更新項目（いずれか1つ以上）
	Name     *string `json:"name,optional"`
	Email    *string `json:"email,optional"`
	Password *string `json:"password,optional"`
}

type ListUserResp struct {
	Total int64      `json:"total"`
	Items []UserDTO  `json:"items"`
}
```

---

### 2.2.13 Handlerのルーティング追加

* [ ] **ルートへ5本のエンドポイントを登録**

```bash
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
```

```go
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

func RegisterHandlers(server *rest.Server, serverCtx *svc.ServiceContext) {
	// 既存ルート…

	server.AddRoutes([]rest.Route{
		// Users CRUD
		{Method: http.MethodPost,   Path: "/api/v1/users",        Handler: CreateUserHandler(serverCtx)},
		{Method: http.MethodGet,    Path: "/api/v1/users/:id",    Handler: GetUserHandler(serverCtx)},
		{Method: http.MethodGet,    Path: "/api/v1/users",        Handler: ListUserHandler(serverCtx)},
		{Method: http.MethodPut,    Path: "/api/v1/users/:id",    Handler: UpdateUserHandler(serverCtx)},
		{Method: http.MethodDelete, Path: "/api/v1/users/:id",    Handler: DeleteUserHandler(serverCtx)},
	})
}
```

---

### 2.2.14 Handler本体（薄い層→logicへ委譲）

* [ ] **Create / Get / List / Update / Delete**（5本）

```bash
vim /var/www/winyx/backend/test_api/internal/handler/user_handlers.go
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

func CreateUserHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.CreateUserReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.Error(w, err)
			return
		}
		resp, err := logic.NewCreateUserLogic(r.Context(), ctx).Create(&req)
		httpx.OkJsonCtx(r.Context(), w, wrap(resp, err))
	}
}

func GetUserHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := httpx.PathParam(r, "id")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		resp, err := logic.NewGetUserLogic(r.Context(), ctx).Get(id)
		httpx.OkJsonCtx(r.Context(), w, wrap(resp, err))
	}
}

func ListUserHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		page, _ := strconv.ParseInt(q.Get("page"), 10, 64)
		perPage, _ := strconv.ParseInt(q.Get("per_page"), 10, 64)
		resp, err := logic.NewListUserLogic(r.Context(), ctx).List(page, perPage)
		httpx.OkJsonCtx(r.Context(), w, wrap(resp, err))
	}
}

func UpdateUserHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UpdateUserReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.Error(w, err)
			return
		}
		resp, err := logic.NewUpdateUserLogic(r.Context(), ctx).Update(&req)
		httpx.OkJsonCtx(r.Context(), w, wrap(resp, err))
	}
}

func DeleteUserHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := httpx.PathParam(r, "id")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		err := logic.NewDeleteUserLogic(r.Context(), ctx).Delete(id)
		httpx.OkJsonCtx(r.Context(), w, wrap(map[string]any{"deleted": err == nil}, err))
	}
}

// 統一レスポンス（エラーを文字列で返すだけの軽量化）
func wrap(data any, err error) map[string]any {
	if err != nil {
		return map[string]any{"error": err.Error()}
	}
	return map[string]any{"data": data, "error": ""}
}
```

---

### 2.2.15 Logic（業務ロジック層）

* [ ] **Create**（bcryptでパスワードハッシュ）

```bash
vim /var/www/winyx/backend/test_api/internal/logic/user_create_logic.go
```

```go
package logic

import (
	"context"
	"errors"
	"strings"

	"github.com/winyx/backend/test_api/internal/model"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateUserLogic {
	return &CreateUserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *CreateUserLogic) Create(req *types.CreateUserReq) (*types.UserDTO, error) {
	// 簡易バリデーション
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || len(req.Password) < 8 {
		return nil, errors.New("invalid parameters")
	}
	// 既存メール確認（unique対策の早期チェック）
	if _, err := l.svcCtx.UserModel.FindOneByEmail(l.ctx, req.Email); err == nil {
		return nil, errors.New("email already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &model.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	res, err := l.svcCtx.UserModel.Insert(l.ctx, u)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	u.Id = id

	return &types.UserDTO{
		Id:        u.Id,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Time.Format("2006-01-02 15:04:05"),
		UpdatedAt: u.UpdatedAt.Time.Format("2006-01-02 15:04:05"),
	}, nil
}
```

* [ ] **Get**

```bash
vim /var/www/winyx/backend/test_api/internal/logic/user_get_logic.go
```

```go
package logic

import (
	"context"
	"database/sql"
	"errors"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/core/logx"
)

type GetUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserLogic {
	return &GetUserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *GetUserLogic) Get(id int64) (*types.UserDTO, error) {
	u, err := l.svcCtx.UserModel.FindOne(l.ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("not found")
		}
		return nil, err
	}
	return &types.UserDTO{
		Id:        u.Id,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Time.Format("2006-01-02 15:04:05"),
		UpdatedAt: u.UpdatedAt.Time.Format("2006-01-02 15:04:05"),
	}, nil
}
```

* [ ] **List（ページング）**

```bash
vim /var/www/winyx/backend/test_api/internal/logic/user_list_logic.go
```

```go
package logic

import (
	"context"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/core/logx"
)

type ListUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListUserLogic {
	return &ListUserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *ListUserLogic) List(page, perPage int64) (*types.ListUserResp, error) {
	res, err := l.svcCtx.UserModel.FindPage(l.ctx, page, perPage)
	if err != nil {
		return nil, err
	}
	items := make([]types.UserDTO, 0, len(res.Items))
	for _, u := range res.Items {
		items = append(items, types.UserDTO{
			Id:        u.Id,
			Name:      u.Name,
			Email:     u.Email,
			CreatedAt: u.CreatedAt.Time.Format("2006-01-02 15:04:05"),
			UpdatedAt: u.UpdatedAt.Time.Format("2006-01-02 15:04:05"),
		})
	}
	return &types.ListUserResp{Total: res.Total, Items: items}, nil
}
```

* [ ] **Update（部分更新＆メール重複チェック）**

```bash
vim /var/www/winyx/backend/test_api/internal/logic/user_update_logic.go
```

```go
package logic

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/winyx/backend/test_api/internal/model"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type UpdateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserLogic {
	return &UpdateUserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *UpdateUserLogic) Update(req *types.UpdateUserReq) (*types.UserDTO, error) {
	u, err := l.svcCtx.UserModel.FindOne(l.ctx, req.Id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("not found")
		}
		return nil, err
	}

	// 任意フィールドの反映
	if req.Name != nil {
		u.Name = strings.TrimSpace(*req.Name)
	}
	if req.Email != nil {
		newEmail := strings.TrimSpace(*req.Email)
		if newEmail != u.Email {
			if _, err := l.svcCtx.UserModel.FindOneByEmail(l.ctx, newEmail); err == nil {
				return nil, errors.New("email already exists")
			}
			u.Email = newEmail
		}
	}
	if req.Password != nil && len(*req.Password) > 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		u.PasswordHash = string(hash)
	}

	if err := l.svcCtx.UserModel.Update(l.ctx, u); err != nil {
		return nil, err
	}

	return &types.UserDTO{
		Id:        u.Id,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Time.Format("2006-01-02 15:04:05"),
		UpdatedAt: u.UpdatedAt.Time.Format("2006-01-02 15:04:05"),
	}, nil
}
```

* [ ] **Delete**

```bash
vim /var/www/winyx/backend/test_api/internal/logic/user_delete_logic.go
```

```go
package logic

import (
	"context"
	"database/sql"
	"errors"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/zeromicro/go-zero/core/logx"
)

type DeleteUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDeleteUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteUserLogic {
	return &DeleteUserLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *DeleteUserLogic) Delete(id int64) error {
	// 先に存在確認（キャッシュも有効活用）
	if _, err := l.svcCtx.UserModel.FindOne(l.ctx, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("not found")
		}
		return err
	}
	return l.svcCtx.UserModel.Delete(l.ctx, id)
}
```

---

### 2.2.16 ビルド・起動・疎通確認

* [ ] **ビルド＆起動**

```bash
cd /var/www/winyx/backend/test_api
go mod tidy
go build -o test_api
./test_api -f etc/testapi-api.yaml &
echo $! > /tmp/test_api.pid
```

* [ ] **作成（Create）**

```bash
curl -s -X POST http://127.0.0.1:8888/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Passw0rd!"}' | jq .
```

* [ ] **取得（Get）**

```bash
# 例: id=1
curl -s http://127.0.0.1:8888/api/v1/users/1 | jq .
```

* [ ] **一覧（List）**

```bash
curl -s "http://127.0.0.1:8888/api/v1/users?page=1&per_page=20" | jq .
```

* [ ] **更新（Update／部分更新OK）**

```bash
curl -s -X PUT http://127.0.0.1:8888/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Updated"}' | jq .
```

* [ ] **削除（Delete）**

```bash
curl -s -X DELETE http://127.0.0.1:8888/api/v1/users/1 | jq .
```

* [ ] **停止**

```bash
kill "$(cat /tmp/test_api.pid)"
```

---

## 次の選択肢（どちらで進めますか？）

1. **この実装をベースに、`goctl api` DSL（`user.api`）を追加**して、自動生成コードに近づける（将来的に型定義・ルートの一元管理が楽）。
2. **認証（JWT or セッション）を先に入れて**、Users APIを **認可保護** する（Sanctum互換の発行フローやGo-Zeroのmiddlewareを実装）。

どちらを優先しますか？「1→2」の順に進めるのが無難ですが、要件に合わせて調整します。

了解！ご指定どおり\*\*「1 → 2」\*\*の順で進めます。
ここでは **goctl の API DSL（`user.api`）を作成 → 安全にコード生成（上書き回避）→ 既存 `test_api` へ統合**し、続けて **JWT 認証で Users API を保護** します。JWT の DSL 指定と生成コードの挙動は go-zero 公式ドキュメント準拠です（`@server(jwt: Auth)` で JWT を有効化 → `routes.go` に `rest.WithJwt(...)` が付与され、`config.Auth.AccessSecret/AccessExpire` が生成されます）。([Go-Zero][1])

---

# 第2章 環境構築・セットアップ編

## 第2節 データベース・Redis連携設定（A案つづき：goctl API DSL → JWT保護）

> 安全運用のため、**生成物は一度 `_gen_userapi/` に出力**してから既存コードへ取り込みます（上書き事故防止）。

---

### 2.2.18 API DSL（`user.api`）の作成

* [ ] `api/user.api` を新規作成（Users CRUD と Auth を宣言）

```bash
# プロジェクト直下の例
vim /var/www/winyx/backend/test_api/api/user.api
```

```api
syntax = "v1"

// 1) 共通DTO
type (
  UserDTO {
    Id        int64  `json:"id"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    CreatedAt string `json:"created_at"`
    UpdatedAt string `json:"updated_at"`
  }

  CreateUserReq {
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"password"`
  }

  UpdateUserReq {
    Id       int64   `path:"id"`
    Name     *string `json:"name,optional"`
    Email    *string `json:"email,optional"`
    Password *string `json:"password,optional"`
  }

  ListUserResp {
    Total int64     `json:"total"`
    Items []UserDTO `json:"items"`
  }
)

// 2) 認証用（公開）
type (
  LoginReq {
    Email    string `json:"email"`
    Password string `json:"password"`
  }
  LoginResp {
    Token    string `json:"token"`
    ExpireIn int64  `json:"expire_in"` // 秒
  }
)

// 3) 公開サービス：登録とログインのみ（非JWT）
@server(
  group: public
  prefix: /api/v1
)
service user {
  @handler CreateUser
  post /users (CreateUserReq) returns (UserDTO)

  @handler Login
  post /auth/login (LoginReq) returns (LoginResp)
}

// 4) 保護サービス：CRUD取得系はJWT必須
//    jwt: Auth の "Auth" 名は生成される config.Auth と一致（公式仕様）
@server(
  jwt:   Auth
  group: user
  prefix: /api/v1
)
service user {
  @handler GetUser
  get  /users/:id returns (UserDTO)

  @handler ListUser
  get  /users returns (ListUserResp)

  @handler UpdateUser
  put  /users/:id (UpdateUserReq) returns (UserDTO)

  @handler DeleteUser
  delete /users/:id
}
```

> `@server(jwt: Auth)` により**このブロック内のルートのみ** JWT が必須になります（ログインや登録は公開のまま）。生成後は `routes.go` に `rest.WithJwt(c.Auth.AccessSecret)` が付与されます。([Go-Zero][1])

---

### 2.2.19 goctl で「安全出力（上書き回避）」生成

* [ ] 生成物を `_gen_userapi/` へ

```bash
cd /var/www/winyx/backend/test_api

# goctl が入っていなければインストール
# go install github.com/zeromicro/go-zero/tools/goctl@latest

# 生成（既存ソース直上書きを避ける）
goctl api go -api api/user.api -dir _gen_userapi
```

* [ ] 差分確認（vimdiff）

```bash
vimdiff _gen_userapi/internal/handler/routes.go internal/handler/routes.go
```

> 以降は **生成された構造をベース** に既存のハンドラ/ロジックを寄せます。API DSL は**仕様の単一ソース**になるため、今後の変更は `user.api` を更新 → 再生成 → 差分取込の運用にします。([Go-Zero][2])

---

### 2.2.20 生成コードの取り込み（最低限の統合作業）

* [ ] `config.go` の **Auth セクション** を反映（なければ追記）

```bash
vim /var/www/winyx/backend/test_api/internal/config/config.go
```

```go
// 生成結果に合わせて Auth を定義済みでなければ追加
type AuthConf struct {
    AccessSecret string
    AccessExpire int64
}

type Config struct {
    rest.RestConf
    Mysql MysqlConf
    Cache cache.CacheConf
    Auth  AuthConf // ★JWT設定
}
```

> `@server(jwt: Auth)` の `Auth` は `Config.Auth` として生成され、`routes.go` で `rest.WithJwt(c.Auth.AccessSecret)` に使われます。([Go-Zero][1])

* [ ] YAML に **JWT 秘密鍵と有効期限** を追加

```bash
vim /var/www/winyx/backend/test_api/etc/testapi-api.yaml
```

```yaml
Auth:
  AccessSecret: "CHANGE_ME_SUPER_SECRET_256BIT"
  AccessExpire: 86400   # 24h（秒）
```

* [ ] 生成 `routes.go` をベースに**登録関数の置換/統合**

```bash
# 生成側を開いて該当の RegisterHandlers を確認し、既存 routes.go を置換
vim _gen_userapi/internal/handler/routes.go
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
```

> 生成 `RegisterHandlers` では JWT ブロックに `rest.WithJwt(c.Auth.AccessSecret)` が付与されています。この形に合わせて既存の DB/Redis チェックAPIも必要に応じて**公開側ブロック**へ移しておくと整理が進みます。([Go-Zero][1])

---

### 2.2.21 Login 実装（JWT 発行）

* [ ] ライブラリ導入（`golang-jwt/jwt/v5`）

```bash
cd /var/www/winyx/backend/test_api
go get github.com/golang-jwt/jwt/v5
```

* [ ] ロジック実装

```bash
vim /var/www/winyx/backend/test_api/internal/logic/login_logic.go
```

```go
package logic

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type LoginLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
	return &LoginLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *LoginLogic) Login(req *types.LoginReq) (*types.LoginResp, error) {
	// email からユーザー検索（キャッシュ活用）
	u, err := l.svcCtx.UserModel.FindOneByEmail(l.ctx, req.Email)
	if err != nil {
		return nil, ErrUnauthorized("invalid credentials")
	}
	// パスワード照合
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrUnauthorized("invalid credentials")
	}

	// JWT 作成
	iat := time.Now().Unix()
	exp := iat + l.svcCtx.Config.Auth.AccessExpire

	claims := jwt.MapClaims{
		"sub":    u.Id,
		"email":  u.Email,
		"iat":    iat,
		"exp":    exp,
		"scopes": []string{"user"},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
	if err != nil {
		return nil, err
	}

	return &types.LoginResp{
		Token:    signed,
		ExpireIn: l.svcCtx.Config.Auth.AccessExpire,
	}, nil
}

// 軽量な認証エラー
type UnauthorizedError struct{ msg string }
func (e UnauthorizedError) Error() string { return e.msg }
func ErrUnauthorized(msg string) error   { return UnauthorizedError{msg: msg} }
```

> JWT のサーバ側検証は `routes.go` の `rest.WithJwt(secret)` により自動適用されます。必要なら `WithUnauthorizedCallback` で 401 応答のカスタムも可能です。([Go-Zero][3])

* [ ] ハンドラ（生成名に合わせて）

```bash
vim /var/www/winyx/backend/test_api/internal/handler/loginhandler.go
```

```go
package handler

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func LoginHandler(ctx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.LoginReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.Error(w, err); return
		}
		resp, err := logic.NewLoginLogic(r.Context(), ctx).Login(&req)
		if err != nil {
			httpx.Error(w, err); return
		}
		httpx.OkJsonCtx(r.Context(), w, map[string]any{"data": resp, "error": ""})
	}
}
```

---

### 2.2.22 Users CRUD を DSL に寄せる（命名合わせ）

> 既存の `CreateUserHandler/GetUserHandler/...` は **生成名と一致** させると更新が楽です（`@handler CreateUser` など）。必要なければ関数名はそのままでも OK ですが、再生成時に差分マージがしやすい形に揃えるのを推奨します。([Go-Zero][2])

* [ ] 既存ファイル名/関数名の**リネーム（任意）**

```bash
# 例：internal/handler/user_handlers.go → user_create_handler.go など
# 例：CreateUserHandler / GetUserHandler 名を維持 or 生成に揃える
```

---

### 2.2.23 起動と検証（JWT フロー）

* [ ] ビルド・起動

```bash
cd /var/www/winyx/backend/test_api
go mod tidy
go build -o test_api
./test_api -f etc/testapi-api.yaml &
echo $! > /tmp/test_api.pid
```

* [ ] **登録**（公開）

```bash
curl -s -X POST http://127.0.0.1:8888/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Passw0rd!"}' | jq .
```

* [ ] **ログイン → JWT 取得**（公開）

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}' | jq -r '.data.token')
echo "$TOKEN" | sed -E 's/\..*\./.PAYLOAD./'   # 構造確認用に中身省略表示
```

* [ ] **保護APIにアクセス（Authorization: Bearer …）**

```bash
# 取得（JWT必須）
curl -s http://127.0.0.1:8888/api/v1/users/1 \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# 未認証アクセスの検証（401想定）
curl -i -s http://127.0.0.1:8888/api/v1/users/1 | head -n 1
```

* [ ] 停止

```bash
kill "$(cat /tmp/test_api.pid)"
```

---

### 2.2.24 実運用のおすすめ

* **秘密鍵管理**：`AccessSecret` は `.env` や `systemd EnvironmentFile` から注入。ローテーションが必要なら `WithJwtTransition` のように**新旧シークレットの併用**設計も可能（公式の「JWT 認証」節のオプション参照）。([Go-Zero][3])
* **権限粒度**：今回の例は「ログイン済みならOK」という最小構成。将来は `scopes` / `role` をクレームに付与し、ミドルウェアでチェック（DSLの `middleware:` 宣言で差し込み）。([Go-Zero][2])
* **期限とリフレッシュ**：`AccessExpire` は 15〜60分、別途**リフレッシュトークン**で長期維持、失効は Redis ブラックリストで即時遮断が定番（公式でも「失効管理はRedisで実装可」と言及）。([Go-Zero][3])

---

## 次の選択肢（お好みでどうぞ）

**A.** 生成 `RegisterHandlers` を**完全採用**し、既存ルート定義をすべて置換（最も DSL 準拠）。
**B.** いまのまま（既存ルート維持）の上で、`user.api` を**仕様ドキュメント兼コード生成ソース**として運用（差分反映は手動）。

> どちらで進めますか？
> 併せて、**Unauthorized応答の体裁変更**（`WithUnauthorizedCallback` で JSON 固定化）や、**リフレッシュトークン**追加にも即対応できます。
