#!/bin/bash

# Complete Stock Scanner Deployment Script
# This script deploys the entire application with all files and configurations

set -e
echo "🚀 Starting Complete Stock Scanner Deployment..."

# Configuration
APP_NAME="stock-scanner"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="stockscanner"
DOMAIN=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Get domain from user
read -p "Enter your domain name (e.g., scanner.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Get API key from user
read -p "Enter your Polygon.io API key: " POLYGON_KEY
if [ -z "$POLYGON_KEY" ]; then
    print_error "Polygon.io API key is required"
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

print_step "Creating application user and directories..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir $APP_DIR --create-home $SERVICE_USER
fi

mkdir -p $APP_DIR/app
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

print_step "Creating application files..."

# Package.json
cat > $APP_DIR/app/package.json << 'EOF'
{
  "name": "stock-scanner",
  "version": "1.0.0",
  "description": "Professional Stock Scanner Application",
  "type": "module",
  "scripts": {
    "dev": "npm run dev",
    "start": "NODE_ENV=production tsx server/index.ts",
    "build": "vite build"
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

# Create directory structure
mkdir -p $APP_DIR/app/{server,client/src/{components/{ui,pages},hooks,lib},shared}

print_step "Creating server files..."

# Server index.ts
cat > $APP_DIR/app/server/index.ts << 'EOF'
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  log(`Error ${status}: ${message}`);
  res.status(status).json({ message });
});

async function startServer() {
  const server = await registerRoutes(app);
  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
EOF

print_step "You need to copy all your application source files to $APP_DIR/app/"
print_warning "This script creates the basic structure. Please copy your complete source code."

print_step "Creating environment file..."
cat > $APP_DIR/app/.env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
POLYGON_API_KEY=$POLYGON_KEY
SESSION_SECRET=$(openssl rand -base64 32)
API_RATE_LIMIT_MAX=5000
API_RATE_LIMIT_WINDOW=3600000
PYTHON_PATH=/usr/bin/python3
PIP_PATH=/usr/bin/pip3
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/app/.env
chmod 600 $APP_DIR/app/.env

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

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

print_step "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
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
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

print_step "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

print_step "Creating update script..."
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/stock-scanner/app
sudo systemctl stop stock-scanner
sudo -u stockscanner npm install --production
sudo -u stockscanner npm run build
sudo systemctl start stock-scanner
echo "✅ Update complete!"
EOF
chmod +x $APP_DIR/update.sh

print_step "Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

print_step "Testing Nginx configuration..."
nginx -t

print_step "Starting services..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl enable nginx
systemctl start nginx

print_step "Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo ""
print_step "Deployment Summary:"
echo -e "${GREEN}✅ System dependencies installed${NC}"
echo -e "${GREEN}✅ Application user created: $SERVICE_USER${NC}"
echo -e "${GREEN}✅ Directory structure: $APP_DIR${NC}"
echo -e "${GREEN}✅ Environment configured with API key${NC}"
echo -e "${GREEN}✅ Systemd service created${NC}"
echo -e "${GREEN}✅ Nginx configured for $DOMAIN${NC}"
echo -e "${GREEN}✅ SSL certificate installed${NC}"
echo -e "${GREEN}✅ Firewall configured${NC}"
echo ""

print_warning "NEXT STEPS:"
echo "1. Copy ALL your application source files to: $APP_DIR/app/"
echo "2. Install dependencies: cd $APP_DIR/app && sudo -u $SERVICE_USER npm install --production"
echo "3. Build application: sudo -u $SERVICE_USER npm run build"
echo "4. Start service: systemctl start $APP_NAME"
echo ""
echo "5. Verify deployment:"
echo "   systemctl status $APP_NAME"
echo "   curl https://$DOMAIN/api/status"
echo ""
echo -e "${GREEN}Your stock scanner will be available at: https://$DOMAIN${NC}"

print_step "Creating file copy helper script..."
cat > $APP_DIR/copy-files.sh << 'EOF'
#!/bin/bash
# Helper script to copy application files
# Run this after copying your source code

echo "Setting up application files..."
cd /opt/stock-scanner/app

# Install dependencies
sudo -u stockscanner npm install --production

# Build application  
sudo -u stockscanner npm run build

# Start service
sudo systemctl start stock-scanner

# Check status
sudo systemctl status stock-scanner

echo "✅ Application setup complete!"
echo "Check status: systemctl status stock-scanner"
echo "View logs: journalctl -u stock-scanner -f"
EOF
chmod +x $APP_DIR/copy-files.sh

echo ""
print_step "Deployment completed! 🎉"
echo -e "${YELLOW}Run '$APP_DIR/copy-files.sh' after copying your source files.${NC}"
EOF

chmod +x complete-deploy.sh