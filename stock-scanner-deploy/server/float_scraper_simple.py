#!/usr/bin/env python3
import requests
import json
import sys
import time
from typing import Optional, Dict

def get_float_from_polygon(ticker: str, api_key: str) -> Optional[float]:
    """
    Get float data from Polygon.io which often includes float information
    """
    try:
        url = f"https://api.polygon.io/v3/reference/tickers/{ticker}?apikey={api_key}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'results' in data:
                # Look for float or shares outstanding
                results = data['results']
                if 'share_class_shares_outstanding' in results:
                    return results['share_class_shares_outstanding'] / 1000000  # Convert to millions
                if 'weighted_shares_outstanding' in results:
                    return results['weighted_shares_outstanding'] / 1000000
        return None
    except Exception as e:
        print(f"Polygon error for {ticker}: {e}", file=sys.stderr)
        return None

def get_float_from_finviz(ticker: str) -> Optional[float]:
    """
    Scrape float data from Finviz which has cleaner HTML structure
    """
    try:
        url = f"https://finviz.com/quote.ashx?t={ticker}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            html = response.text
            # Look for Shs Float in Finviz table
            import re
            patterns = [
                r'Shs Float</td><td[^>]*>([^<]+)',
                r'Float</td><td[^>]*>([^<]+)',
                r'Shares Float[^>]*>([^<]+)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, html)
                if match:
                    value_str = match.group(1).strip()
                    # Parse value like "55.07M" or "1.23B"
                    if 'M' in value_str:
                        return float(value_str.replace('M', ''))
                    elif 'B' in value_str:
                        return float(value_str.replace('B', '')) * 1000
                    elif 'K' in value_str:
                        return float(value_str.replace('K', '')) / 1000
        return None
    except Exception as e:
        print(f"Finviz error for {ticker}: {e}", file=sys.stderr)
        return None

def get_float_data(ticker: str) -> Optional[float]:
    """
    Try multiple sources to get accurate float data
    """
    # Try Finviz first (usually most reliable for float data)
    float_val = get_float_from_finviz(ticker)
    if float_val:
        return float_val
    
    # Try Polygon as backup if API key available
    api_key = "WMw1jpvZl9LzxCBGnpDq0QCJgrxBPkUo"  # Use the same key from the main app
    float_val = get_float_from_polygon(ticker, api_key)
    if float_val:
        return float_val
    
    return None

def get_multiple_floats(tickers: list) -> Dict[str, Optional[float]]:
    """
    Get float data for multiple tickers with rate limiting
    """
    results = {}
    for i, ticker in enumerate(tickers):
        results[ticker] = get_float_data(ticker)
        # Add small delay to avoid rate limiting
        if i < len(tickers) - 1:
            time.sleep(0.1)
    return results

def main():
    """
    Command line interface
    """
    if len(sys.argv) < 2:
        print("Usage: python float_scraper_simple.py TICKER1 TICKER2 ...", file=sys.stderr)
        sys.exit(1)
    
    tickers = sys.argv[1:]
    results = get_multiple_floats(tickers)
    print(json.dumps(results))

if __name__ == "__main__":
    main()