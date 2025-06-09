import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface ControlsSectionProps {
  isConnected: boolean;
  totalGappers: number;
  positiveGappers: number;
  negativeGappers: number;
  lastUpdate: string;
}

interface APIStatus {
  connected: boolean;
  rateLimit: {
    current: number;
    max: number;
    resetTime?: string;
  };
  lastRequest: string;
}

interface MarketStatus {
  isOpen: boolean;
  isExtendedHours: boolean;
  tradingSession: 'regular' | 'pre-market' | 'after-hours' | 'closed';
  timestamp: string;
  easternTime: string;
  nextOpen?: string;
  nextClose?: string;
  sessions: {
    preMarket: string;
    regular: string;
    afterHours: string;
  };
}

export default function ControlsSection({
  isConnected,
  totalGappers,
  positiveGappers,
  negativeGappers,
  lastUpdate,
}: ControlsSectionProps) {
  const { data: apiStatus } = useQuery<APIStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const { data: marketStatus } = useQuery<MarketStatus>({
    queryKey: ["/api/market/status"],
    refetchInterval: 30000, // Check market status every 30 seconds
  });

  const getSessionColor = (session: string) => {
    switch (session) {
      case 'regular': return 'bg-green-500';
      case 'pre-market': return 'bg-blue-500';
      case 'after-hours': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getSessionLabel = (session: string) => {
    switch (session) {
      case 'regular': return 'Regular Hours';
      case 'pre-market': return 'Pre-Market';
      case 'after-hours': return 'After Hours';
      default: return 'Market Closed';
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Real-time Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Real-time Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <Label className="text-sm">
              {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
            </Label>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">
              Data updates automatically every ~10 seconds
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Connection</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
              isConnected ? 'bg-financial-success' : 'bg-red-500'
            }`}>
              <span className="w-2 h-2 bg-white rounded-full mr-1"></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Rate Limit</span>
            <span className="text-sm text-gray-900">
              {apiStatus?.rateLimit ? `${apiStatus.rateLimit.current}/${apiStatus.rateLimit.max}` : '--/--'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Request</span>
            <span className="text-sm text-gray-900">{lastUpdate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Market Status with Extended Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Market Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Trading Session</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${
              marketStatus?.tradingSession ? getSessionColor(marketStatus.tradingSession) : 'bg-gray-500'
            }`}>
              <span className="w-2 h-2 bg-white rounded-full mr-1"></span>
              {marketStatus?.tradingSession ? getSessionLabel(marketStatus.tradingSession) : 'Unknown'}
            </span>
          </div>
          
          {marketStatus?.isExtendedHours && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Extended Hours</span>
              <span className="text-sm font-semibold text-blue-600">Active</span>
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>Pre-Market: {marketStatus?.sessions?.preMarket || '4:00 AM - 9:30 AM ET'}</div>
            <div>Regular: {marketStatus?.sessions?.regular || '9:30 AM - 4:00 PM ET'}</div>
            <div>After-Hours: {marketStatus?.sessions?.afterHours || '4:00 PM - 8:00 PM ET'}</div>
          </div>

          {marketStatus?.tradingSession === 'pre-market' && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              Lower gap threshold active (2%+) for pre-market data
            </div>
          )}
          
          {marketStatus?.tradingSession === 'after-hours' && (
            <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
              Lower gap threshold active (2%+) for after-hours data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Gappers</span>
            <span className="text-sm font-semibold text-gray-900">{totalGappers}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Positive</span>
            <span className="text-sm font-semibold text-financial-success">{positiveGappers}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Negative</span>
            <span className="text-sm font-semibold text-financial-error">{negativeGappers}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
