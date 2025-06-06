import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

interface StockNews {
  id: number;
  symbol: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  url: string | null;
}

interface NewsModalProps {
  symbol: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsModal({ symbol, isOpen, onClose }: NewsModalProps) {
  const { data: news = [], isLoading, refetch } = useQuery<StockNews[]>({
    queryKey: ["/api/stocks", symbol, "news"],
    enabled: !!symbol && isOpen,
  });

  const handleFetchNews = async () => {
    if (!symbol) return;
    
    try {
      await fetch(`/api/stocks/${symbol}/news/fetch`, { method: "POST" });
      refetch();
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }
  };

  const formatDate = (date: Date | null | string) => {
    if (!date) return "Unknown date";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-96 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Latest News - {symbol}</span>
            <Button
              onClick={handleFetchNews}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                "Fetch Latest"
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-80 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-financial-primary mr-2" />
              <span>Loading news...</span>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No news available for {symbol}</p>
              <Button
                onClick={handleFetchNews}
                variant="outline"
                className="mt-4"
              >
                Fetch News from API
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((article) => (
                <div key={article.id} className="border-l-4 border-financial-primary pl-4 pb-4">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 pr-4">{article.title}</h4>
                    {article.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => window.open(article.url!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {article.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
