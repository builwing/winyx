#!/bin/bash
source /var/www/winyx/.env

cat > /tmp/fix_auth.sql <<EOF
SET PASSWORD FOR '${DB_USERNAME}'@'localhost' = PASSWORD('${DB_PASSWORD}');
SET PASSWORD FOR '${DB_USERNAME}'@'${DB_HOST}' = PASSWORD('${DB_PASSWORD}');
FLUSH PRIVILEGES;
EOF

sudo mysql < /tmp/fix_auth.sql
mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
rm -f /tmp/fix_auth.sql
