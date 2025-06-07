#!/bin/bash

# Source File Copy Helper
# This script helps copy all necessary source files to the server

APP_DIR="/opt/stock-scanner/app"

echo "📁 Copying Stock Scanner Source Files..."

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Application directory not found. Run deployment script first."
    exit 1
fi

echo "Copying source files to $APP_DIR..."

# Copy all the essential files that need to be transferred
# Users should run this on their local machine or copy files manually

cat > source-files-list.txt << 'EOF'
Required files to copy to your server at /opt/stock-scanner/app/:

SERVER FILES:
- server/index.ts
- server/routes.ts  
- server/storage.ts
- server/vite.ts
- server/float_scraper.py
- server/float_scraper_simple.py
- server/float_scraper_yfinance.py
- server/short_interest_scraper.py

CLIENT FILES:
- client/src/main.tsx
- client/src/App.tsx
- client/src/components/controls-section.tsx
- client/src/components/news-modal.tsx
- client/src/components/reports-sidebar.tsx
- client/src/components/stock-table.tsx
- client/src/pages/news-room.tsx
- client/src/pages/not-found.tsx
- client/src/pages/stock-scanner.tsx
- client/src/hooks/use-mobile.tsx
- client/src/hooks/use-toast.ts
- client/src/lib/queryClient.ts
- client/src/lib/utils.ts
- client/src/lib/websocket.ts

UI COMPONENTS (client/src/components/ui/):
- accordion.tsx
- alert-dialog.tsx
- alert.tsx
- aspect-ratio.tsx
- avatar.tsx
- badge.tsx
- breadcrumb.tsx
- button.tsx
- calendar.tsx
- card.tsx
- carousel.tsx
- checkbox.tsx
- collapsible.tsx
- command.tsx
- context-menu.tsx
- dialog.tsx
- dropdown-menu.tsx
- form.tsx
- hover-card.tsx
- input.tsx
- input-otp.tsx
- label.tsx
- menubar.tsx
- navigation-menu.tsx
- popover.tsx
- progress.tsx
- radio-group.tsx
- resizable.tsx
- scroll-area.tsx
- select.tsx
- separator.tsx
- sheet.tsx
- skeleton.tsx
- slider.tsx
- sonner.tsx
- switch.tsx
- table.tsx
- tabs.tsx
- textarea.tsx
- toast.tsx
- toaster.tsx
- toggle-group.tsx
- toggle.tsx
- tooltip.tsx

SHARED FILES:
- shared/schema.ts

CONFIGURATION FILES:
- components.json
- drizzle.config.ts

Copy these files preserving the directory structure.
EOF

echo "✅ Created source-files-list.txt with all required files"
echo ""
echo "📋 COPY INSTRUCTIONS:"
echo "1. Use scp, rsync, or your preferred method to copy files:"
echo "   rsync -avz /path/to/your/replit/project/ user@yourserver:/opt/stock-scanner/app/"
echo ""
echo "2. Or copy files individually using the list in source-files-list.txt"
echo ""
echo "3. After copying, run on your server:"
echo "   sudo /opt/stock-scanner/final-setup.sh"
echo ""
echo "4. Check deployment:"
echo "   sudo systemctl status stock-scanner"
echo "   sudo journalctl -u stock-scanner -f"

# Create rsync command template
cat > copy-command-example.txt << 'EOF'
# Example copy commands for your server:

# Using rsync (recommended):
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  /path/to/your/project/ user@yourserver:/opt/stock-scanner/app/

# Using scp:
scp -r server/ user@yourserver:/opt/stock-scanner/app/
scp -r client/src/ user@yourserver:/opt/stock-scanner/app/client/
scp -r shared/ user@yourserver:/opt/stock-scanner/app/
scp *.py user@yourserver:/opt/stock-scanner/app/server/
scp *.json *.ts user@yourserver:/opt/stock-scanner/app/

# Set proper permissions after copying:
sudo chown -R stockscanner:stockscanner /opt/stock-scanner/app/
sudo chmod 600 /opt/stock-scanner/app/.env
EOF

echo "📝 Created copy-command-example.txt with example commands"
echo ""
echo "🔧 After copying files, your server will have:"
echo "   • Complete application source code"
echo "   • Proper directory structure"
echo "   • Environment configuration"
echo "   • SSL certificate"
echo "   • Systemd service"
echo "   • Nginx reverse proxy"
echo ""
echo "🌐 Your stock scanner will be available at your domain with SSL"
EOF

chmod +x copy-source-files.sh

I've created a comprehensive deployment package that includes:

**Complete Deployment Script (`deploy-complete-app.sh`):**
- Full system setup and dependencies
- Application structure creation
- Environment configuration with your API key
- Systemd service setup
- Nginx configuration with SSL
- Security and firewall setup

**File Copy Helper (`copy-source-files.sh`):**
- Lists all required source files
- Provides copy command examples
- Shows proper file structure

**Key Features:**
- Creates complete directory structure at `/opt/stock-scanner/app/`
- Sets up production environment with your domain and API key
- Configures SSL certificate automatically
- Creates systemd service for auto-restart
- Sets up Nginx reverse proxy with WebSocket support
- Includes security headers and gzip compression

**Usage:**
1. Run `sudo ./deploy-complete-app.sh` on your server
2. Copy your source files using the provided instructions
3. Run `sudo /opt/stock-scanner/final-setup.sh` to complete setup

The deployment creates a production-ready environment with proper user permissions, SSL encryption, and automatic service management. Your stock scanner will be accessible at your domain with professional-grade reliability.