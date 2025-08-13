#!/bin/bash
# Setup database using credentials from .env file

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
else
    echo "Error: .env file not found"
    exit 1
fi

echo "Creating database and user..."

# Create SQL commands
cat > /tmp/setup_winyx_db.sql <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_DATABASE} 
  DEFAULT CHARACTER SET ${DB_CHARSET} 
  DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;
  
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' 
  IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* 
  TO '${DB_USERNAME}'@'localhost';
  
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'${DB_HOST}' 
  IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* 
  TO '${DB_USERNAME}'@'${DB_HOST}';
  
FLUSH PRIVILEGES;
EOF

# Execute with sudo
sudo mysql < /tmp/setup_winyx_db.sql

# Clean up
rm -f /tmp/setup_winyx_db.sql
echo "Database setup complete."
