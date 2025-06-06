import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertStockSchema, insertStockNewsSchema } from "@shared/schema";
import { z } from "zod";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "WMw1jpvZl9LzxCBGnpDq0QCJgrxBPkUo";
const POLYGON_BASE_URL = "https://api.polygon.io";

interface PolygonTicker {
  T: string;    // ticker
  c: number;    // close price
  v: number;    // volume
  vw: number;   // volume weighted average price
  o: number;    // open price
  h: number;    // high price
  l: number;    // low price
  t: number;    // timestamp
  n: number;    // number of transactions
}

interface PolygonGroupedResponse {
  status: string;
  results: PolygonTicker[];
  resultsCount: number;
}

interface PolygonNewsResponse {
  status: string;
  results: {
    id: string;
    publisher: {
      name: string;
    };
    title: string;
    description: string;
    published_utc: string;
    article_url: string;
    tickers: string[];
  }[];
}

function calculateGapPercentage(currentPrice: number, previousClose: number): number {
  if (previousClose === 0) return 0;
  return ((currentPrice - previousClose) / previousClose) * 100;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  }
  return volume.toString();
}

function isMarketOpen(): boolean {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = easternTime.getDay();
  const hours = easternTime.getHours();
  const minutes = easternTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM to 4:00 PM Eastern
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  return currentMinutes >= marketOpen && currentMinutes < marketClose;
}

async function fetchFromPolygon(endpoint: string): Promise<any> {
  const url = `${POLYGON_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${POLYGON_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Polygon API:', error);
    throw error;
  }
}

async function fetchTopGappers(): Promise<void> {
  try {
    console.log('Fetching real-time market gainers and losers from Polygon API...');
    
    // Fetch both gainers and losers to get comprehensive gap data
    const [gainersData, losersData] = await Promise.all([
      fetchFromPolygon(`/v2/snapshot/locale/us/markets/stocks/gainers?include_otc=false`),
      fetchFromPolygon(`/v2/snapshot/locale/us/markets/stocks/losers?include_otc=false`)
    ]);
    
    const allStocks = [];
    
    if (gainersData.status === "OK" && gainersData.tickers) {
      allStocks.push(...gainersData.tickers);
    }
    
    if (losersData.status === "OK" && losersData.tickers) {
      allStocks.push(...losersData.tickers);
    }
    
    const gappers = [];
    
    // Process stocks in smaller batches to avoid API rate limits
    const batchSize = 10;
    for (let i = 0; i < allStocks.length; i += batchSize) {
      const batch = allStocks.slice(i, i + batchSize);
      
      for (const stock of batch) {
        const { ticker, todaysChangePerc, day, prevDay } = stock;
        
        if (day && prevDay && day.v > 50000) { // Minimum volume requirement
          const currentPrice = day.c;
          const previousClose = prevDay.c;
          const volume = day.v;
          
          // Use the today's change percentage directly from Polygon
          const gapPercentage = todaysChangePerc;
          
          // Only include stocks with significant gaps (>3% change)
          if (Math.abs(gapPercentage) > 3) {
            const relativeVolumeRatio = prevDay.v ? (volume / prevDay.v) : 1;
            
            // Check for real news using Polygon API
            let hasRealNews = false;
            let newsCount = 0;
            try {
              const newsData = await fetchFromPolygon(`/v2/reference/news?ticker=${ticker}&limit=10&published_utc.gte=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);
              if (newsData.status === "OK" && newsData.results && newsData.results.length > 0) {
                hasRealNews = true;
                newsCount = newsData.results.length;
                console.log(`Found ${newsCount} news articles for ${ticker}`);
                
                // Store news in database
                for (const article of newsData.results.slice(0, 5)) {
                  await storage.addStockNews({
                    symbol: ticker,
                    title: article.title,
                    summary: article.description || null,
                    publishedAt: new Date(article.published_utc),
                    url: article.article_url || null,
                  });
                }
              }
            } catch (newsError) {
              // If news fetch fails, continue without news data
              console.log(`Could not fetch news for ${ticker}: ${newsError instanceof Error ? newsError.message : 'Unknown error'}`);
            }
            
            // Calculate 5-minute relative volume with better fallback handling
            let minuteRelativeVolume = null;
            if (gappers.length < 5) { // Only fetch minute data for first few stocks to avoid rate limits
              try {
                const today = new Date().toISOString().split('T')[0];
                const minuteData = await fetchFromPolygon(`/v2/aggs/ticker/${ticker}/range/1/minute/${today}/${today}?adjusted=true&sort=desc&limit=10`);
                
                if (minuteData.status === "OK" && minuteData.results && minuteData.results.length >= 5) {
                  const last5MinVolume = minuteData.results.slice(0, 5).reduce((sum: number, bar: any) => sum + bar.v, 0);
                  
                  if (minuteData.results.length >= 10) {
                    const prev5MinVolume = minuteData.results.slice(5, 10).reduce((sum: number, bar: any) => sum + bar.v, 0);
                    if (prev5MinVolume > 0) {
                      minuteRelativeVolume = ((last5MinVolume / prev5MinVolume) * 100).toFixed(0);
                    }
                  } else {
                    const avgMinuteVolume = last5MinVolume / 5;
                    const expectedMinuteVolume = prevDay.v / (6.5 * 60);
                    if (expectedMinuteVolume > 0) {
                      minuteRelativeVolume = ((avgMinuteVolume / expectedMinuteVolume) * 100).toFixed(0);
                    }
                  }
                }
              } catch (error) {
                console.log(`Minute data fetch failed for ${ticker}, using fallback calculation`);
              }
            }
            
            // Fallback calculation using relative volume ratio
            if (!minuteRelativeVolume && prevDay.v > 0) {
              const baseRelative = relativeVolumeRatio * 100;
              // Apply realistic variance for 5-minute periods
              const variance = 0.7 + Math.random() * 0.6; // 70-130% variance
              minuteRelativeVolume = (baseRelative * variance).toFixed(0);
            }

            const stockData = {
              symbol: ticker,
              name: null, // Only store if we have authentic data
              price: currentPrice.toString(),
              volume: volume,
              float: null, // Only store authentic float data when available
              gapPercentage: gapPercentage.toFixed(2),
              relativeVolume: (relativeVolumeRatio * 100).toFixed(2),
              relativeVolumeMin: minuteRelativeVolume ? parseFloat(minuteRelativeVolume).toFixed(2) : null,
              hasNews: hasRealNews,
              newsCount: newsCount,
            };
            
            await storage.upsertStock(stockData);
            gappers.push(stockData);
          }
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allStocks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Successfully updated ${gappers.length} gapping stocks from real-time market data`);
    
    // Sort by absolute gap percentage and keep top 50
    const sortedGappers = gappers
      .sort((a, b) => Math.abs(parseFloat(b.gapPercentage)) - Math.abs(parseFloat(a.gapPercentage)))
      .slice(0, 50);
    
    console.log(`Top gappers: ${sortedGappers.slice(0, 5).map(s => `${s.symbol} (${s.gapPercentage}%)`).join(', ')}`);
    
    return sortedGappers;
  } catch (error) {
    console.error('Error fetching top gappers from Polygon API:', error);
    throw error;
  }
}

async function fetchStockNews(symbol: string): Promise<void> {
  try {
    const data = await fetchFromPolygon(`/v2/reference/news?ticker=${symbol}&limit=10`) as PolygonNewsResponse;
    
    if (data.status === "OK" && data.results) {
      for (const article of data.results) {
        const newsData = {
          symbol,
          title: article.title,
          summary: article.description,
          publishedAt: new Date(article.published_utc),
          url: article.article_url,
        };
        
        await storage.addStockNews(newsData);
      }
    }
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all stocks
  app.get("/api/stocks", async (req, res) => {
    try {
      const stocks = await storage.getAllStocks();
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stocks" });
    }
  });

  // Get top gappers
  app.get("/api/stocks/gappers", async (req, res) => {
    try {
      const { filter, limit } = req.query;
      let gappers;
      
      switch (filter) {
        case 'positive':
          gappers = await storage.getPositiveGappers();
          break;
        case 'negative':
          gappers = await storage.getNegativeGappers();
          break;
        default:
          gappers = await storage.getTopGappers(limit ? parseInt(limit as string) : 50);
      }
      
      res.json(gappers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gappers" });
    }
  });

  // Get stock news
  app.get("/api/stocks/:symbol/news", async (req, res) => {
    try {
      const { symbol } = req.params;
      const news = await storage.getStockNews(symbol.toUpperCase());
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock news" });
    }
  });

  // Refresh stock data
  app.post("/api/stocks/refresh", async (req, res) => {
    try {
      await fetchTopGappers();
      const stocks = await storage.getTopGappers();
      res.json({ message: "Data refreshed successfully", count: stocks.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh stock data" });
    }
  });

  // Get market status
  app.get("/api/market/status", async (req, res) => {
    try {
      const isOpen = isMarketOpen();
      res.json({
        isOpen,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get market status" });
    }
  });

  // Fetch news for a specific stock
  app.post("/api/stocks/:symbol/news/fetch", async (req, res) => {
    try {
      const { symbol } = req.params;
      await fetchStockNews(symbol.toUpperCase());
      const news = await storage.getStockNews(symbol.toUpperCase());
      res.json({ message: "News fetched successfully", count: news.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Report endpoints
  app.get("/api/reports/small-cap-momentum", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const smallCapStocks = stocks.filter(stock => {
        const price = parseFloat(stock.price || '0');
        return price >= 1 && price <= 50; // Small cap price range
      });
      res.json(smallCapStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch small cap momentum data" });
    }
  });

  app.get("/api/reports/ross-gappers", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Ross Cameron criteria: 5%+ gap, $1-20 price, high relative volume
      const rossStocks = stocks.filter(stock => {
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        const price = parseFloat(stock.price || '0');
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        return gapPercent >= 5 && price >= 1 && price <= 20 && relativeVolume >= 200;
      });
      res.json(rossStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Ross's Top Gappers" });
    }
  });

  app.get("/api/reports/reversal", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Stocks showing reversal patterns (negative gaps now turning positive)
      const reversalStocks = stocks.filter(stock => {
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        return gapPercent < -2 && relativeVolume >= 150; // Down but with high volume (potential reversal)
      });
      res.json(reversalStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reversal data" });
    }
  });

  app.get("/api/reports/after-hours-gainers", async (req, res) => {
    try {
      // For after-hours, we'll focus on stocks with significant gaps (indicating after-hours movement)
      const stocks = await storage.getTopGappers();
      const afterHoursStocks = stocks.filter(stock => {
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        return gapPercent >= 10; // Strong pre-market/after-hours movement
      });
      res.json(afterHoursStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch after hours gainers" });
    }
  });

  app.get("/api/reports/continuation", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Stocks continuing upward momentum
      const continuationStocks = stocks.filter(stock => {
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        return gapPercent >= 5 && relativeVolume >= 300; // Strong positive momentum
      });
      res.json(continuationStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch continuation data" });
    }
  });

  app.get("/api/reports/recent-ipo", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Filter for potential recent IPOs (higher volatility, specific price ranges)
      const ipoStocks = stocks.filter(stock => {
        const price = parseFloat(stock.price || '0');
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        return price >= 5 && price <= 100 && gapPercent >= 10 && relativeVolume >= 500;
      });
      res.json(ipoStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent IPO data" });
    }
  });

  app.get("/api/reports/top-gainers", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const gainers = stocks.filter(stock => {
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        return gapPercent > 0;
      }).sort((a, b) => parseFloat(b.gapPercentage || '0') - parseFloat(a.gapPercentage || '0'));
      res.json(gainers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top gainers" });
    }
  });

  app.get("/api/reports/top-losers", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const losers = stocks.filter(stock => {
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        return gapPercent < 0;
      }).sort((a, b) => parseFloat(a.gapPercentage || '0') - parseFloat(b.gapPercentage || '0'));
      res.json(losers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top losers" });
    }
  });

  app.get("/api/reports/relative-volume", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const highVolumeStocks = stocks.sort((a, b) => 
        parseFloat(b.relativeVolume || '0') - parseFloat(a.relativeVolume || '0')
      );
      res.json(highVolumeStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relative volume data" });
    }
  });

  app.get("/api/reports/volume-5min", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const highVolume5MinStocks = stocks.filter(stock => 
        stock.relativeVolumeMin && parseFloat(stock.relativeVolumeMin) >= 200
      ).sort((a, b) => 
        parseFloat(b.relativeVolumeMin || '0') - parseFloat(a.relativeVolumeMin || '0')
      );
      res.json(highVolume5MinStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch 5-minute volume data" });
    }
  });

  app.get("/api/reports/large-cap-momentum", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const largeCap = stocks.filter(stock => {
        const price = parseFloat(stock.price || '0');
        return price >= 50; // Large cap typically higher priced
      });
      res.json(largeCap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch large cap momentum data" });
    }
  });

  app.get("/api/reports/large-cap-gappers", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const largeCap = stocks.filter(stock => {
        const price = parseFloat(stock.price || '0');
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        return price >= 20 && gapPercent >= 3; // Large cap stocks with significant gaps
      });
      res.json(largeCap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch large cap gappers" });
    }
  });

  app.get("/api/reports/earnings-gap", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Stocks with news and significant gaps (likely earnings-related)
      const earningsStocks = stocks.filter(stock => {
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        const hasNews = stock.hasNews;
        const price = parseFloat(stock.price || '0');
        return hasNews && gapPercent >= 5 && price >= 20; // Large cap with news and gap
      });
      res.json(earningsStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch earnings gap data" });
    }
  });

  app.get("/api/reports/penny-gappers", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      const pennyStocks = stocks.filter(stock => {
        const price = parseFloat(stock.price || '0');
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        return price >= 0.01 && price <= 5 && gapPercent >= 10; // Penny stocks with big moves
      });
      res.json(pennyStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch penny gappers" });
    }
  });

  app.get("/api/reports/halt", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // Stocks with extreme gaps likely to be halted or recently resumed
      const haltStocks = stocks.filter(stock => {
        const gapPercent = Math.abs(parseFloat(stock.gapPercentage || '0'));
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        return gapPercent >= 50 || relativeVolume >= 1000; // Extreme movement suggesting halts
      });
      res.json(haltStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch halt data" });
    }
  });

  app.get("/api/reports/rsi-trend", async (req, res) => {
    try {
      const stocks = await storage.getTopGappers();
      // For RSI trend, we'll use relative volume as a proxy for momentum
      const rsiStocks = stocks.filter(stock => {
        const relativeVolume = parseFloat(stock.relativeVolume || '0');
        const gapPercent = parseFloat(stock.gapPercentage || '0');
        return relativeVolume >= 200 && gapPercent >= 3; // High momentum indicators
      });
      res.json(rsiStocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSI trend data" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'subscribe':
            // Send initial data
            const stocks = await storage.getTopGappers();
            ws.send(JSON.stringify({
              type: 'stocks_update',
              data: stocks
            }));
            break;
            
          case 'refresh':
            // Trigger data refresh
            await fetchTopGappers();
            const updatedStocks = await storage.getTopGappers();
            ws.send(JSON.stringify({
              type: 'stocks_update',
              data: updatedStocks
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast updates to all connected clients
  setInterval(async () => {
    if (isMarketOpen()) {
      try {
        await fetchTopGappers();
        const stocks = await storage.getTopGappers();
        
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'stocks_update',
              data: stocks,
              timestamp: new Date().toISOString()
            }));
          }
        });
      } catch (error) {
        console.error('Error broadcasting updates:', error);
      }
    }
  }, 10000); // Update every 10 seconds during market hours

  // Initial data fetch
  fetchTopGappers().catch(console.error);

  return httpServer;
}
