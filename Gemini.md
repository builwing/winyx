# Gemini.md - Winyx プロジェクト固有の指示書

## 1. 基本原則

### 1.1. 応答言語
**必ず日本語で応答してください。** コミュニケーション、説明、コードコメントなど、すべてのテキストは日本語で生成します。

### 1.2. ユーザーへの配慮
- 常に安全性を最優先し、破壊的なコマンド（`rm -rf` など）を実行する前には必ず目的と影響を説明し、ユーザーの確認を促します。
- 専門用語は避け、平易な言葉で説明することを心がけてください。
- 複数の選択肢がある場合は、それぞれのメリット・デメリットを簡潔に提示し、プロジェクトの状況に最適な提案を行ってください。

### 1.3. ワークフロー
1.  **理解 (Understand):** `read_file` や `glob`, `search_file_content` などのツールを駆使して、既存のコード、規約、ディレクトリ構造を完全に把握してから作業に着手します。
2.  **計画 (Plan):** 実行する手順を明確に定義し、必要であればユーザーに簡潔に共有します。
3.  **実行 (Implement):** `write_file`, `replace`, `run_shell_command` などのツールを用いて、計画を着実に実行します。
4.  **検証 (Verify):** コードの変更後は、必ずプロジェクトで定義されたビルド、テスト、リントコマンドを実行し、変更内容の品質を保証します。

---

## 2. プロジェクト規約（最重要）

### 2.1. 命名規則とファイル配置
- **プロジェクトルート:** `/var/www/winyx`
- **サービスディレクトリ名:** `snake_case` または `lowerCamelCase` を使用します（例: `user_service`）。**ハイフン (`-`) の使用は禁止**です。
- **Go-Zero設定ファイル:**
    - **ファイル名:** `etc/<service>-api.yaml` の形式で統一します（例: `etc/user_service-api.yaml`）。
    - **`Name` プロパティ:** サービスディレクトリ名と完全に一致させます（例: `Name: user_service`）。
- **Goソースファイル名:** 小文字のみを使用します（例: `userservice.go`, `internal/handler/userhandler.go`）。

### 2.2. 契約駆動開発 (Contract-Driven Development)
- **信頼できる情報源 (Single Source of Truth):** Go-Zero の `.api` ファイルが全ての仕様の基礎となります。
- **自動化スクリプト:**
    - フロントエンドの型定義、APIクライアント、Swaggerドキュメントなどは `scripts/sync_contracts.sh` によって自動生成されます。
    - コード生成やAPI仕様の変更が必要な場合は、まず `.api` ファイルを編集し、このスクリプトを実行することを検討してください。

---

## 3. 技術スタックと環境

- **OS:** Ubuntu 24.04 LTS
- **データベース:** MariaDB (`winyx_core`), Redis
- **バックエンド:** Go 1.22+ (Go-Zero フレームワーク)
- **フロントエンド:** Next.js 15 (TypeScript, Tailwind CSS)
- **パッケージ管理:** `go mod` (バックエンド), `npm` (フロントエンド)

---

## 4. 主要コマンド

### 4.1. バックエンド (Go)
- **依存関係の解決:** `go mod tidy`
- **ビルド:** `go build -o <service_name>`
- **テスト:** `go test ./...`
- **サービスの起動 (例):** `./user_service -f etc/user_service-api.yaml`
- **`goctl` の利用:**
    - **ツールインストール:** `go install github.com/zeromicro/go-zero/tools/goctl@latest`
    - **モデル生成 (キャッシュ有効):** `goctl model mysql ddl -src ../../contracts/api/schema.sql -dir ./internal/model -c`

### 4.2. フロントエンド (Next.js)
- **依存関係のインストール:** `npm install`
- **開発サーバー起動:** `npm run dev`
- **ビルド:** `npm run build`
- **リント:** `npm run lint`

### 4.3. データベースとキャッシュ
- **MariaDB 接続確認:** `mariadb -h 127.0.0.1 -u winyx_app -p -D winyx_core -e "SELECT NOW();"`
- **Redis 接続確認:** `redis-cli ping` (応答が `PONG` なら正常)

---

## 5. 注意事項とベストプラクティス

- **機微情報:** データベースのパスワードなどの機微情報は、YAMLファイルに直接記述せず、systemdの `EnvironmentFile` 機能などを活用して外部から注入することを推奨します。
- **Go-Zeroサービス名:** サービス名にハイフンを使用すると、生成されるコードのimportパスに問題が生じるため、絶対に使用しないでください。
- **APIリクエストのデフォルト値:** `.api` ファイルの `path` タグでデフォルト値を設定しても無視される可能性があるため、Goのロジック側で未入力時の値を補完する実装を行ってください。
- **ドキュメント:** `docs/` ディレクトリ内のドキュメント体系、特に章番号の構成を尊重し、変更を加える際は既存の構造に従ってください。