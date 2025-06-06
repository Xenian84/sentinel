import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import StockTable from "@/components/stock-table";
import NewsModal from "@/components/news-modal";
import ControlsSection from "@/components/controls-section";
import ReportsSidebar from "@/components/reports-sidebar";
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
  const [currentReport, setCurrentReport] = useState<string>("moys-top-gappers");
  const [currentEndpoint, setCurrentEndpoint] = useState<string>("/api/stocks/gappers?filter=moys");
  const [currentReportName, setCurrentReportName] = useState<string>("Moys Top Gappers");

  const [stocks, setStocks] = useState<StockGapper[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: marketStatus } = useQuery<MarketStatus>({
    queryKey: ["/api/market/status"],
    refetchInterval: 60000, // Check every minute
  });

  const { isConnected, lastMessage } = useWebSocket("/ws");

  // Update last refresh time
  useEffect(() => {
    const now = new Date();
    setLastUpdate(now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/New_York',
      hour12: true
    }));
  }, [stocks]);

  // Handle WebSocket updates for real-time data
  useEffect(() => {
    if (lastMessage?.type === 'stocks_update') {
      setStocks(lastMessage.data || []);
      setIsLoading(false);
    }
  }, [lastMessage]);

  // Load initial data when connected
  useEffect(() => {
    if (isConnected && stocks.length === 0) {
      fetch(currentEndpoint)
        .then(res => res.json())
        .then(data => {
          setStocks(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Failed to load initial data:", error);
          setIsLoading(false);
        });
    }
  }, [isConnected, currentEndpoint]);

  // Auto-refresh functionality for current report
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(currentEndpoint);
        const data = await response.json();
        setStocks(data);
        setLastUpdate(new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'America/New_York',
          hour12: true
        }));
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentEndpoint]);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      // Refresh the current report data directly
      const response = await fetch(currentEndpoint);
      const data = await response.json();
      setStocks(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to refresh data:", error);
      setIsLoading(false);
    }
  };

  const handleShowNews = (symbol: string) => {
    setSelectedStock(symbol);
  };

  const getReportDisplayName = (reportId: string) => {
    const reportNames: { [key: string]: string } = {
      "moys-top-gappers": "Moys Top Gappers",
      "small-cap-high-momentum": "Small Cap - High of Day Momentum",
      "reversal": "Reversal",
      "after-hours-gainers": "After Hours Top Gainers",
      "continuation": "Continuation",
      "recent-ipo": "Recent IPO Top Moving",
      "top-gainers": "Top Gainers",
      "top-losers": "Top Losers",
      "top-rsi": "Top RSI Trend",
      "top-relative-volume": "Top Relative Volume",
      "top-volume-5min": "Top Volume 5 Minutes",
      "large-cap-momentum": "Large Cap - High Of Day Momentum",
      "large-cap-gappers": "Large Cap - Top Gappers",
      "large-cap-earnings": "Large Cap - Earnings With Gap",
      "penny-gappers": "Penny - Top Gappers",
      "halt": "Halt"
    };
    return reportNames[reportId] || "Stock Scanner";
  };

  const handleReportSelect = (reportId: string, endpoint: string) => {
    setCurrentReport(reportId);
    setCurrentEndpoint(endpoint);
    setCurrentReportName(getReportDisplayName(reportId));
    setIsLoading(true);
    
    // Fetch new report data
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setStocks(data);
        setLastUpdate(new Date().toLocaleTimeString());
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to load report data:", error);
        setIsLoading(false);
      });
  };

  const positiveGappers = stocks.filter(stock => 
    stock.gapPercentage && parseFloat(stock.gapPercentage) > 0
  ).length;

  const negativeGappers = stocks.filter(stock => 
    stock.gapPercentage && parseFloat(stock.gapPercentage) < 0
  ).length;

  // Calculate proprietary scanning conditions for all stocks
  const proprietaryConditions = stocks.map(stock => {
    const gapPercent = parseFloat(stock.gapPercentage || '0');
    const price = parseFloat(stock.price || '0');
    const relativeVolume = parseFloat(stock.relativeVolume || '0');
    const float = stock.float || 0;
    const hasNews = stock.hasNews || false;
    
    return {
      symbol: stock.symbol,
      volume5x: relativeVolume >= 500,
      up10Percent: gapPercent >= 10,
      hasNewsEvent: hasNews,
      priceRange: price >= 1.00 && price <= 20.00,
      lowFloat: float > 0 && float <= 10000000
    };
  });

  const highPriorityStocks = proprietaryConditions.filter(stock => 
    Object.values(stock).filter(Boolean).length >= 4 // 3+ conditions (excluding symbol)
  ).length;

  // Generate dynamic time range based on current time
  const getCurrentTimeRange = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Calculate 5-minute interval start
    const minutes = now.getMinutes();
    const intervalStart = Math.floor(minutes / 5) * 5;
    const intervalEnd = intervalStart + 5;
    
    const startTime = new Date(now);
    startTime.setMinutes(intervalStart, 0, 0);
    
    const endTime = new Date(now);
    endTime.setMinutes(intervalEnd, 0, 0);
    
    const startStr = startTime.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const endStr = endTime.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return `${startStr} - ${endStr}`;
  };

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
              <div className="flex items-center space-x-6 text-sm text-gray-300">
                <div>
                  <span>Last Updated: </span>
                  <span>{lastUpdate} ET</span>
                </div>
                <div className="bg-yellow-600 text-white px-3 py-1 rounded-lg font-bold">
                  High Priority: {highPriorityStocks} stocks
                </div>
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

      <div className="flex">
        {/* Reports Sidebar */}
        <ReportsSidebar 
          onReportSelect={handleReportSelect}
          currentReport={currentReport}
        />
        
        <div className="flex-1 p-6">
          {/* Main Scanner Section */}
          <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Scanner Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{currentReportName}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getCurrentTimeRange()} (Last updated {lastUpdate} - 
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
