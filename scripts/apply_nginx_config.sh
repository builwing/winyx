#!/bin/bash
# Nginx設定適用スクリプト
# 注意: このスクリプトはsudo権限で実行する必要があります

set -e

echo "=== Winyx Nginx設定適用スクリプト ==="
echo ""

# 設定ファイルのパス
CONFIG_SOURCE="/var/www/winyx/nginx_user_service_config.conf"
UPSTREAM_SOURCE="/var/www/winyx/nginx_upstream.conf"
CONFIG_DEST="/etc/nginx/sites-available/winyx"
CONFIG_LINK="/etc/nginx/sites-enabled/winyx"
UPSTREAM_DEST="/etc/nginx/conf.d/winyx_upstream.conf"

# 1. 設定ファイルの存在確認
if [ ! -f "$CONFIG_SOURCE" ]; then
    echo "エラー: 設定ファイルが見つかりません: $CONFIG_SOURCE"
    exit 1
fi

if [ ! -f "$UPSTREAM_SOURCE" ]; then
    echo "エラー: Upstream設定ファイルが見つかりません: $UPSTREAM_SOURCE"
    exit 1
fi

echo "1. Upstream設定をコピー..."
sudo cp "$UPSTREAM_SOURCE" "$UPSTREAM_DEST"
echo "   ✓ Upstream設定を $UPSTREAM_DEST にコピー完了"

# 2. 既存設定のバックアップ
if [ -f "$CONFIG_DEST" ]; then
    BACKUP_FILE="${CONFIG_DEST}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "2. 既存設定をバックアップ: $BACKUP_FILE"
    sudo cp "$CONFIG_DEST" "$BACKUP_FILE"
else
    echo "2. 新規設定ファイルを作成します"
fi

if [ -f "$UPSTREAM_DEST" ]; then
    UPSTREAM_BACKUP="${UPSTREAM_DEST}.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$UPSTREAM_DEST" "$UPSTREAM_BACKUP"
fi

# 3. 設定ファイルをコピー
echo "3. 設定ファイルを適用..."
sudo cp "$CONFIG_SOURCE" "$CONFIG_DEST"
echo "   ✓ サーバー設定を $CONFIG_DEST にコピー完了"

# 4. シンボリックリンクの作成/更新
if [ -L "$CONFIG_LINK" ]; then
    echo "4. シンボリックリンクは既に存在します"
else
    echo "4. シンボリックリンクを作成..."
    sudo ln -sf "$CONFIG_DEST" "$CONFIG_LINK"
    echo "   ✓ シンボリックリンク作成完了"
fi

# 5. Nginx設定の最終確認
echo "5. Nginx設定の最終確認..."
if sudo nginx -t; then
    echo "   ✓ 設定は有効です"
else
    echo "   ✗ 設定にエラーがあります"
    if [ -n "$BACKUP_FILE" ]; then
        echo "   バックアップから復元します..."
        sudo cp "$BACKUP_FILE" "$CONFIG_DEST"
        if [ -n "$UPSTREAM_BACKUP" ]; then
            sudo cp "$UPSTREAM_BACKUP" "$UPSTREAM_DEST"
        fi
    fi
    exit 1
fi

# 6. Nginxのリロード
echo "6. Nginxをリロード..."
if sudo systemctl reload nginx; then
    echo "   ✓ Nginxのリロード完了"
else
    echo "   ✗ Nginxのリロードに失敗しました"
    echo "   手動でサービスを確認してください:"
    echo "   sudo systemctl status nginx"
    exit 1
fi

echo ""
echo "=== 設定適用完了 ==="
echo ""
echo "適用された設定:"
echo "  - UserService: http://127.0.0.1:8889"
echo "  - TestAPI: http://127.0.0.1:8888"
echo "  - Frontend: http://winyx.jp"
echo "  - API Gateway: http://api.winyx.jp"
echo ""
echo "次のステップ:"
echo "  1. UserServiceを起動: sudo systemctl start winyx-user-service"
echo "  2. 動作確認: curl http://api.winyx.jp/api/v1/users/health"
echo ""