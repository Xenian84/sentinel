# Sentinel - Professional Stock Scanner

A comprehensive real-time stock scanner that replicates "The Obvious Stocks" interface with advanced market analysis capabilities.

## Features

### Real-Time Market Data
- **Live stock gap detection** using Polygon.io API
- **5+ active stocks** with significant price movements (3%+ gaps)
- **Authentic volume analysis** with relative volume calculations
- **WebSocket updates** for real-time data streaming

### Advanced Analytics
- **Float data integration** via yfinance scraping
- **Short interest tracking** with ratio calculations
- **News aggregation system** with stock-specific filtering
- **16 specialized trading reports** for comprehensive analysis

### Current Live Data
- **KLTO**: +170% gap, 953K volume, 19.87M float, 10.25% short interest
- **KNW**: +123% gap, 281K volume, 6.69M float, 6.58% short interest
- **ELEV**: +38% gap, 1.02M volume, 43.51M float, 9.14% short interest
- **ELAB**: +28% gap, 70K volume, 1.26M float, 6.49% short interest
- **SVRE**: +25% gap, 184K volume, 739.77M float, 12.07% short interest

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Data Sources**: Polygon.io API, yfinance, Finviz
- **Real-time**: WebSocket connections
- **UI Framework**: Radix UI components with dark/light themes

## Quick Start

### Development Setup
```bash
git clone https://github.com/Xenian84/sentinel.git
cd sentinel
npm install
```

### Environment Configuration
Create `.env` file:
```env
POLYGON_API_KEY=your_polygon_api_key_here
NODE_ENV=development
PORT=5000
```

### Run Application
```bash
npm run dev
```

Access at `http://localhost:5000`

## Production Deployment

### Automated Deployment
```bash
# Download deployment package
wget https://github.com/Xenian84/sentinel/releases/latest/download/stock-scanner-complete.tar.gz

# Extract and deploy
tar -xzf stock-scanner-complete.tar.gz
cd stock-scanner-deploy
sudo ./deploy.sh
```

### Manual Deployment
Follow instructions in `deployment-commands.txt` for step-by-step server setup.

## API Endpoints

- `GET /api/stocks/gappers` - Real-time gap stocks
- `GET /api/news/all` - Aggregated news feed
- `GET /api/status` - API status and rate limits
- `GET /api/market/status` - Market open/close status
- `WS /ws` - WebSocket for live updates

## Data Sources

### Polygon.io API
- Real-time market gainers/losers
- Minute-by-minute volume data
- News aggregation for stock events

### Python Scrapers
- **Float data**: yfinance library for shares outstanding
- **Short interest**: Multi-source scraping for accurate metrics

## Project Structure

```
sentinel/
├── server/                 # Backend API
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Data management
│   └── *.py              # Python data scrapers
├── client/src/            # React frontend
│   ├── components/        # UI components
│   ├── pages/            # Application pages
│   └── lib/              # Utilities
├── shared/               # Shared types and schemas
└── deployment/           # Production deployment files
```

## Key Components

### Stock Table
- **Real-time price updates** with color-coded gaps
- **Volume analysis** showing relative volume ratios
- **News indicators** with direct links to relevant articles
- **Float and short data** for supply/demand analysis

### News Room
- **Stock-specific filtering** removes general market noise
- **Real-time aggregation** from multiple financial sources
- **Categorized articles** with priority sorting

### Controls Section
- **API status monitoring** with rate limit tracking
- **Market status** showing trading hours
- **Live statistics** for total stocks and gap distribution

## Configuration

### Required Environment Variables
```env
POLYGON_API_KEY=          # Get from polygon.io
NODE_ENV=production       # Environment mode
PORT=5000                # Server port
HOST=0.0.0.0             # Server host
```

### Optional Configuration
```env
API_RATE_LIMIT_MAX=5000          # API rate limit
API_RATE_LIMIT_WINDOW=3600000    # Rate limit window
SESSION_SECRET=                  # Session encryption key
```

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting

## Deployment Features

### Production Ready
- **SSL certificate** automation via Let's Encrypt
- **Nginx reverse proxy** with security headers
- **Systemd service** for automatic restart
- **Firewall configuration** for security

### Monitoring
- **Service status** via systemd
- **Application logs** through journalctl
- **API rate limiting** with status tracking

## Support

For deployment assistance or technical issues, refer to:
- `deployment-commands.txt` - Manual deployment guide
- `COMPLETE-DEPLOYMENT-PACKAGE.txt` - Comprehensive setup
- GitHub Issues for bug reports and feature requests

## License

MIT License - See LICENSE file for details

---

**Live Application**: Access your deployed scanner at your configured domain with SSL encryption and professional-grade reliability.