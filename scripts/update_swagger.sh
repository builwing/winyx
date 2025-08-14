#!/bin/bash
# Swagger仕様書更新スクリプト

cd /var/www/winyx/backend/test_api

# 最新のAPI定義からSwagger仕様書を生成
goctl-swagger -f test_api.api -o /var/www/winyx/docs/swagger.json

# 権限設定
sudo chown www-data:www-data /var/www/winyx/docs/swagger.json
sudo chmod 644 /var/www/winyx/docs/swagger.json

echo "Swagger documentation updated: $(date)"

