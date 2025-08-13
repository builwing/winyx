#!/bin/bash
# Fix systemd service permissions for Go cache

# Create www-data specific directories
sudo mkdir -p /var/cache/winyx/go
sudo mkdir -p /var/lib/winyx/go
sudo chown -R www-data:www-data /var/cache/winyx
sudo chown -R www-data:www-data /var/lib/winyx

# Update systemd service file with proper paths
sudo tee /etc/systemd/system/winyx-test-api.service <<'EOF'
[Unit]
Description=Winyx Test API Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/winyx/backend/test_api
Environment=GOPATH=/var/lib/winyx/go
Environment=GOCACHE=/var/cache/winyx/go
Environment=GOPROXY=https://proxy.golang.org
EnvironmentFile=/var/www/winyx/.env
ExecStartPre=/bin/bash -c '/var/www/winyx/backend/test_api/load_env.sh'
ExecStart=/usr/local/go/bin/go run testapi.go -f etc/test_api-api.yaml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=winyx-test-api

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo "Systemd service updated with proper permissions"
echo "Run: sudo systemctl restart winyx-test-api"