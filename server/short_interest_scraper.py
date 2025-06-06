#!/usr/bin/env python3
"""
Short Interest and Short Ratio Data Scraper
Fetches short interest and short ratio data for stock symbols
"""

import sys
import json
import requests
import yfinance as yf
from typing import Dict, Optional, Tuple
import time
from bs4 import BeautifulSoup
import re

def get_short_data_from_finviz(ticker: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Scrape short interest and short ratio from Finviz
    Returns (short_interest_percentage, short_ratio)
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        url = f'https://finviz.com/quote.ashx?t={ticker}'
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the table with financial data
            tables = soup.find_all('table', {'class': 'snapshot-table2'})
            
            short_interest = None
            short_ratio = None
            
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    for i in range(0, len(cells), 2):
                        if i + 1 < len(cells):
                            label = cells[i].get_text(strip=True)
                            value = cells[i + 1].get_text(strip=True)
                            
                            if 'Short Float' in label or 'Short Interest' in label:
                                # Extract percentage
                                match = re.search(r'(\d+\.?\d*)%', value)
                                if match:
                                    short_interest = float(match.group(1))
                            
                            elif 'Short Ratio' in label:
                                # Extract ratio number
                                match = re.search(r'(\d+\.?\d*)', value)
                                if match:
                                    short_ratio = float(match.group(1))
            
            return short_interest, short_ratio
            
    except Exception as e:
        print(f"Finviz error for {ticker}: {e}", file=sys.stderr)
        return None, None

def get_short_data_from_yfinance(ticker: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get short data from yfinance
    Returns (short_interest_percentage, short_ratio)
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        short_interest = None
        short_ratio = None
        
        # Extract short float percentage
        if 'shortPercentOfFloat' in info and info['shortPercentOfFloat']:
            short_interest = float(info['shortPercentOfFloat']) * 100
        elif 'sharesShort' in info and 'floatShares' in info:
            if info['sharesShort'] and info['floatShares'] and info['floatShares'] > 0:
                short_interest = (float(info['sharesShort']) / float(info['floatShares'])) * 100
        
        # Extract short ratio (days to cover)
        if 'shortRatio' in info and info['shortRatio']:
            short_ratio = float(info['shortRatio'])
        
        return short_interest, short_ratio
        
    except Exception as e:
        print(f"yfinance error for {ticker}: {e}", file=sys.stderr)
        return None, None

def get_short_data(ticker: str) -> Dict[str, Optional[float]]:
    """
    Get short interest and short ratio data from multiple sources
    Returns dictionary with shortInterest and shortRatio
    """
    # Try yfinance first
    short_interest, short_ratio = get_short_data_from_yfinance(ticker)
    
    # If yfinance doesn't have data, try Finviz
    if short_interest is None or short_ratio is None:
        finviz_interest, finviz_ratio = get_short_data_from_finviz(ticker)
        
        if short_interest is None:
            short_interest = finviz_interest
        if short_ratio is None:
            short_ratio = finviz_ratio
    
    return {
        'shortInterest': short_interest,
        'shortRatio': short_ratio
    }

def get_multiple_short_data(tickers: list) -> Dict[str, Dict[str, Optional[float]]]:
    """
    Get short data for multiple tickers with rate limiting
    """
    results = {}
    
    for i, ticker in enumerate(tickers):
        try:
            # Add rate limiting with progressive batching
            if i > 0:
                if i % 20 == 0:  # Longer pause every 20 requests
                    time.sleep(2.0)
                else:
                    time.sleep(0.1)  # Reduced to 100ms for faster processing
            
            short_data = get_short_data(ticker)
            results[ticker] = short_data
            
            # Print progress
            if short_data['shortInterest'] is not None or short_data['shortRatio'] is not None:
                print(f"✓ {ticker}: Short Interest={short_data['shortInterest']}%, Short Ratio={short_data['shortRatio']}", file=sys.stderr)
            else:
                print(f"✗ {ticker}: No short data available", file=sys.stderr)
                
        except Exception as e:
            print(f"Error processing {ticker}: {e}", file=sys.stderr)
            results[ticker] = {'shortInterest': None, 'shortRatio': None}
    
    return results

def main():
    """
    Command line interface for the short interest scraper
    Usage: python short_interest_scraper.py TICKER1 TICKER2 ...
    Returns JSON with ticker -> {shortInterest, shortRatio} mapping
    """
    if len(sys.argv) < 2:
        print("Usage: python short_interest_scraper.py TICKER1 TICKER2 ...", file=sys.stderr)
        sys.exit(1)
    
    tickers = sys.argv[1:]
    results = get_multiple_short_data(tickers)
    
    # Output JSON result
    print(json.dumps(results))

if __name__ == "__main__":
    main()