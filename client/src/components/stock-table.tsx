import { useState } from "react";
import { ChevronUp, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface StockTableProps {
  stocks: StockGapper[];
  isLoading: boolean;
  onShowNews: (symbol: string) => void;
}

type SortColumn = 'gap' | 'symbol' | 'price' | 'volume' | 'float' | 'relativeVolume' | 'relativeVolumeMin';
type SortDirection = 'asc' | 'desc';

export default function StockTable({ stocks, isLoading, onShowNews }: StockTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('gap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'gap':
        aValue = parseFloat(a.gapPercentage || '0');
        bValue = parseFloat(b.gapPercentage || '0');
        break;
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'price':
        aValue = parseFloat(a.price || '0');
        bValue = parseFloat(b.price || '0');
        break;
      case 'volume':
        aValue = a.volume || 0;
        bValue = b.volume || 0;
        break;
      case 'float':
        aValue = a.float || 0;
        bValue = b.float || 0;
        break;
      case 'relativeVolume':
        aValue = parseFloat(a.relativeVolume || '0');
        bValue = parseFloat(b.relativeVolume || '0');
        break;
      case 'relativeVolumeMin':
        aValue = parseFloat(a.relativeVolumeMin || '0');
        bValue = parseFloat(b.relativeVolumeMin || '0');
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const formatVolume = (volume: number | null): string => {
    if (!volume) return '-';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(volume >= 100000000 ? 0 : 2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(volume >= 100000 ? 0 : 2)}K`;
    }
    return volume.toString();
  };

  const formatFloat = (floatValue: number | null): string => {
    if (!floatValue) return '-';
    if (floatValue >= 1000000) {
      return `${(floatValue / 1000000).toFixed(2)}M`;
    } else if (floatValue >= 1000) {
      return `${(floatValue / 1000).toFixed(2)}K`;
    }
    return floatValue.toLocaleString();
  };

  const SortHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortColumn === column && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center">
          <Loader2 className="w-6 h-6 animate-spin text-financial-primary mr-3" />
          <span className="text-gray-600">Loading stock data...</span>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No gapping stocks found</p>
          <p className="text-sm text-gray-600 mt-1">Try refreshing the data or check back during market hours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <SortHeader column="gap">Gap(%)</SortHeader>
            <SortHeader column="symbol">Symbol / News</SortHeader>
            <SortHeader column="price">Price</SortHeader>
            <SortHeader column="volume">Volume</SortHeader>
            <SortHeader column="float">Float</SortHeader>
            <SortHeader column="relativeVolume">Relative Volume(Daily Rate)</SortHeader>
            <SortHeader column="relativeVolumeMin">Relative Volume(min %)</SortHeader>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedStocks.map((stock) => {
            const gapPercent = parseFloat(stock.gapPercentage || '0');
            const price = parseFloat(stock.price || '0');
            const relativeVolume = parseFloat(stock.relativeVolume || '0');
            const float = stock.float || 0;
            const hasNews = stock.hasNews || false;
            
            // Check proprietary scanning conditions
            const conditions = {
              volume5x: relativeVolume >= 500, // 5x = 500% relative volume
              up10Percent: gapPercent >= 10,
              hasNewsEvent: hasNews,
              priceRange: price >= 1.00 && price <= 20.00,
              lowFloat: float > 0 && float <= 10000000 // Less than 10M shares
            };
            
            // Count how many conditions are met
            const conditionsMet = Object.values(conditions).filter(Boolean).length;
            const isHighPriority = conditionsMet >= 3; // 3 or more conditions met
            
            // Color-coded background with special highlighting for high-priority stocks
            const getRowBgColor = (gap: number, priority: boolean) => {
              if (priority) return 'bg-yellow-300 border-2 border-yellow-500'; // Golden highlight for high priority
              if (gap > 100) return 'bg-green-400';
              if (gap > 50) return 'bg-green-300';
              if (gap > 20) return 'bg-green-200';
              if (gap > 0) return 'bg-green-100';
              if (gap < -20) return 'bg-red-200';
              if (gap < -10) return 'bg-red-100';
              return 'bg-gray-50';
            };

            const rowBgColor = getRowBgColor(gapPercent, isHighPriority);

            return (
              <tr 
                key={stock.id} 
                className={`hover:opacity-80 transition-opacity ${rowBgColor}`}
              >
                <td className="px-4 py-2 whitespace-nowrap text-center">
                  <span className="font-bold text-black text-sm">
                    {gapPercent.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-sm transition-colors"
                      title={`View ${stock.symbol} chart on TradingView`}
                    >
                      {stock.symbol}
                    </a>
                    {/* Proprietary scanning condition indicators */}
                    <div className="flex flex-wrap gap-1">
                      {conditions.volume5x && (
                        <span className="bg-purple-500 text-white text-xs px-1 py-0.5 rounded font-bold" title="5x Relative Volume">
                          Volume
                        </span>
                      )}
                      {conditions.up10Percent && (
                        <span className="bg-pink-500 text-white text-xs px-1 py-0.5 rounded font-bold" title="Already up 10% on the day">
                          +10%
                        </span>
                      )}
                      {conditions.hasNewsEvent && (
                        <span className="bg-fuchsia-500 text-white text-xs px-1 py-0.5 rounded font-bold" title="News Event moving stock higher">
                          News
                        </span>
                      )}
                      {conditions.priceRange && (
                        <span className="bg-red-500 text-white text-xs px-1 py-0.5 rounded font-bold" title="Price range $1.00 - $20.00">
                          Price
                        </span>
                      )}
                      {conditions.lowFloat && (
                        <span className="bg-yellow-600 text-white text-xs px-1 py-0.5 rounded font-bold" title="Less than 10M shares available">
                          Supply
                        </span>
                      )}
                    </div>
                    {(stock.hasNews || stock.newsCount) && (
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-500"></div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center font-mono text-black text-sm">
                  {stock.price ? parseFloat(stock.price).toFixed(2) : '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center font-mono text-black text-sm">
                  {formatVolume(stock.volume)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center font-mono">
                  <span className="text-cyan-500 font-bold text-sm">
                    {formatFloat(stock.float)}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center font-mono text-black text-sm">
                  {stock.relativeVolume ? `${parseFloat(stock.relativeVolume).toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center font-mono text-black text-sm">
                  {stock.relativeVolumeMin ? parseFloat(stock.relativeVolumeMin).toFixed(0) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
