import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name"),
  price: decimal("price", { precision: 10, scale: 4 }),
  volume: integer("volume"),
  float: integer("float"),
  gapPercentage: decimal("gap_percentage", { precision: 10, scale: 4 }),
  relativeVolume: decimal("relative_volume", { precision: 10, scale: 2 }),
  relativeVolumeMin: decimal("relative_volume_min", { precision: 10, scale: 2 }),
  hasNews: boolean("has_news").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const stockNews = pgTable("stock_news", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  publishedAt: timestamp("published_at"),
  url: text("url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true,
});

export const insertStockNewsSchema = createInsertSchema(stockNews).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type StockNews = typeof stockNews.$inferSelect;
export type InsertStockNews = z.infer<typeof insertStockNewsSchema>;

// API response types
export interface StockGapper extends Stock {
  newsCount?: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
}

export interface APIStatus {
  connected: boolean;
  rateLimit: {
    current: number;
    max: number;
  };
  lastRequest?: string;
}
