import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import StockTable from "@/components/stock-table";
import NewsModal from "@/components/news-modal";
import ControlsSection from "@/components/controls-section";
import { useWebSocket } from "@/lib/websocket";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketStatus {
  isOpen: boolean;
  timestamp: string;
}

interface StockGapper {
  id: number;
  symbol: string;
  name: string | null;
  price: string | null;
  volume: number | null;
  float: number | null;
  gapPercentage: string | null;
  relativeVolume: string | null;
  relativeVolumeMin: string | null;
  hasNews: boolean;
  lastUpdated: Date | null;
  newsCount?: number;
}

export default function StockScanner() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const { data: stocks = [], isLoading, refetch } = useQuery<StockGapper[]>({
    queryKey: ["/api/stocks/gappers", filter],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  const { data: marketStatus } = useQuery<MarketStatus>({
    queryKey: ["/api/market/status"],
    refetchInterval: 60000, // Check every minute
  });

  const { isConnected, lastMessage } = useWebSocket("/ws");

  // Update last refresh time
  useEffect(() => {
    const now = new Date();
    setLastUpdate(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [stocks]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === 'stocks_update') {
      refetch();
    }
  }, [lastMessage, refetch]);

  const handleRefresh = async () => {
    try {
      await fetch("/api/stocks/refresh", { method: "POST" });
      refetch();
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  };

  const handleShowNews = (symbol: string) => {
    setSelectedStock(symbol);
  };

  const positiveGappers = stocks.filter(stock => 
    stock.gapPercentage && parseFloat(stock.gapPercentage) > 0
  ).length;

  const negativeGappers = stocks.filter(stock => 
    stock.gapPercentage && parseFloat(stock.gapPercentage) < 0
  ).length;

  return (
    <div className="min-h-screen bg-financial-bg font-roboto">
      {/* Header */}
      <header className="bg-financial-dark text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">The Obvious Stocks</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  marketStatus?.isOpen ? 'bg-financial-success animate-pulse' : 'bg-gray-500'
                }`}></span>
                <span>
                  {marketStatus?.isOpen ? 'Market Open' : 'Market Closed'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                <span>Last Updated: </span>
                <span>{lastUpdate}</span>
              </div>
              <Button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-financial-primary hover:bg-blue-700"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Main Scanner Section */}
        <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Scanner Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Top Gappers</h2>
                <p className="text-sm text-gray-600 mt-1">
                  09:25:00 - 09:30:00 (Last updated {lastUpdate} - 
                  <span className={`ml-1 ${isConnected ? 'text-financial-success' : 'text-red-500'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>)
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span>{stocks.length}</span> stocks found
                </div>
                <select 
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as "all" | "positive" | "negative")}
                >
                  <option value="all">All Gappers</option>
                  <option value="positive">Positive Only</option>
                  <option value="negative">Negative Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <StockTable 
            stocks={stocks} 
            isLoading={isLoading}
            onShowNews={handleShowNews}
          />
        </Card>

        {/* Controls Section */}
        <ControlsSection
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          isConnected={isConnected}
          totalGappers={stocks.length}
          positiveGappers={positiveGappers}
          negativeGappers={negativeGappers}
          lastUpdate={lastUpdate}
        />
      </div>

      {/* News Modal */}
      <NewsModal 
        symbol={selectedStock}
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  );
}
