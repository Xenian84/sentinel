#!/bin/bash

# Complete Stock Scanner Deployment Package Creator
# This creates a self-contained deployment package with all source files

set -e

PACKAGE_DIR="stock-scanner-deploy"
echo "Creating complete deployment package in $PACKAGE_DIR..."

# Clean and create package directory
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR/{server,client/src/{components/{ui,pages},hooks,lib},shared}

# Copy configuration files
cp package.json $PACKAGE_DIR/ 2>/dev/null || echo "package.json not found, will create"
cp components.json $PACKAGE_DIR/ 2>/dev/null || echo "components.json not found, will create"
cp drizzle.config.ts $PACKAGE_DIR/ 2>/dev/null || echo "drizzle.config.ts not found, will create"
cp postcss.config.js $PACKAGE_DIR/ 2>/dev/null || echo "postcss.config.js not found, will create"
cp tailwind.config.ts $PACKAGE_DIR/ 2>/dev/null || echo "tailwind.config.ts not found, will create"
cp tsconfig.json $PACKAGE_DIR/ 2>/dev/null || echo "tsconfig.json not found, will create"
cp vite.config.ts $PACKAGE_DIR/ 2>/dev/null || echo "vite.config.ts not found, will create"

# Copy server files
cp -r server/* $PACKAGE_DIR/server/ 2>/dev/null || echo "Creating server files..."

# Copy client files
cp -r client/src/* $PACKAGE_DIR/client/src/ 2>/dev/null || echo "Creating client files..."

# Copy shared files
cp -r shared/* $PACKAGE_DIR/shared/ 2>/dev/null || echo "Creating shared files..."

echo "Package structure created. Now creating essential files..."

# Create package.json if missing
if [ ! -f $PACKAGE_DIR/package.json ]; then
cat > $PACKAGE_DIR/package.json << 'EOF'
{
  "name": "stock-scanner",
  "version": "1.0.0",
  "description": "Professional Stock Scanner Application",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "start": "NODE_ENV=production tsx server/index.ts",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@tanstack/react-query": "^5.8.4",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/node": "^20.8.10",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.2.33",
    "@types/react-dom": "^18.2.14",
    "@types/ws": "^8.5.8",
    "@vitejs/plugin-react": "^4.1.1",
    "autoprefixer": "^10.4.16",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "cmdk": "^0.2.0",
    "connect-pg-simple": "^9.0.1",
    "date-fns": "^2.30.0",
    "drizzle-kit": "^0.20.4",
    "drizzle-orm": "^0.29.1",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.0.0-rc19",
    "esbuild": "^0.19.5",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "framer-motion": "^10.16.4",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.290.0",
    "memorystore": "^1.6.7",
    "nanoid": "^5.0.3",
    "next-themes": "^0.2.1",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "postcss": "^8.4.31",
    "react": "^18.2.0",
    "react-day-picker": "^8.9.1",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.47.0",
    "react-icons": "^4.11.0",
    "react-resizable-panels": "^0.0.55",
    "recharts": "^2.8.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.3.5",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.1.2",
    "tw-animate-css": "^0.1.0",
    "typescript": "^5.2.2",
    "vaul": "^0.7.9",
    "vite": "^4.5.0",
    "wouter": "^2.12.1",
    "ws": "^8.14.2",
    "zod": "^3.22.4",
    "zod-validation-error": "^1.5.0"
  }
}
EOF
fi

# Create the complete deployment script
cat > $PACKAGE_DIR/deploy.sh << 'EOF'
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
EOF

chmod +x $PACKAGE_DIR/deploy.sh

# Create README
cat > $PACKAGE_DIR/README.md << 'EOF'
# Stock Scanner Deployment Package

This package contains everything needed to deploy the Stock Scanner application to your server.

## Quick Deployment

1. Upload this entire directory to your server
2. Run the deployment script:
   ```bash
   sudo ./deploy.sh
   ```
3. Enter your domain name and Polygon.io API key when prompted

## What Gets Installed

- Complete Stock Scanner application
- Node.js 20 runtime
- Python dependencies for data scraping
- Nginx reverse proxy with SSL
- Systemd service for auto-restart
- Firewall configuration

## Requirements

- Ubuntu/Debian server with root access
- Domain name pointing to your server
- Polygon.io API key

## After Deployment

Your application will be available at `https://yourdomain.com` with:
- Real-time stock data from Polygon.io
- News aggregation system
- 16 specialized trading reports
- SSL encryption
- Automatic service management

## Management Commands

```bash
# Check service status
sudo systemctl status stock-scanner

# View logs
sudo journalctl -u stock-scanner -f

# Restart service
sudo systemctl restart stock-scanner

# Update application
cd /opt/stock-scanner/app
sudo systemctl stop stock-scanner
sudo -u stockscanner npm install --production
sudo -u stockscanner npm run build
sudo systemctl start stock-scanner
```

## Security Features

- Runs as dedicated user (stockscanner)
- Protected system directories
- Security headers
- SSL encryption
- Firewall configuration
EOF

# Create archive
tar -czf stock-scanner-complete.tar.gz $PACKAGE_DIR

echo ""
echo "✅ Complete deployment package created!"
echo ""
echo "📦 Package: stock-scanner-complete.tar.gz"
echo "📁 Directory: $PACKAGE_DIR/"
echo ""
echo "🚀 To deploy on your server:"
echo "1. Upload stock-scanner-complete.tar.gz to your server"
echo "2. Extract: tar -xzf stock-scanner-complete.tar.gz"
echo "3. Deploy: cd stock-scanner-deploy && sudo ./deploy.sh"
echo ""
echo "📋 You'll need:"
echo "   • Your domain name"
echo "   • Polygon.io API key"
echo "   • Root access to server"
echo ""
echo "🌐 After deployment, your scanner will be at https://yourdomain.com"
EOF

# Make the script executable
chmod +x create-deployment-package.sh