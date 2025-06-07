import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, TrendingUp, TrendingDown, Clock, Volume2, BarChart3 } from "lucide-react";

interface Report {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

interface ReportCategory {
  title: string;
  reports: Report[];
}

interface ReportsSidebarProps {
  onReportSelect: (reportId: string, endpoint: string) => void;
  currentReport: string;
}

export default function ReportsSidebar({ onReportSelect, currentReport }: ReportsSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['small-cap', 'large-cap']);

  const reportCategories: ReportCategory[] = [
    {
      title: "All Reports",
      reports: [
        {
          id: "moys-top-gappers",
          name: "Moys Top Gappers",
          description: "5 indicators of high demand and low supply",
          endpoint: "/api/stocks/gappers?filter=moys",
          icon: TrendingUp,
          isActive: currentReport === "moys-top-gappers"
        },
        {
          id: "small-cap-high-momentum",
          name: "Small Cap - High of Day Momentum",
          description: "Small cap stocks with high momentum",
          endpoint: "/api/reports/small-cap-momentum",
          icon: TrendingUp
        },
        {
          id: "reversal",
          name: "Reversal",
          description: "Stocks showing strong reversal patterns",
          endpoint: "/api/reports/reversal",
          icon: BarChart3
        },
        {
          id: "after-hours-gainers",
          name: "After Hours Top Gainers",
          description: "Top performers in extended trading hours",
          endpoint: "/api/reports/after-hours-gainers",
          icon: Clock
        },
        {
          id: "continuation",
          name: "Continuation",
          description: "Stocks continuing their momentum trend",
          endpoint: "/api/reports/continuation",
          icon: TrendingUp
        },
        {
          id: "recent-ipo-moving",
          name: "Recent IPO Top Moving",
          description: "Recently public companies with high movement",
          endpoint: "/api/reports/recent-ipo",
          icon: TrendingUp
        },
        {
          id: "top-gainers",
          name: "Top Gainers",
          description: "Highest percentage gainers",
          endpoint: "/api/reports/top-gainers",
          icon: TrendingUp
        },
        {
          id: "top-losers",
          name: "Top Losers", 
          description: "Highest percentage losers",
          endpoint: "/api/reports/top-losers",
          icon: TrendingDown
        },
        {
          id: "top-rsi-trend",
          name: "Top RSI Trend",
          description: "Stocks with strong RSI momentum",
          endpoint: "/api/reports/rsi-trend",
          icon: BarChart3
        },
        {
          id: "top-relative-volume",
          name: "Top Relative Volume",
          description: "Highest relative volume vs average",
          endpoint: "/api/reports/relative-volume",
          icon: Volume2
        },
        {
          id: "top-volume-5min",
          name: "Top Volume 5 Minutes",
          description: "Highest volume in last 5 minutes",
          endpoint: "/api/reports/volume-5min",
          icon: Volume2
        },
        {
          id: "large-cap-high-momentum",
          name: "Large Cap - High Of Day Momentum",
          description: "Large cap stocks with high momentum",
          endpoint: "/api/reports/large-cap-momentum",
          icon: TrendingUp
        },
        {
          id: "large-cap-gappers",
          name: "Large Cap - Top Gappers",
          description: "Large cap stocks with significant gaps",
          endpoint: "/api/reports/large-cap-gappers",
          icon: TrendingUp
        },
        {
          id: "earnings-gap",
          name: "Large Cap - Earnings With Gap",
          description: "Large caps gapping after earnings",
          endpoint: "/api/reports/earnings-gap",
          icon: BarChart3
        },
        {
          id: "penny-gappers",
          name: "Penny - Top Gappers",
          description: "Low-priced stocks with high percentage gaps",
          endpoint: "/api/reports/penny-gappers",
          icon: TrendingUp
        },
        {
          id: "halt",
          name: "Halt",
          description: "Recently halted or resumed stocks",
          endpoint: "/api/reports/halt",
          icon: Clock
        }
      ]
    }
  ];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Card className="w-80 h-full bg-financial-dark text-white border-gray-700">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Stock Reports</h2>
        
        <div className="space-y-2">
          {reportCategories.map((category, categoryIndex) => {
            const categoryId = category.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const isExpanded = expandedCategories.includes(categoryId);
            
            return (
              <div key={categoryIndex} className="space-y-1">
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-300">
                    {category.title}
                  </span>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                
                {isExpanded && (
                  <div className="ml-2 space-y-1">
                    {category.reports.map((report) => {
                      const IconComponent = report.icon;
                      const isActive = report.id === currentReport;
                      
                      return (
                        <button
                          key={report.id}
                          onClick={() => onReportSelect(report.id, report.endpoint)}
                          className={`w-full flex items-center p-2 rounded-lg transition-colors text-left ${
                            isActive 
                              ? 'bg-financial-primary text-white' 
                              : 'hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {report.name}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {report.description}
                            </div>
                          </div>
                          {isActive && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Active
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {categoryIndex < reportCategories.length - 1 && (
                  <Separator className="my-2 bg-gray-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}