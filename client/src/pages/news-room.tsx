import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, ExternalLink, X, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  url: string | null;
  category: 'earnings' | 'announcement' | 'partnership' | 'regulatory' | 'general';
  priority: 'high' | 'medium' | 'low';
}

interface NewsRoomProps {
  isOpen: boolean;
  onClose: () => void;
}

const NEWS_CATEGORIES = {
  earnings: { label: 'Earnings', icon: TrendingUp, color: 'bg-green-500' },
  announcement: { label: 'Announcements', icon: Bell, color: 'bg-blue-500' },
  partnership: { label: 'Partnerships', icon: Zap, color: 'bg-purple-500' },
  regulatory: { label: 'Regulatory', icon: AlertCircle, color: 'bg-orange-500' },
  general: { label: 'General', icon: Bell, color: 'bg-gray-500' }
};

function categorizeNews(title: string, summary: string): 'earnings' | 'announcement' | 'partnership' | 'regulatory' | 'general' {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  
  if (text.includes('earnings') || text.includes('revenue') || text.includes('fiscal') || text.includes('quarter')) {
    return 'earnings';
  }
  if (text.includes('partnership') || text.includes('agreement') || text.includes('collaboration') || text.includes('alliance')) {
    return 'partnership';
  }
  if (text.includes('fda') || text.includes('regulatory') || text.includes('approval') || text.includes('compliance')) {
    return 'regulatory';
  }
  if (text.includes('announces') || text.includes('launches') || text.includes('introduces') || text.includes('unveils')) {
    return 'announcement';
  }
  return 'general';
}

function determinePriority(title: string, summary: string): 'high' | 'medium' | 'low' {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  
  // High priority keywords
  if (text.includes('halt') || text.includes('suspension') || text.includes('breakthrough') || 
      text.includes('merger') || text.includes('acquisition') || text.includes('bankruptcy')) {
    return 'high';
  }
  
  // Medium priority keywords
  if (text.includes('earnings') || text.includes('partnership') || text.includes('fda') || 
      text.includes('contract') || text.includes('agreement')) {
    return 'medium';
  }
  
  return 'low';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

export default function NewsRoom({ isOpen, onClose }: NewsRoomProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const queryClient = useQueryClient();

  // Fetch all news from different stocks
  const { data: allNews = [], isLoading } = useQuery({
    queryKey: ['/api/news/all'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Transform news data and add categorization
  const processedNews: NewsItem[] = (allNews as any[]).map((item: any, index: number) => ({
    id: item.id || `news-${index}`,
    symbol: item.symbol,
    title: item.title,
    summary: item.summary,
    publishedAt: item.publishedAt || new Date().toISOString(),
    url: item.url,
    category: categorizeNews(item.title, item.summary || ''),
    priority: determinePriority(item.title, item.summary || '')
  })).sort((a: NewsItem, b: NewsItem) => {
    // Sort by priority first, then by time
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Filter news by category
  const filteredNews = selectedCategory 
    ? processedNews.filter(news => news.category === selectedCategory)
    : processedNews;

  // Category counts
  const categoryCounts = processedNews.reduce((acc, news) => {
    acc[news.category] = (acc[news.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Bell className="w-6 h-6" />
              News Room
              <Badge variant="secondary" className="ml-2">
                LIVE
              </Badge>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All ({processedNews.length})
            </Button>
            {Object.entries(NEWS_CATEGORIES).map(([category, config]) => {
              const count = categoryCounts[category] || 0;
              const Icon = config.icon;
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex items-center gap-1"
                >
                  <Icon className="w-3 h-3" />
                  {config.label} ({count})
                </Button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading news...</div>
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">No news available</div>
                </div>
              ) : (
                filteredNews.map((news) => {
                  const categoryConfig = NEWS_CATEGORIES[news.category];
                  const Icon = categoryConfig.icon;
                  
                  return (
                    <Card 
                      key={news.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-l-4",
                        news.priority === 'high' && "border-l-red-500",
                        news.priority === 'medium' && "border-l-yellow-500",
                        news.priority === 'low' && "border-l-gray-300"
                      )}
                      onClick={() => setSelectedNews(news)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant="secondary" 
                                className={cn("text-white", categoryConfig.color)}
                              >
                                <Icon className="w-3 h-3 mr-1" />
                                {news.symbol}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {categoryConfig.label}
                              </Badge>
                              {news.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  HIGH
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
                              {news.title}
                            </h3>
                            
                            {news.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {news.summary}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(news.publishedAt)}
                            </span>
                            {news.url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(news.url!, '_blank');
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* News Detail Modal */}
        {selectedNews && (
          <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-white bg-blue-500">
                    {selectedNews.symbol}
                  </Badge>
                  <Badge variant="outline">
                    {NEWS_CATEGORIES[selectedNews.category].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedNews.publishedAt).toLocaleString()}
                  </span>
                </div>
                <DialogTitle className="text-xl leading-tight">
                  {selectedNews.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedNews.summary && (
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm leading-relaxed">{selectedNews.summary}</p>
                  </div>
                )}
                
                {selectedNews.url && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => window.open(selectedNews.url!, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read Full Article
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Footer with timestamp */}
        <div className="px-6 py-3 border-t bg-muted/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Friday, June 6th, New York</span>
            <span>Last updated: {formatTime(new Date().toISOString())}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}