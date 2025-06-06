#!/usr/bin/env python3
import re
import json
import requests
import sys
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

def get_float_data(ticker: str) -> Optional[float]:
    """
    Scrape float shares data from Yahoo Finance for a given ticker
    Returns float shares as a number, or None if not found
    """
    try:
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
        
        # Try multiple Yahoo Finance URLs in order of preference
        urls_to_try = [
            f'https://finance.yahoo.com/quote/{ticker}',
            f'https://finance.yahoo.com/quote/{ticker}/key-statistics',
            f'https://finance.yahoo.com/quote/{ticker}/statistics'
        ]
        
        html = None
        for url in urls_to_try:
            try:
                response = session.get(url, timeout=15)
                if response.status_code == 200:
                    html = response.text
                    break
            except requests.exceptions.RequestException:
                continue
        
        if not html:
            return None

        # Method 1: Parse HTML with BeautifulSoup to find Float in Share Statistics
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Look for "Float" text followed by a number
            float_elements = soup.find_all(string=re.compile(r'Float', re.IGNORECASE))
            for element in float_elements:
                parent = element.parent
                if parent:
                    # Look for numbers in the same row or nearby elements
                    row = parent.find_parent('tr') or parent.find_parent('div')
                    if row:
                        # Find all text containing numbers with M, B, K suffixes
                        number_pattern = r'(\d+(?:,\d{3})*(?:\.\d+)?)\s*([MBK]?)'
                        numbers = re.findall(number_pattern, row.get_text(), re.IGNORECASE)
                        for num_str, unit in numbers:
                            try:
                                num_val = float(num_str.replace(',', ''))
                                if unit.upper() == 'B':
                                    return num_val * 1000  # Convert to millions
                                elif unit.upper() == 'M':
                                    return num_val  # Already in millions
                                elif unit.upper() == 'K':
                                    return num_val / 1000  # Convert to millions
                                elif num_val > 1000000:  # Assume raw shares, convert to millions
                                    return num_val / 1000000
                                elif num_val > 1:  # Likely already in millions
                                    return num_val
                            except ValueError:
                                continue
        except Exception:
            pass

        # Method 2: Extract JSON data from root.App.main
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

        # Method 3: Enhanced pattern matching for float data
        float_patterns = [
            # Look for Float followed by value in various formats
            r'Float["\s]*[^>]*?>([^<]*?([0-9,]+\.?[0-9]*)\s*([MBK]))',
            r'Float.*?([0-9,]+\.?[0-9]*)\s*([MBK])',
            r'"floatShares"[^}]*?"fmt":"([^"]*)"',
            r'"floatShares"[^}]*?"raw":([0-9.]+)',
            # Look in table data
            r'>Float<.*?<td[^>]*>([^<]*?([0-9,]+\.?[0-9]*)\s*([MBK]))',
            # Generic patterns for share statistics
            r'Shares Outstanding.*?([0-9,]+\.?[0-9]*)\s*([MBK])',
            r'Outstanding.*?([0-9,]+\.?[0-9]*)\s*([MBK])'
        ]
        
        for pattern in float_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            if matches:
                try:
                    if len(matches[0]) == 2:  # Number and unit
                        num_str, unit = matches[0]
                        num_str = num_str.replace(',', '')
                        float_val = float(num_str)
                        
                        # Convert based on unit
                        if unit.upper() == 'B':
                            return float_val * 1000  # Convert billions to millions
                        elif unit.upper() == 'M':
                            return float_val  # Already in millions
                        elif unit.upper() == 'K':
                            return float_val / 1000  # Convert thousands to millions
                        else:
                            return float_val / 1000000  # Convert raw shares to millions
                    else:  # Just number or formatted string
                        num_str = str(matches[0]).replace(',', '')
                        # Check if it contains M, B, K
                        if 'M' in num_str.upper():
                            return float(num_str.upper().replace('M', ''))
                        elif 'B' in num_str.upper():
                            return float(num_str.upper().replace('B', '')) * 1000
                        elif 'K' in num_str.upper():
                            return float(num_str.upper().replace('K', '')) / 1000
                        else:
                            return float(num_str)
                except (ValueError, IndexError):
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