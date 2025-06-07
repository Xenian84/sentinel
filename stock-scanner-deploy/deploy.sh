#!/bin/bash

# Stock Scanner Production Deployment Script
set -e

APP_NAME="stock-scanner"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="stockscanner"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

read -p "Enter your domain name: " DOMAIN
read -p "Enter your Polygon.io API key: " POLYGON_KEY

if [ -z "$DOMAIN" ] || [ -z "$POLYGON_KEY" ]; then
    print_error "Domain and API key are required"
    exit 1
fi

print_step "Installing system dependencies..."
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential python3 python3-pip ufw

print_step "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

print_step "Installing Python dependencies..."
pip3 install requests beautifulsoup4 yfinance

print_step "Creating application user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir $APP_DIR --create-home $SERVICE_USER
fi

print_step "Setting up application..."
mkdir -p $APP_DIR
cp -r . $APP_DIR/app/
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

print_step "Creating environment file..."
cat > $APP_DIR/app/.env << ENVEOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
POLYGON_API_KEY=$POLYGON_KEY
SESSION_SECRET=$(openssl rand -base64 32)
API_RATE_LIMIT_MAX=5000
API_RATE_LIMIT_WINDOW=3600000
PYTHON_PATH=/usr/bin/python3
PIP_PATH=/usr/bin/pip3
ENVEOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/app/.env
chmod 600 $APP_DIR/app/.env

print_step "Installing dependencies..."
cd $APP_DIR/app
sudo -u $SERVICE_USER npm install --production

print_step "Building application..."
sudo -u $SERVICE_USER npm run build

print_step "Creating systemd service..."
cat > /etc/systemd/system/$APP_NAME.service << SERVICEEOF
[Unit]
Description=Stock Scanner Application
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/app
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/app/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
SERVICEEOF

print_step "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /assets/ {
        alias $APP_DIR/app/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

print_step "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

print_step "Starting services..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl enable nginx
systemctl start $APP_NAME
systemctl start nginx

print_step "Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

print_step "Deployment completed!"
echo -e "${GREEN}✅ Stock Scanner deployed at: https://$DOMAIN${NC}"
echo ""
echo "Service status: systemctl status $APP_NAME"
echo "View logs: journalctl -u $APP_NAME -f"
echo "Update app: systemctl restart $APP_NAME"
