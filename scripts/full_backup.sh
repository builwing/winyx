#!/bin/bash
# Full System Backup Script

BACKUP_ROOT="/var/backups/winyx"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"

# ディレクトリ作成
mkdir -p ${BACKUP_DIR}/{database,files,config}

# 1. データベースバックアップ
source /var/www/winyx/.env
mysqldump -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" \
  --all-databases --single-transaction \
  | gzip > ${BACKUP_DIR}/database/all_databases.sql.gz

# 2. アプリケーションファイル
tar czf ${BACKUP_DIR}/files/app_files.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /var/www/winyx

# 3. 設定ファイル
tar czf ${BACKUP_DIR}/config/system_config.tar.gz \
  /etc/nginx \
  /etc/systemd/system/winyx-* \
  /etc/redis \
  /etc/mysql

# 4. 環境変数（暗号化）
gpg --symmetric --cipher-algo AES256 \
  /var/www/winyx/.env \
  -o ${BACKUP_DIR}/config/env.gpg

# 5. 古いバックアップ削除（30日以上）
find ${BACKUP_ROOT} -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: ${BACKUP_DIR}"

