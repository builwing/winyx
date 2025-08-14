# CLAUDE.md - プロジェクト固有の指示

## 重要な指示

### 言語設定
**必ず日本語で返答すること。** すべてのコミュニケーション、説明、エラーメッセージ、コメントは日本語で記述してください。

## プロジェクト情報

### リポジトリ構造
- `/var/www/winyx` - プロジェクトルートディレクトリ
- `backend/` - バックエンドサービス
  - `test_api/` - テストAPIサービス (Go-Zero)
- `frontend/` - フロントエンドアプリケーション
- `docs/` - ドキュメント

### 開発環境
- Go version: 1.22+
- Framework: Go-Zero
- Database: MySQL/MariaDB
- Cache: Redis

### コーディング規約
- Goファイル名は小文字のみを使用（例: `loginhandler.go`、`servicecontext.go`）
- ケースセンシティブなファイルシステムでの動作を前提とする

### テストとビルド
- ビルドコマンド: `go build`
- テストコマンド: 確認が必要

### サービス管理
- systemdサービス名: `winyx-test-api.service`
- 設定ファイル: `etc/test_api-api.yaml`