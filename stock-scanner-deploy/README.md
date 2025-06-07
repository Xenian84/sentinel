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
