#!/bin/bash
# Fix MySQL authentication for winyx_app user

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
else
    echo "Error: .env file not found at /var/www/winyx/.env"
    exit 1
fi

echo "Fixing MySQL authentication for ${DB_USERNAME}..."

# Create SQL commands to fix authentication
cat > /tmp/fix_auth.sql <<EOF
-- Fix authentication for MariaDB
SET PASSWORD FOR '${DB_USERNAME}'@'localhost' = PASSWORD('${DB_PASSWORD}');
SET PASSWORD FOR '${DB_USERNAME}'@'${DB_HOST}' = PASSWORD('${DB_PASSWORD}');
FLUSH PRIVILEGES;

-- Verify user privileges
SHOW GRANTS FOR '${DB_USERNAME}'@'localhost';
SHOW GRANTS FOR '${DB_USERNAME}'@'${DB_HOST}';
EOF

# Execute with sudo
echo "Please enter your sudo password to fix MySQL authentication:"
sudo mysql < /tmp/fix_auth.sql

if [ $? -eq 0 ]; then
    echo "Authentication fixed successfully."
    
    # Now apply DDL
    echo "Applying DDL schema..."
    mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
    
    if [ $? -eq 0 ]; then
        echo "DDL applied successfully."
        
        # Show created tables
        echo "Created tables:"
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW TABLES;"
        
        # Show table structure
        echo ""
        echo "Table structures:"
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW CREATE TABLE users\G"
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW CREATE TABLE user_profiles\G"
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW CREATE TABLE sessions\G"
    else
        echo "Error: Failed to apply DDL."
    fi
else
    echo "Error: Failed to fix authentication."
fi

# Clean up
rm -f /tmp/fix_auth.sql

echo "Done."