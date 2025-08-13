#!/bin/bash
# Load environment variables from .env file and create YAML config

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    export $(grep -v '^#' /var/www/winyx/.env | xargs)
fi

# Create config file from environment variables
cat > /var/www/winyx/backend/test_api/etc/test_api-api.yaml <<EOF
Name: ${APP_NAME:-test_api}
Host: ${APP_HOST:-0.0.0.0}
Port: ${APP_PORT:-8888}

Mysql:
  DataSource: "${DB_USERNAME}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_DATABASE}?charset=${DB_CHARSET}&parseTime=true&loc=${DB_TIMEZONE/\//%2F}"

Cache:
  - Host: ${REDIS_HOST}:${REDIS_PORT}
    Pass: "${REDIS_PASSWORD}"
    Type: node

Auth:
  AccessSecret: "${JWT_SECRET}"
  AccessExpire: ${JWT_EXPIRE:-86400}
EOF

echo "Configuration file created at etc/test_api-api.yaml"
