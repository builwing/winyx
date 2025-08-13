# Winyx プロジェクト README

> 本READMEは **第1章（プロジェクト仕様書）** と **第2章（環境構築・セットアップ編）** を統合し、初学者でも手戻りなく着手できるよう A/B 選択肢と根拠、チェックリスト付き手順、検証・ロールバック、落とし穴をまとめたものです。Winyx標準の命名・配置規約を反映しています。

---

## 1) 背景と選択肢（A/B）

* **A案（推奨）**：VPS直インストール構成（Nginx＋Go-Zero＋MariaDB＋Redis）で `/var/www/winyx/` 配下運用。
* **B案**：将来的にDocker化（現時点は非Dockerで進め、運用が安定したら移行）。

**採用理由（A案）**

1. 学習コストが低く、VPSでのトラブルシュートが容易。
2. I/Oやネットワークのオーバーヘッドが少なく、軽量。
3. 章別の手順がA案に最適化されている。

---

## 2) 推奨の根拠（3点）

1. 仕様の単一ソース（契約駆動）でフロント/バック間の齟齬を抑止。
2. ディレクトリ・命名規約を固定し、systemdや監視への接続が容易。
3. DB/Redisの疎通→CRUD→JWTまで最短経路で検証可能。

---

## 3) 手順（チェックボックス + コード）

### 3.1 ルート構成を用意

```
/var/www/winyx/
├── contracts/   # .api / .proto / DDL
├── backend/     # Go-Zero サービス群
└── frontend/    # Next.js ビルド成果物
```

* [ ] ディレクトリを作成

```bash
# /var/www/winyx を作成し、標準の3ディレクトリを用意
sudo mkdir -p /var/www/winyx/{contracts/{api,rpc},backend,frontend}
sudo chown -R "$USER":www-data /var/www/winyx
sudo chmod -R 775 /var/www/winyx
```

> 目的：配置規約どおりのベースを作る

---

### 3.2 Go / goctl / protoc の準備

* [ ] GoのPATHとGOBINを設定

```bash
vim ~/.bashrc
# 末尾に追記
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN
# 保存後
source ~/.bashrc
```

> 目的：goctl等のCLIをGOBINに配置してPATH解決

* [ ] goctl / protoc プラグインを導入

```bash
# goctl（インストール済みならバージョン確認だけでOK）
go install github.com/zeromicro/go-zero/tools/goctl@latest

go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

> 目的：.api/.proto からコード生成できる状態にする

---

### 3.3 Go Modules初期化（backend）

* [ ] モジュール初期化と依存追加

```bash
cd /var/www/winyx/backend

go mod init github.com/winyx/backend
# フレームワーク依存はモジュールとして追加
go get github.com/zeromicro/go-zero@latest
# CLIは実行バイナリとして導入
go install github.com/zeromicro/go-zero/tools/goctl@latest
```

> 目的：`go.mod` を確定し、開発に必要な依存とCLIを用意

---

### 3.4 命名と設定ファイルの**統一**（重要）

* サービス名は **snake\_case or lowerCamel（ハイフン禁止）**。

* YAMLの **Name:** は **サービス名と完全一致**。

* **設定ファイル名**は `etc/<service>-api.yaml`（例：`etc/test_api-api.yaml`）。

* [ ] 既存の命名ゆれをvimで一括修正（例：`testapi_api.yaml` → `test_api-api.yaml`）

```bash
# 例：backend/test_api 配下で
vim etc/testapi_api.yaml
# :wq で保存後、ファイル名をリネーム
mv etc/testapi_api.yaml etc/test_api-api.yaml

# ソース内の参照名も置換（vim で複数ファイルを開き一括置換）
# 例: :args **/*.go **/*.yaml | argdo %s/testapi_api\.yaml/test_api-api.yaml/ge | update
```

> 目的：YAML参照ズレによる起動失敗を防止

---

### 3.5 テンプレAPIの生成→起動→疎通（最小確認）

* [ ] 雛形作成とJSON返却化

```bash
cd /var/www/winyx/backend

goctl api new test_api
cd test_api

# types/logic を最小JSON返却に差し替え（vimで編集）
vim internal/types/types.go
# 保存(:wq)後、必要なら logic 側で空文字デフォルトを補完
```

> 目的：RESTサーバの最小起動とJSON返却を確認

* [ ] ビルド→設定→起動

```bash
# 設定ファイル作成（統一命名）
mkdir -p etc
cat > etc/test_api-api.yaml <<'YAML'
Name: test_api
Host: 0.0.0.0
Port: 8888
YAML

# 依存解決とビルド
go mod tidy
go build -o test_api

# 起動
./test_api -f etc/test_api-api.yaml &
echo $! > /tmp/test_api.pid
```

> 目的：ポート8888で立ち上げ、PIDで管理

* [ ] 疎通→停止

```bash
curl -s http://127.0.0.1:8888/from/you | jq .
kill "$(cat /tmp/test_api.pid)"
```

> 目的：JSONレスポンス確認と安全停止

---

### 3.6 DB/Redis の準備と疎通

* [ ] MariaDB：DB/ユーザー作成

```bash
sudo mariadb <<'SQL'
CREATE DATABASE winyx_core DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
CREATE USER 'winyx_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_ME_STRONG_PW';
GRANT ALL PRIVILEGES ON winyx_core.* TO 'winyx_app'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

> 目的：アプリ専用権限で安全に接続

* [ ] Redis：必要なら `requirepass` を設定→再起動

```bash
sudo vim /etc/redis/redis.conf
# requirepass を設定したら
sudo systemctl restart redis-server
redis-cli -h 127.0.0.1 ping
```

> 目的：Redisの最低限の疎通（PONG）

* [ ] `test_api` 設定にDB/Redisを追加

```bash
vim /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

```yaml
Mysql:
  DataSource: "winyx_app:REPLACE_ME_STRONG_PW@tcp(127.0.0.1:3306)/winyx_core?charset=utf8mb4&parseTime=true&loc=Asia%2FTokyo"
Cache:
  - Host: 127.0.0.1:6379
    Pass: ""     # 設定時は値を入れる
    Type: node
```

> 目的：ServiceContext からMySQL/Redisに到達できるようにする

---

### 3.7 DDL → Model 生成（キャッシュ対応）

* [ ] DDLを作成・適用

```bash
vim /var/www/winyx/contracts/api/schema.sql
# users テーブルDDLを記述（UNIQUE email 等）

mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core < /var/www/winyx/contracts/api/schema.sql
```

> 目的：DBスキーマをGit管理し、再現可能に

* [ ] goctl model 生成

```bash
cd /var/www/winyx/backend/test_api

goctl model mysql ddl \
  -src /var/www/winyx/contracts/api/schema.sql \
  -dir ./internal/model \
  -c
```

> 目的：go-zeroのキャッシュMixIn付きModelを生成

---

### 3.8 Users CRUD + JWT（要点だけ）

* [ ] `user.api` を作成（公開：登録/ログイン、保護：CRUD）

```bash
vim /var/www/winyx/backend/test_api/api/user.api
```

```api
syntax = "v1"
// DTO/Req/Resp を定義 …
@server(group: public, prefix: /api/v1)
service user {
  @handler CreateUser
  post /users (CreateUserReq) returns (UserDTO)
  @handler Login
  post /auth/login (LoginReq) returns (LoginResp)
}
@server(jwt: Auth, group: user, prefix: /api/v1)
service user {
  @handler GetUser
  get /users/:id returns (UserDTO)
  @handler ListUser
  get /users returns (ListUserResp)
  @handler UpdateUser
  put /users/:id (UpdateUserReq) returns (UserDTO)
  @handler DeleteUser
  delete /users/:id
}
```

> 目的：DSLを仕様の単一ソースにして再生成運用へ

* [ ] 生成（安全出力先に出す）

```bash
goctl api go -api api/user.api -dir _gen_userapi
vimdiff _gen_userapi/internal/handler/routes.go internal/handler/routes.go
```

> 目的：既存コードを安全に比較・取り込み

* [ ] JWT設定をYAMLへ

```bash
vim /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

```yaml
Auth:
  AccessSecret: "CHANGE_ME_SUPER_SECRET_256BIT"
  AccessExpire: 86400
```

> 目的：JWTミドルウェア（WithJwt）に秘密鍵/期限を供給

---

### 3.9 起動・検証（CRUD/JWT）

* [ ] ビルド＆起動

```bash
cd /var/www/winyx/backend/test_api

go mod tidy
go build -o test_api
./test_api -f etc/test_api-api.yaml &
echo $! > /tmp/test_api.pid
```

> 目的：PID管理で安全に停止可能

* [ ] 動作確認（代表）

```bash
# 登録（公開）
curl -s -X POST http://127.0.0.1:8888/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Passw0rd!"}' | jq .

# ログイン→JWT取得（公開）
TOKEN=$(curl -s -X POST http://127.0.0.1:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}' | jq -r '.data.token')

# 取得（保護／Authorization: Bearer）
curl -s http://127.0.0.1:8888/api/v1/users/1 -H "Authorization: Bearer ${TOKEN}" | jq .
```

> 目的：公開/保護ルートの疎通確認

* [ ] 停止

```bash
kill "$(cat /tmp/test_api.pid)"
```

> 目的：プロセスを確実に停止

---

## 4) 検証 / ロールバック手順

* **検証**

  * `curl http://127.0.0.1:8888/from/you` → JSON応答
  * `curl /api/v1/redis/ping` → `{"pong":"PONG"}`
  * ユーザCRUDがHTTP 200を返し、JWT保護が401/200を切替

* **ロールバック**

  * DBマイグレーション：`goose down`（1段戻し）/ `goose redo`（やり直し）
  * バイナリ：`kill PID` → 直前の安定ビルドへ再リンク
  * 設定：vimで差分確認（`:vert diffsplit`）→ 保存

---

## 5) 注意点（落とし穴 3つ）

1. **サービス名にハイフン**：インポートパスや生成物の衝突原因。必ず `test_api` のようにハイフンなし。
2. **設定ファイル名のゆれ**：`testapi_api.yaml` と `test_api-api.yaml` が混在すると起動に失敗。統一・置換・リネーム必須。
3. **機微情報の直書き**：DBパスワードやJWT秘密鍵は `.env` や `EnvironmentFile=` に逃がす。Gitに残さない。

---

## 付録A：vim 置換ショート

* [ ] 設定名の一括置換（ファイル内）

```vim
:%s/testapi_api\.yaml/test_api-api.yaml/g
```

> 目的：命名ゆれの修正

* [ ] 章番号の置換例（必要時）

```vim
:%s/^1\.6 /2.1.6 /g
```

> 目的：章立ての整合

---

## 次の一歩（1行）

*systemd ユニットを用意して `test_api` を常駐化し、`EnvironmentFile=/etc/winyx.d/test_api.env` で秘密情報を外出ししましょう。*
