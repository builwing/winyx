#!/bin/bash

# Go-Zero API契約ファイルとフロントエンドの自動同期スクリプト
# 使用法: ./sync_contracts.sh [--watch]

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
PROJECT_ROOT="/var/www/winyx"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# API契約ファイル
API_FILES=(
    "$BACKEND_DIR/test_api/test_api.api"
    # 他のAPIファイルがあればここに追加
)

# 出力ディレクトリ
TYPES_OUTPUT_DIR="$FRONTEND_DIR/src/types/generated"
CLIENT_OUTPUT_DIR="$FRONTEND_DIR/src/lib/api/generated"
DOCS_DIR="$PROJECT_ROOT/docs"

# ログファイル
LOG_FILE="/var/log/winyx/contract-sync.log"
mkdir -p "$(dirname "$LOG_FILE")"

# ログ関数
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        DEBUG)
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# 契約ファイルの変更を検出
check_contract_changes() {
    local changed_files=()
    
    for api_file in "${API_FILES[@]}"; do
        if [ -f "$api_file" ]; then
            # 最後の生成時刻と比較
            local last_generated="$TYPES_OUTPUT_DIR/.last_generated"
            
            if [ ! -f "$last_generated" ] || [ "$api_file" -nt "$last_generated" ]; then
                changed_files+=("$api_file")
            fi
        else
            log WARN "API契約ファイルが見つかりません: $api_file"
        fi
    done
    
    if [ ${#changed_files[@]} -gt 0 ]; then
        log INFO "変更された契約ファイル: ${changed_files[*]}"
        return 0
    else
        return 1
    fi
}

# TypeScript型定義の生成
generate_types() {
    log INFO "TypeScript型定義を生成中..."
    
    if command -v node >/dev/null 2>&1; then
        cd "$SCRIPTS_DIR"
        if node generate_frontend_types.js; then
            log INFO "TypeScript型定義の生成が完了しました"
            touch "$TYPES_OUTPUT_DIR/.last_generated"
            return 0
        else
            log ERROR "TypeScript型定義の生成に失敗しました"
            return 1
        fi
    else
        log ERROR "Node.jsが見つかりません"
        return 1
    fi
}

# Flutter/Dartコードの生成
generate_flutter_code() {
    log INFO "Flutter/Dartコードを生成中..."
    
    if command -v node >/dev/null 2>&1; then
        cd "$SCRIPTS_DIR"
        if node generate_flutter_code.js; then
            log INFO "Flutter/Dartコードの生成が完了しました"
            return 0
        else
            log ERROR "Flutter/Dartコードの生成に失敗しました"
            return 1
        fi
    else
        log ERROR "Node.jsが見つかりません"
        return 1
    fi
}

# OpenAPI仕様書の生成
generate_openapi() {
    log INFO "OpenAPI仕様書を生成中..."
    
    cd "$SCRIPTS_DIR"
    if node generate_openapi.js; then
        log INFO "OpenAPI仕様書の生成が完了しました"
        return 0
    else
        log ERROR "OpenAPI仕様書の生成に失敗しました"
        return 1
    fi
}

# Go-Zeroコードの生成
generate_go_code() {
    log INFO "Go-Zeroコードを生成中..."
    
    for api_file in "${API_FILES[@]}"; do
        if [ -f "$api_file" ]; then
            local service_dir=$(dirname "$api_file")
            cd "$service_dir"
            
            log DEBUG "処理中: $api_file"
            
            if goctl api go -api "$(basename "$api_file")" -dir . --style go_zero; then
                log INFO "Go-Zeroコードの生成が完了しました: $(basename "$api_file")"
            else
                log ERROR "Go-Zeroコードの生成に失敗しました: $(basename "$api_file")"
                return 1
            fi
        fi
    done
    
    return 0
}

# バックエンドのビルドとテスト
build_backend() {
    log INFO "バックエンドのビルドを実行中..."
    
    for api_file in "${API_FILES[@]}"; do
        local service_dir=$(dirname "$api_file")
        if [ -d "$service_dir" ]; then
            cd "$service_dir"
            
            # ビルドの実行
            if go build .; then
                log INFO "バックエンドのビルドが完了しました: $(basename "$service_dir")"
            else
                log ERROR "バックエンドのビルドに失敗しました: $(basename "$service_dir")"
                return 1
            fi
            
            # テストの実行（オプション）
            if [ "$RUN_TESTS" = "true" ]; then
                if go test ./...; then
                    log INFO "テストが成功しました: $(basename "$service_dir")"
                else
                    log ERROR "テストに失敗しました: $(basename "$service_dir")"
                    return 1
                fi
            fi
        fi
    done
    
    return 0
}

# フロントエンドの型チェック
check_frontend_types() {
    log INFO "フロントエンドの型チェックを実行中..."
    
    if [ -d "$FRONTEND_DIR" ]; then
        cd "$FRONTEND_DIR"
        
        if npm run type-check; then
            log INFO "フロントエンドの型チェックが完了しました"
            return 0
        else
            log ERROR "フロントエンドの型チェックに失敗しました"
            return 1
        fi
    else
        log WARN "フロントエンドディレクトリが見つかりません"
        return 0
    fi
}

# 通知の送信
send_notification() {
    local status=$1
    local message=$2
    
    # Slack通知（環境変数が設定されている場合）
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="✅"
        local color="good"
        
        if [ "$status" != "success" ]; then
            emoji="❌"
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji 契約同期: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # メール通知（設定されている場合）
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "Winyx 契約同期通知" "$NOTIFICATION_EMAIL" || true
    fi
}

# Git hooks用の関数
install_git_hooks() {
    log INFO "Git hooksをインストール中..."
    
    local git_dir="$PROJECT_ROOT/.git"
    if [ ! -d "$git_dir" ]; then
        log WARN "Gitリポジトリが見つかりません"
        return 1
    fi
    
    local hooks_dir="$git_dir/hooks"
    local pre_commit_hook="$hooks_dir/pre-commit"
    
    # pre-commitフックの作成
    cat > "$pre_commit_hook" << 'EOF'
#!/bin/bash
# Winyx契約ファイル同期 pre-commitフック

# 契約ファイルが変更されているかチェック
if git diff --cached --name-only | grep -E '\.api$' >/dev/null; then
    echo "🔄 契約ファイルの変更を検出しました。同期を実行中..."
    
    # 同期スクリプトを実行
    if /var/www/winyx/scripts/sync_contracts.sh; then
        # 生成されたファイルをステージングに追加
        git add frontend/src/types/generated/
        git add frontend/src/lib/api/generated/
        git add mobile/flutter_app/lib/generated/
        git add docs/swagger.json
        echo "✅ 契約同期が完了しました"
    else
        echo "❌ 契約同期に失敗しました"
        exit 1
    fi
fi
EOF
    
    chmod +x "$pre_commit_hook"
    log INFO "pre-commitフックをインストールしました"
}

# ファイルウォッチャー
watch_contracts() {
    log INFO "契約ファイルの監視を開始しました..."
    
    if ! command -v inotifywait >/dev/null 2>&1; then
        log ERROR "inotify-toolsがインストールされていません"
        log INFO "インストール: sudo apt-get install inotify-tools"
        exit 1
    fi
    
    local watch_dirs=()
    for api_file in "${API_FILES[@]}"; do
        local dir=$(dirname "$api_file")
        if [ -d "$dir" ]; then
            watch_dirs+=("$dir")
        fi
    done
    
    if [ ${#watch_dirs[@]} -eq 0 ]; then
        log ERROR "監視するディレクトリが見つかりません"
        exit 1
    fi
    
    log INFO "監視対象ディレクトリ: ${watch_dirs[*]}"
    
    while inotifywait -e modify,create,delete,move "${watch_dirs[@]}" --format '%w%f %e' 2>/dev/null; do
        log INFO "ファイル変更を検出しました"
        sleep 2  # 連続する変更をバッファリング
        
        if sync_all; then
            log INFO "自動同期が完了しました"
            send_notification "success" "契約ファイルの自動同期が完了しました"
        else
            log ERROR "自動同期に失敗しました"
            send_notification "error" "契約ファイルの自動同期に失敗しました"
        fi
    done
}

# すべての同期処理を実行
sync_all() {
    log INFO "=============================================="
    log INFO "契約ファイル同期を開始します"
    log INFO "=============================================="
    
    local start_time=$(date +%s)
    local success=true
    
    # 1. 契約ファイルの変更チェック
    if ! check_contract_changes; then
        log INFO "契約ファイルに変更はありません"
        return 0
    fi
    
    # 2. Go-Zeroコードの生成
    if ! generate_go_code; then
        success=false
    fi
    
    # 3. バックエンドのビルド
    if $success && ! build_backend; then
        success=false
    fi
    
    # 4. TypeScript型定義の生成
    if $success && ! generate_types; then
        success=false
    fi
    
    # 5. Flutter/Dartコードの生成
    if $success && ! generate_flutter_code; then
        success=false
    fi
    
    # 6. OpenAPI仕様書の生成
    if $success && ! generate_openapi; then
        success=false
    fi
    
    # 7. フロントエンドの型チェック
    if $success && ! check_frontend_types; then
        success=false
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if $success; then
        log INFO "=============================================="
        log INFO "契約ファイル同期が完了しました (${duration}秒)"
        log INFO "=============================================="
        return 0
    else
        log ERROR "=============================================="
        log ERROR "契約ファイル同期に失敗しました (${duration}秒)"
        log ERROR "=============================================="
        return 1
    fi
}

# 使用法の表示
show_usage() {
    cat << EOF
使用法: $0 [OPTIONS]

OPTIONS:
    --watch         契約ファイルを監視して自動同期
    --install-hooks Git hooksをインストール
    --test         テスト実行を含める
    --help         この使用法を表示

環境変数:
    SLACK_WEBHOOK_URL     Slack通知用WebhookURL
    NOTIFICATION_EMAIL    メール通知先アドレス
    RUN_TESTS            テスト実行フラグ (true/false)

例:
    $0                    # 一度だけ同期実行
    $0 --watch           # ファイル監視モード
    $0 --install-hooks   # Git hooksのインストール
    RUN_TESTS=true $0    # テスト込みで同期実行

EOF
}

# メイン処理
main() {
    case "${1:-}" in
        --watch)
            watch_contracts
            ;;
        --install-hooks)
            install_git_hooks
            ;;
        --test)
            export RUN_TESTS=true
            sync_all
            ;;
        --help)
            show_usage
            ;;
        "")
            sync_all
            ;;
        *)
            log ERROR "不正なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
}

# トラップ設定（Ctrl+Cでクリーンアップ）
trap 'log INFO "同期処理を中断しました"; exit 1' INT TERM

# メイン実行
main "$@"