#!/bin/bash

# Stock Scanner Deployment Script
# Run this on your server to deploy the application

set -e  # Exit on any error

echo "🚀 Starting Stock Scanner Deployment..."

# Configuration
APP_NAME="stock-scanner"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="stockscanner"
NODE_VERSION="20"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_step "Updating system packages..."
apt update && apt upgrade -y

print_step "Installing system dependencies..."
apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential python3 python3-pip ufw

# Install Node.js
print_step "Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Verify installations
node_version=$(node --version)
npm_version=$(npm --version)
print_step "Node.js installed: $node_version, npm: $npm_version"

# Install Python dependencies
print_step "Installing Python dependencies..."
pip3 install requests beautifulsoup4 yfinance

# Create application user
print_step "Creating application user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir $APP_DIR --create-home $SERVICE_USER
    print_step "Created user: $SERVICE_USER"
else
    print_warning "User $SERVICE_USER already exists"
fi

# Create application directory
print_step "Setting up application directory..."
mkdir -p $APP_DIR
chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Clone or copy application files
print_step "Deploying application files..."
# If you have a git repository, uncomment and modify:
# git clone https://github.com/yourusername/stock-scanner.git $APP_DIR/app
# For now, we'll create the directory structure
mkdir -p $APP_DIR/app
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

print_warning "Please copy your application files to $APP_DIR/app"
print_warning "Or modify this script to clone from your git repository"

# Create environment file template
print_step "Creating environment configuration..."
cat > $APP_DIR/app/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# API Keys (REQUIRED - Replace with your actual keys)
POLYGON_API_KEY=your_polygon_api_key_here

# Database Configuration (if using PostgreSQL)
# DATABASE_URL=postgresql://username:password@localhost:5432/stockscanner

# Security (generate random strings)
SESSION_SECRET=$(openssl rand -base64 32)

# Application Settings
API_RATE_LIMIT_MAX=5000
API_RATE_LIMIT_WINDOW=3600000

# Python executable paths
PYTHON_PATH=/usr/bin/python3
PIP_PATH=/usr/bin/pip3
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/app/.env
chmod 600 $APP_DIR/app/.env

print_warning "Please edit $APP_DIR/app/.env and add your API keys!"

# Create systemd service
print_step "Creating systemd service..."
cat > /etc/systemd/system/$APP_NAME.service << EOF
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

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
print_step "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
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

    # WebSocket support
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

    # Static files with long cache
    location /assets/ {
        alias $APP_DIR/app/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_step "Testing Nginx configuration..."
nginx -t

# Configure firewall
print_step "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create deployment script for updates
print_step "Creating update script..."
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/opt/stock-scanner/app"
SERVICE_NAME="stock-scanner"

echo "🔄 Updating Stock Scanner..."

# Stop the service
sudo systemctl stop $SERVICE_NAME

# Backup current version
sudo cp -r $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)

# Update application (modify as needed)
cd $APP_DIR
# git pull origin main  # Uncomment if using git

# Install dependencies
sudo -u stockscanner npm install --production

# Build application
sudo -u stockscanner npm run build

# Start the service
sudo systemctl start $SERVICE_NAME
sudo systemctl status $SERVICE_NAME

echo "✅ Update complete!"
EOF

chmod +x $APP_DIR/update.sh

# Create log rotation
print_step "Setting up log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
/var/log/syslog {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    postrotate
        systemctl reload rsyslog
    endscript
}
EOF

# Reload systemd and start services
print_step "Starting services..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl enable nginx

# Display final instructions
print_step "Deployment completed! Next steps:"
echo ""
echo -e "${YELLOW}1. Copy your application files to: $APP_DIR/app${NC}"
echo -e "${YELLOW}2. Edit environment file: $APP_DIR/app/.env${NC}"
echo -e "${YELLOW}3. Add your Polygon.io API key to the .env file${NC}"
echo -e "${YELLOW}4. Update domain name in: /etc/nginx/sites-available/$APP_NAME${NC}"
echo -e "${YELLOW}5. Install Node.js dependencies:${NC}"
echo "   cd $APP_DIR/app && sudo -u $SERVICE_USER npm install --production"
echo -e "${YELLOW}6. Build the application:${NC}"
echo "   cd $APP_DIR/app && sudo -u $SERVICE_USER npm run build"
echo -e "${YELLOW}7. Start the service:${NC}"
echo "   systemctl start $APP_NAME"
echo -e "${YELLOW}8. Start Nginx:${NC}"
echo "   systemctl start nginx"
echo -e "${YELLOW}9. Get SSL certificate (replace your-domain.com):${NC}"
echo "   certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "   systemctl status $APP_NAME     # Check service status"
echo "   systemctl logs -f $APP_NAME    # View logs"
echo "   $APP_DIR/update.sh            # Update application"
echo "   nginx -t                      # Test Nginx config"
echo ""
echo -e "${GREEN}Application will be available at: http://your-domain.com${NC}"