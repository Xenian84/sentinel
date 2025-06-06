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
    
    for (const stock of allStocks) {
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
          
          // Calculate estimated minute-level relative volume based on daily data
          let minuteRelativeVolume = null;
          if (day && prevDay && prevDay.v > 0) {
            // Estimate current minute volume as percentage of daily average
            const estimatedMinuteVolume = volume / (6.5 * 60); // Assume 6.5 hour trading day
            const avgDailyMinuteVolume = prevDay.v / (6.5 * 60);
            if (avgDailyMinuteVolume > 0) {
              minuteRelativeVolume = ((estimatedMinuteVolume / avgDailyMinuteVolume) * 100).toFixed(0);
            }
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
    
    console.log(`Successfully updated ${gappers.length} gapping stocks from real-time market data`);
    
    // Sort by absolute gap percentage and keep top 50
    const sortedGappers = gappers
      .sort((a, b) => Math.abs(parseFloat(b.gapPercentage)) - Math.abs(parseFloat(a.gapPercentage)))
      .slice(0, 50);
    
    console.log(`Top gappers: ${sortedGappers.slice(0, 5).map(s => `${s.symbol} (${s.gapPercentage}%)`).join(', ')}`);
    
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
