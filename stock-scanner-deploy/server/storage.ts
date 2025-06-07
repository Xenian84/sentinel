import { stocks, stockNews, type Stock, type InsertStock, type StockNews, type InsertStockNews, type StockGapper } from "@shared/schema";

export interface IStorage {
  // Stock operations
  getAllStocks(): Promise<StockGapper[]>;
  getStock(symbol: string): Promise<Stock | undefined>;
  upsertStock(stock: InsertStock): Promise<Stock>;
  updateStockPrices(stockUpdates: Partial<InsertStock>[]): Promise<void>;
  
  // Stock news operations
  getStockNews(symbol: string): Promise<StockNews[]>;
  addStockNews(news: InsertStockNews): Promise<StockNews>;
  
  // Analytics
  getTopGappers(limit?: number): Promise<StockGapper[]>;
  getPositiveGappers(): Promise<StockGapper[]>;
  getNegativeGappers(): Promise<StockGapper[]>;
}

export class MemStorage implements IStorage {
  private stocks: Map<string, Stock>;
  private stockNews: Map<string, StockNews[]>;
  private currentStockId: number;
  private currentNewsId: number;

  constructor() {
    this.stocks = new Map();
    this.stockNews = new Map();
    this.currentStockId = 1;
    this.currentNewsId = 1;
  }

  async getAllStocks(): Promise<StockGapper[]> {
    const stockArray = Array.from(this.stocks.values());
    return stockArray.map(stock => ({
      ...stock,
      newsCount: this.stockNews.get(stock.symbol)?.length || 0
    }));
  }

  async getStock(symbol: string): Promise<Stock | undefined> {
    return this.stocks.get(symbol);
  }

  async upsertStock(stockData: InsertStock): Promise<Stock> {
    const existing = this.stocks.get(stockData.symbol);
    const stock: Stock = {
      id: existing?.id || this.currentStockId++,
      ...existing, // Preserve existing data including float
      ...stockData,
      lastUpdated: new Date(),
    };
    this.stocks.set(stockData.symbol, stock);
    return stock;
  }

  async updateStockPrices(stockUpdates: Partial<InsertStock>[]): Promise<void> {
    for (const update of stockUpdates) {
      if (update.symbol) {
        const existing = this.stocks.get(update.symbol);
        if (existing) {
          const updated = { ...existing, ...update, lastUpdated: new Date() };
          this.stocks.set(update.symbol, updated);
        }
      }
    }
  }

  async getStockNews(symbol: string): Promise<StockNews[]> {
    return this.stockNews.get(symbol) || [];
  }

  async addStockNews(newsData: InsertStockNews): Promise<StockNews> {
    const existingNews = this.stockNews.get(newsData.symbol) || [];
    
    // Check for duplicates by title and URL
    const isDuplicate = existingNews.some(existing => 
      existing.title === newsData.title && existing.url === newsData.url
    );
    
    if (isDuplicate) {
      return existingNews.find(existing => 
        existing.title === newsData.title && existing.url === newsData.url
      )!;
    }
    
    const news: StockNews = {
      id: this.currentNewsId++,
      ...newsData,
    };
    
    existingNews.push(news);
    this.stockNews.set(newsData.symbol, existingNews);
    
    // Update stock to indicate it has news
    const stock = this.stocks.get(newsData.symbol);
    if (stock) {
      this.stocks.set(newsData.symbol, { ...stock, hasNews: true });
    }
    
    return news;
  }

  async getTopGappers(limit: number = 50): Promise<StockGapper[]> {
    const stockArray = Array.from(this.stocks.values());
    return stockArray
      .filter(stock => stock.gapPercentage !== null)
      .sort((a, b) => Math.abs(parseFloat(b.gapPercentage || "0")) - Math.abs(parseFloat(a.gapPercentage || "0")))
      .slice(0, limit)
      .map(stock => ({
        ...stock,
        newsCount: this.stockNews.get(stock.symbol)?.length || 0
      }));
  }

  async getPositiveGappers(): Promise<StockGapper[]> {
    const stockArray = Array.from(this.stocks.values());
    return stockArray
      .filter(stock => stock.gapPercentage && parseFloat(stock.gapPercentage) > 0)
      .sort((a, b) => parseFloat(b.gapPercentage || "0") - parseFloat(a.gapPercentage || "0"))
      .map(stock => ({
        ...stock,
        newsCount: this.stockNews.get(stock.symbol)?.length || 0
      }));
  }

  async getNegativeGappers(): Promise<StockGapper[]> {
    const stockArray = Array.from(this.stocks.values());
    return stockArray
      .filter(stock => stock.gapPercentage && parseFloat(stock.gapPercentage) < 0)
      .sort((a, b) => parseFloat(a.gapPercentage || "0") - parseFloat(b.gapPercentage || "0"))
      .map(stock => ({
        ...stock,
        newsCount: this.stockNews.get(stock.symbol)?.length || 0
      }));
  }
}

export const storage = new MemStorage();
