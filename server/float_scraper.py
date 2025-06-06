#!/usr/bin/env python3
import re
import json
import requests
import sys
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

def get_float_data(ticker: str) -> Optional[float]:
    """
    Get float shares data with rate limiting and proper headers
    Returns float shares in millions, or None if not found
    """
    try:
        url = f'https://finance.yahoo.com/quote/{ticker}/key-statistics'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        
        import time
        time.sleep(0.2)  # Rate limiting
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 429:
            print(f"Rate limited for {ticker}, skipping", file=sys.stderr)
            return None
            
        if response.status_code != 200:
            print(f"HTTP {response.status_code} for {ticker}", file=sys.stderr)
            return None

        html = response.text

        # Extract the JSON data from the page
        pattern = r'root\.App\.main = (.*?);\n'
        match = re.search(pattern, html)

        if match:
            try:
                data = json.loads(match.group(1))
                float_shares = data['context']['dispatcher']['stores']['QuoteSummaryStore']['defaultKeyStatistics']['floatShares']
                # Return in millions for consistency with our frontend display
                return float_shares['raw'] / 1000000
            except (KeyError, TypeError):
                # Try alternative path
                try:
                    stats = data['context']['dispatcher']['stores']['QuoteSummaryStore']['summaryDetail']
                    if 'floatShares' in stats:
                        return stats['floatShares']['raw'] / 1000000
                except:
                    pass
        
        return None
            
    except Exception as e:
        print(f"Error fetching float data for {ticker}: {e}", file=sys.stderr)
        return None

def get_multiple_floats(tickers: list) -> Dict[str, Optional[float]]:
    """
    Get float data for multiple tickers
    Returns a dictionary with ticker -> float_shares mapping
    """
    results = {}
    for ticker in tickers:
        results[ticker] = get_float_data(ticker)
    return results

def main():
    """
    Command line interface for the float scraper
    Usage: python float_scraper.py TICKER1 TICKER2 ...
    Returns JSON with ticker -> float mapping
    """
    if len(sys.argv) < 2:
        print("Usage: python float_scraper.py TICKER1 TICKER2 ...", file=sys.stderr)
        sys.exit(1)
    
    tickers = sys.argv[1:]
    results = get_multiple_floats(tickers)
    
    # Output as JSON for easy parsing by Node.js
    print(json.dumps(results))

if __name__ == "__main__":
    main()