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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        session = requests.Session()
        session.headers.update(headers)
        response = session.get(url, timeout=15)
        response.raise_for_status()
        html = response.text

        # Method 1: Extract JSON data from root.App.main
        pattern = r'root\.App\.main = (.*?);\n'
        match = re.search(pattern, html)

        if match:
            try:
                data = json.loads(match.group(1))
                quote_summary = data.get('context', {}).get('dispatcher', {}).get('stores', {}).get('QuoteSummaryStore', {})
                
                # Try multiple locations for float shares
                locations = [
                    'defaultKeyStatistics',
                    'summaryDetail', 
                    'price',
                    'financialData'
                ]
                
                for location in locations:
                    if location in quote_summary:
                        section = quote_summary[location]
                        if section and isinstance(section, dict):
                            float_shares = section.get('floatShares')
                            if float_shares and isinstance(float_shares, dict) and 'raw' in float_shares:
                                return float_shares['raw']
                        
            except (json.JSONDecodeError, KeyError) as e:
                print(f"JSON parsing error for {ticker}: {e}", file=sys.stderr)

        # Method 2: Alternative JSON pattern
        alt_pattern = r'"floatShares":\s*\{\s*"raw":\s*([0-9.]+)'
        alt_match = re.search(alt_pattern, html)
        if alt_match:
            try:
                return float(alt_match.group(1))
            except ValueError:
                pass

        # Method 3: Search for float in text content
        float_patterns = [
            r'Float[^0-9]*([0-9,]+\.?[0-9]*)[^0-9]*[MBK]?',
            r'Shares Outstanding[^0-9]*([0-9,]+\.?[0-9]*)[^0-9]*[MBK]?'
        ]
        
        for pattern in float_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                try:
                    # Convert text number to float
                    num_str = matches[0].replace(',', '')
                    return float(num_str)
                except ValueError:
                    continue
        
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