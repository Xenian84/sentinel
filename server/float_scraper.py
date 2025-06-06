#!/usr/bin/env python3
import re
import json
import requests
import sys
from typing import Optional, Dict, Any

def get_float_data(ticker: str) -> Optional[float]:
    """
    Scrape float shares data from Yahoo Finance for a given ticker
    Returns float shares as a number, or None if not found
    """
    try:
        url = f'https://finance.yahoo.com/quote/{ticker}/key-statistics'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text

        # Extract the JSON data from the page
        pattern = r'root\.App\.main = (.*?);\n'
        match = re.search(pattern, html)

        if match:
            try:
                data = json.loads(match.group(1))
                quote_summary = data['context']['dispatcher']['stores']['QuoteSummaryStore']
                
                # Try to get float shares from defaultKeyStatistics
                if 'defaultKeyStatistics' in quote_summary:
                    float_shares = quote_summary['defaultKeyStatistics'].get('floatShares')
                    if float_shares and 'raw' in float_shares:
                        return float_shares['raw']
                
                # Fallback: try to get from summaryDetail
                if 'summaryDetail' in quote_summary:
                    float_shares = quote_summary['summaryDetail'].get('floatShares')
                    if float_shares and 'raw' in float_shares:
                        return float_shares['raw']
                        
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error parsing data for {ticker}: {e}", file=sys.stderr)
                return None
        
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