const US_STOCKS = new Set([
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'WIT'
]);

export function isUsStock(symbol?: string): boolean {
  if (!symbol) return false;
  const clean = symbol.trim().toUpperCase().replace(/\..*$/, '');
  return US_STOCKS.has(clean);
}

export function getCurrencySymbol(symbol?: string): string {
  return isUsStock(symbol) ? '$' : '₹';
}

export function formatPrice(price: number, symbol?: string): string {
  const curr = getCurrencySymbol(symbol);
  const locale = curr === '$' ? 'en-US' : 'en-IN';
  return `${curr}${price.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
