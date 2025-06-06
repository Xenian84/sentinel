#!/usr/bin/env python3
import yfinance as yf
import json
import sys
from typing import Optional, Dict

def get_float_data(ticker: str) -> Optional[float]:
    """
    Get float shares data using yfinance library
    Returns float shares in millions, or None if not found
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Try to get float from various yfinance fields
        float_shares = None
        
        if 'floatShares' in info and info['floatShares']:
            float_shares = info['floatShares']
        elif 'impliedSharesOutstanding' in info and info['impliedSharesOutstanding']:
            float_shares = info['impliedSharesOutstanding']
        elif 'sharesOutstanding' in info and info['sharesOutstanding']:
            # Use shares outstanding as fallback
            float_shares = info['sharesOutstanding']
        
        if float_shares and float_shares > 0:
            # Convert to millions for consistency
            return float_shares / 1000000
        
        return None
        
    except Exception as e:
        print(f"Error fetching float data for {ticker}: {e}", file=sys.stderr)
        return None

def get_multiple_floats(tickers: list) -> Dict[str, Optional[float]]:
    """
    Get float data for multiple tickers using yfinance
    """
    results = {}
    for ticker in tickers:
        results[ticker] = get_float_data(ticker)
    return results

def main():
    """
    Command line interface for yfinance float scraper
    """
    if len(sys.argv) < 2:
        print("Usage: python float_scraper_yfinance.py TICKER1 TICKER2 ...", file=sys.stderr)
        sys.exit(1)
    
    tickers = sys.argv[1:]
    results = get_multiple_floats(tickers)
    print(json.dumps(results))

if __name__ == "__main__":
    main()