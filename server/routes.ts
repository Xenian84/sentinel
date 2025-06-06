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
    // Get recent trading days for comparison
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Skip weekends - if today is Monday, get Friday's data
    if (today.getDay() === 1) { // Monday
      yesterday.setDate(yesterday.getDate() - 2); // Friday
    }
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Fetching historical data for gap analysis: ${yesterdayStr} to ${todayStr}`);
    
    // Popular stocks to analyze for gaps using historical data
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'BABA', 'CRM', 'UBER', 'SHOP', 'ROKU', 'ZM', 'SPOT'];
    
    const gappers = [];
    
    for (const symbol of symbols) {
      try {
        // Fetch historical data for gap calculation
        const data = await fetchFromPolygon(`/v2/aggs/ticker/${symbol}/range/1/day/${yesterdayStr}/${todayStr}?adjusted=true`);
        
        if (data.status === "OK" && data.results && data.results.length >= 1) {
          const latestDay = data.results[data.results.length - 1];
          const previousDay = data.results.length > 1 ? data.results[data.results.length - 2] : null;
          
          if (latestDay && previousDay) {
            // Calculate gap using open vs previous close
            const gapPercentage = calculateGapPercentage(latestDay.o, previousDay.c);
            
            // Include stocks with significant gaps
            if (Math.abs(gapPercentage) > 1 && latestDay.v > 1000000) {
              const stockData = {
                symbol: symbol,
                name: null,
                price: latestDay.c.toString(),
                volume: latestDay.v,
                float: null,
                gapPercentage: gapPercentage.toString(),
                relativeVolume: null,
                relativeVolumeMin: null,
                hasNews: false,
              };
              
              await storage.upsertStock(stockData);
              gappers.push(stockData);
            }
          }
        } else if (data.status === "DELAYED") {
          console.log(`Got delayed data for ${symbol}, which is expected with free tier`);
          
          if (data.results && data.results.length >= 1) {
            const latestDay = data.results[data.results.length - 1];
            
            // For delayed data, use a simple percentage change calculation
            const changePercent = ((latestDay.c - latestDay.o) / latestDay.o) * 100;
            
            if (Math.abs(changePercent) > 2 && latestDay.v > 1000000) {
              const stockData = {
                symbol: symbol,
                name: null,
                price: latestDay.c.toString(),
                volume: latestDay.v,
                float: null,
                gapPercentage: changePercent.toString(),
                relativeVolume: null,
                relativeVolumeMin: null,
                hasNews: false,
              };
              
              await storage.upsertStock(stockData);
              gappers.push(stockData);
            }
          }
        }
      } catch (error) {
        if (error.message.includes('403') || error.message.includes('NOT_AUTHORIZED')) {
          console.log(`API access limitation for ${symbol}: ${error.message}`);
          continue;
        }
        console.log(`Failed to fetch data for ${symbol}:`, error.message);
      }
    }

    console.log(`Successfully updated ${gappers.length} stocks with gap analysis from Polygon API`);
    
    if (gappers.length === 0) {
      console.log('No gapping stocks found. This could be due to:');
      console.log('1. Market is closed');
      console.log('2. API key limitations (free tier has limited access)');
      console.log('3. No significant gaps in the analyzed stocks');
    }
    
  } catch (error) {
    console.error('Error in fetchTopGappers:', error);
    if (error.message.includes('NOT_AUTHORIZED')) {
      console.error('API Key Error: Your Polygon.io subscription does not include access to real-time market data.');
      console.error('Please upgrade your plan at https://polygon.io/pricing for full market scanner functionality.');
    }
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
