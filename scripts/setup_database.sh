#!/bin/bash
# Setup database using credentials from .env file

# Load .env file
if [ -f "/var/www/winyx/.env" ]; then
    source /var/www/winyx/.env
else
    echo "Error: .env file not found at /var/www/winyx/.env"
    exit 1
fi

echo "Creating database and user..."

# Create SQL commands
cat > /tmp/setup_winyx_db.sql <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_DATABASE} DEFAULT CHARACTER SET ${DB_CHARSET} DEFAULT COLLATE ${DB_CHARSET}_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* TO '${DB_USERNAME}'@'localhost';
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_DATABASE}.* TO '${DB_USERNAME}'@'${DB_HOST}';
FLUSH PRIVILEGES;
EOF

# Execute with root credentials
if [ -n "${MYSQL_ROOT_PASSWORD}" ]; then
    mysql -u ${MYSQL_ROOT_USER} -p"${MYSQL_ROOT_PASSWORD}" < /tmp/setup_winyx_db.sql
    if [ $? -eq 0 ]; then
        echo "Database and user created successfully."
        
        # Apply DDL
        echo "Applying DDL schema..."
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
        if [ $? -eq 0 ]; then
            echo "DDL applied successfully."
            
            # Show created tables
            echo "Created tables:"
            mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW TABLES;"
        else
            echo "Error: Failed to apply DDL."
        fi
    else
        echo "Error: Failed to create database. Please check root credentials."
    fi
else
    echo "Using sudo for database creation..."
    sudo mysql < /tmp/setup_winyx_db.sql
    if [ $? -eq 0 ]; then
        echo "Database and user created successfully."
        
        # Apply DDL
        echo "Applying DDL schema..."
        mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} < /var/www/winyx/contracts/api/schema.sql
        if [ $? -eq 0 ]; then
            echo "DDL applied successfully."
            
            # Show created tables
            echo "Created tables:"
            mysql -h ${DB_HOST} -u ${DB_USERNAME} -p"${DB_PASSWORD}" -D ${DB_DATABASE} -e "SHOW TABLES;"
        else
            echo "Error: Failed to apply DDL."
        fi
    else
        echo "Error: Failed to create database."
    fi
fi

# Clean up
rm -f /tmp/setup_winyx_db.sql

echo "Database setup complete."