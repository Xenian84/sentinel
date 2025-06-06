import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import StockScanner from "@/pages/stock-scanner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={StockScanner} />
      <Route path="/test" component={() => <div className="p-8 text-2xl">Test Page Works!</div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Stock Scanner Loading...</h1>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
