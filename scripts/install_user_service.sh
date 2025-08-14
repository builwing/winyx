#!/bin/bash
# UserService systemdサービスインストールスクリプト

set -e

echo "=== UserService systemdサービスインストール ==="
echo ""

# サービスファイルのパス
SERVICE_SOURCE="/var/www/winyx/winyx-user-service.service"
SERVICE_DEST="/etc/systemd/system/winyx-user-service.service"

# バイナリの存在確認
if [ ! -f "/var/www/winyx/backend/user_service/user_service" ]; then
    echo "エラー: UserServiceバイナリが見つかりません"
    echo "ビルドしてください: cd /var/www/winyx/backend/user_service && go build -o user_service userservice.go"
    exit 1
fi

# 設定ファイルの存在確認
if [ ! -f "/var/www/winyx/backend/user_service/etc/user_service-api.yaml" ]; then
    echo "エラー: 設定ファイルが見つかりません"
    echo "設定ファイルを作成してください: /var/www/winyx/backend/user_service/etc/user_service-api.yaml"
    exit 1
else
    echo "✓ 設定ファイルを確認しました"
fi

# systemdサービスファイルをコピー
echo "1. systemdサービスファイルをインストール..."
sudo cp "$SERVICE_SOURCE" "$SERVICE_DEST"
echo "   ✓ サービスファイルをインストールしました"

# 権限設定
echo "2. 権限を設定..."
sudo chown -R www-data:www-data /var/www/winyx/backend/user_service
sudo chmod +x /var/www/winyx/backend/user_service/user_service
echo "   ✓ 権限設定完了"

# systemdをリロード
echo "3. systemdをリロード..."
sudo systemctl daemon-reload
echo "   ✓ systemdリロード完了"

# サービスを有効化
echo "4. サービスを有効化..."
sudo systemctl enable winyx-user-service
echo "   ✓ サービス有効化完了"

echo ""
echo "=== インストール完了 ==="
echo ""
echo "次のステップ:"
echo "  1. 設定ファイルを編集: vim /var/www/winyx/backend/user_service/etc/user_service-api.yaml"
echo "  2. サービスを起動: sudo systemctl start winyx-user-service"
echo "  3. ステータス確認: sudo systemctl status winyx-user-service"
echo "  4. ログ確認: sudo journalctl -u winyx-user-service -f"
echo ""