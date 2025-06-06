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
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toString();
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
            const isPositive = gapPercent > 0;
            const borderColor = isPositive ? 'border-financial-success' : 'border-financial-error';
            const gapBadgeColor = isPositive ? 'bg-financial-success' : 'bg-financial-error';

            return (
              <tr 
                key={stock.id} 
                className={`hover:bg-gray-50 transition-colors border-l-4 ${borderColor}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${gapBadgeColor}`}>
                    {gapPercent > 0 ? '+' : ''}{gapPercent.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{stock.symbol}</span>
                    {(stock.hasNews || stock.newsCount) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => onShowNews(stock.symbol)}
                        title="View News"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900">
                  {stock.price ? parseFloat(stock.price).toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900">
                  {formatVolume(stock.volume)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono">
                  <span className="text-cyan-600 font-medium">
                    {formatVolume(stock.float)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900">
                  {stock.relativeVolume ? parseFloat(stock.relativeVolume).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900">
                  {stock.relativeVolumeMin ? parseFloat(stock.relativeVolumeMin).toLocaleString() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
