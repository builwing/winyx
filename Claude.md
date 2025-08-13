# Claude.md — Winyx／ウィニックス プロジェクト用・Claude Code 作業指示書
（対象：Laravel 12 / Next.js 15 / Go-Zero。VPS直構成。エディタは **vim** 固定）

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

## 2. 命名とファイル配置（Winyx標準）
- **サービス名**：`snake_case` または `lowerCamel`。**ハイフン禁止**（例：`test_api` はOK、`test-api` はNG）。
- **YAMLの Name:** は **サービス名と同一**（例：`Name: test_api`）。
- **設定ファイル名**：`etc/<service>-api.yaml` を推奨（例：`etc/test_api-api.yaml`）。
  - 既存プロジェクトに `testapi_api.yaml` がある場合は**統一対象**。新規作成は上記の命名に寄せる。
- **VPS 配置**：`/var/www/winyx/` 配下（`backend/`, `frontend/`, `contracts/`）。

---

## 3. バージョンと環境前提
- OS: Ubuntu 24.04 LTS（例示）
- Timezone: Asia/Tokyo
- DB: MariaDB（`winyx_core`）、Redis（ローカル）
- Go: 1.24 系（例示） / goctl: 最新
- フロント：Next.js 15（VPSにはビルド結果のみ配置）
- Laravel 12 + Octane は別章で扱う（本書では Go-Zero 章の指示ルールを中心に規定）

---

## 4. よくある判断（先に結論 → 根拠）
### 4.1 go-zero 導入コマンド
- **結論**：
  - プロジェクトの依存として go-zero を入れる → `go get github.com/zeromicro/go-zero@latest`
  - CLI（goctl）は**実行バイナリ**として入れる → `go install github.com/zeromicro/go-zero/tools/goctl@latest`
- **根拠**：`go get` はモジュール依存（`go.mod`）を更新、`go install` は `$GOBIN` にツール配置。役割が異なる。

### 4.2 サービス名と YAML Name の統一
- **結論**：`test_api`（ディレクトリ） ⇄ `Name: test_api`（YAML）で**完全一致**させる。
- **理由**：監視・systemd・ログ、OpenAPI名寄せの混乱を防ぐ／チーム内検索のヒット率を上げる。

### 4.3 設定ファイル名の統一
- **結論**：`etc/<service>-api.yaml`（例：`etc/test_api-api.yaml`）で統一。
- **理由**：goctl 生成物の慣習に沿いつつ、人間可読性（どのサービスの API 設定か即分かる）。

---

## 5. Claude Code の作業テンプレ
### 5.1 「選択肢 → 手順 → 検証」テンプレ（雛形）
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

### 5.2 Go-Zero：最小サービスの生成と起動
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
    Name string ` + "`" + `path:"name"` + "`" + ` // ※デフォルト値はロジック側で補う
}
type Response struct {
    Message string ` + "`" + `json:"message"` + "`" + `
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

## 6. 設定・実装ガイド
### 6.1 DB/Redis
- [ ] MariaDB の疎通確認（最低限）

```bash
mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core -e "SELECT NOW() AS now, @@version AS version;"
```

- [ ] Redis の疎通確認

```bash
redis-cli -h 127.0.0.1 ping
# → PONG（パスワードありなら -a を付与）
```

### 6.2 goctl model（キャッシュ有効）
- [ ] DDL から model を生成

```bash
cd /var/www/winyx/backend/test_api
goctl model mysql ddl   -src /var/www/winyx/contracts/api/schema.sql   -dir ./internal/model -c
```

### 6.3 Handler / Logic の最小構成（CRUD例）
- [ ] ルーティング登録（5本：POST/GET/GET/LIST/DELETE）

```bash
vim /var/www/winyx/backend/test_api/internal/handler/routes.go
# server.AddRoutes([...]) に Users の5本を追加
```

- [ ] Handler → Logic → Model の薄い三層を維持（複雑化を避ける）

---

## 7. ドキュメント作成の流儀
- 「第N章 第M節 ...」の**章番号を崩さない**。草案に異なる数字が混在している場合は**この規約に従って修正**。
- 設定ファイルの**表記ゆれを許容しない**：
  - **Name** は `test_api` 固定
  - **設定ファイル名**は `test_api-api.yaml` 固定
  - 本文内に `testapi_api.yaml` / `testapi-api.yaml` の両方が現れた場合は **前者に統一**ではなく、本規約（`test_api-api.yaml`）へ合わせる。

---

## 8. 安全策・落とし穴
- **サービス名ハイフン**は生成済みコードの import path に齟齬を生む。必ず snake_case。
- **path タグのデフォルト値**はパーサにより無視されることがあるため、**ロジック側で空文字を補完**する。
- **機微情報**は YAML に直書きせず、`/etc/winyx.d/<service>.env` ＋ systemd `EnvironmentFile=` を推奨。

---

## 9. 提案の出し方（Claude Code 内部ルール）
- 同じ結果に至る手段が複数ある場合、**3件以内の選択肢**と**採用基準**（安定性/運用容易性/学習コスト等）を短く提示。
- 初学者向けに、**落とし穴（3つ以内）**と**検証コマンド（1～2個）**を必ず添える。
- 返信の最後に「次の一歩」を1行示す（例：*「WorkDir を systemd 化しましょう」*）。

---

## 付録A：vim 置換ショート
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
