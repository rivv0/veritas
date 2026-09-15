export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  timeAgo: string;
  tag?: 'Bullish' | 'Bearish' | 'Earnings' | 'Deal' | 'Analyst' | 'Regulatory' | 'General';
}

const COMPANY_NAME_MAP: Record<string, string> = {
  RELIANCE: 'Reliance Industries',
  TCS: 'Tata Consultancy Services',
  INFY: 'Infosys',
  HDFCBANK: 'HDFC Bank',
  ICICIBANK: 'ICICI Bank',
  SBIN: 'State Bank of India',
  BHARTIARTL: 'Bharti Airtel',
  ITC: 'ITC Limited',
  TATAMOTORS: 'Tata Motors',
  LT: 'Larsen & Toubro',
  BAJFINANCE: 'Bajaj Finance',
  MARUTI: 'Maruti Suzuki',
  SUNPHARMA: 'Sun Pharma',
  TITAN: 'Titan Company',
  AXISBANK: 'Axis Bank',
  KOTAKBANK: 'Kotak Mahindra Bank',
  WIPRO: 'Wipro',
  HCLTECH: 'HCL Technologies',
  ZOMATO: 'Zomato',
  PAYTM: 'Paytm One97',
  JIOFIN: 'Jio Financial Services',
  NVDA: 'Nvidia',
  AAPL: 'Apple',
  TSLA: 'Tesla',
  MSFT: 'Microsoft',
};

export class NewsService {
  private cache: Map<string, { data: NewsItem[]; expiresAt: number }> = new Map();
  private cacheTTLMs = 60 * 1000; // 60 seconds cache

  async fetchNewsForSymbols(symbols: string[]): Promise<NewsItem[]> {
    if (!symbols || symbols.length === 0) return [];

    const cacheKey = symbols.sort().join(',');
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const allNews: NewsItem[] = [];
    const targetSymbols = symbols.slice(0, 10); // prioritize first 10 shortlisted symbols

    await Promise.allSettled(
      targetSymbols.map(async (sym) => {
        try {
          const items = await this.fetchSingleSymbolNews(sym);
          allNews.push(...items);
        } catch (e) {
          // ignore single symbol failure
        }
      })
    );

    // Sort by most recent
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Deduplicate by title similarity
    const seenTitles = new Set<string>();
    const deduplicated = allNews.filter((item) => {
      const cleanKey = item.title.slice(0, 40).toLowerCase();
      if (seenTitles.has(cleanKey)) return false;
      seenTitles.add(cleanKey);
      return true;
    });

    const finalNews = deduplicated.slice(0, 12);
    this.cache.set(cacheKey, {
      data: finalNews,
      expiresAt: Date.now() + this.cacheTTLMs,
    });

    return finalNews;
  }

  private async fetchSingleSymbolNews(symbol: string): Promise<NewsItem[]> {
    const qName = COMPANY_NAME_MAP[symbol] || symbol;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      qName + ' stock news'
    )}&hl=en-IN&gl=IN&ceid=IN:en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const items: NewsItem[] = [];
    const regex =
      /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<source[^>]*>(.*?)<\/source>/g;

    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = regex.exec(xml)) !== null && count < 2) {
      let title = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      // Strip publisher suffix from title if present
      if (title.includes(' - ')) {
        title = title.split(' - ').slice(0, -1).join(' - ').trim();
      }

      const publisher = match[4].replace(/&amp;/g, '&');
      const link = match[2];
      const pubDateStr = match[3];
      const publishedAt = new Date(pubDateStr).toISOString();
      const timeAgo = this.calculateTimeAgo(new Date(pubDateStr));
      const tag = this.inferTag(title);

      items.push({
        id: `news-${symbol.toLowerCase()}-${count}-${Date.now()}`,
        symbol,
        title,
        publisher,
        link,
        publishedAt,
        timeAgo,
        tag,
      });

      count++;
    }

    return items;
  }

  private calculateTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private inferTag(title: string): NewsItem['tag'] {
    return inferNewsTag(title);
  }
}

export function inferNewsTag(title: string): NewsItem['tag'] {
  const lower = title.toLowerCase();

  // 1. Regulatory events
  if (
    lower.includes('regulator') ||
    lower.includes('sebi') ||
    lower.includes('rbi') ||
    lower.includes('clearance') ||
    lower.includes('court') ||
    lower.includes('tax')
  ) {
    return 'Regulatory';
  }

  // 2. Earnings & Financial Results
  if (
    lower.includes('quarter') ||
    lower.includes('q1') ||
    lower.includes('q2') ||
    lower.includes('q3') ||
    lower.includes('q4') ||
    lower.includes('earnings') ||
    lower.includes('net profit') ||
    lower.includes('financial result')
  ) {
    return 'Earnings';
  }

  // 3. Deals & Contracts
  if (
    lower.includes('order win') ||
    lower.includes('contract') ||
    lower.includes('acquisition') ||
    lower.includes('partnership') ||
    lower.includes('joint venture') ||
    lower.includes('bags order')
  ) {
    return 'Deal';
  }

  // 4. Analyst & Brokerage
  if (
    lower.includes('target price') ||
    lower.includes('rating') ||
    lower.includes('brokerage') ||
    lower.includes('reiterates buy') ||
    lower.includes('upgrade') ||
    lower.includes('downgrade')
  ) {
    return 'Analyst';
  }

  // 5. Bearish sentiment indicators
  if (
    lower.includes('sink') ||
    lower.includes('sinks') ||
    lower.includes('slump') ||
    lower.includes('slumps') ||
    lower.includes('crash') ||
    lower.includes('crashes') ||
    lower.includes('plunge') ||
    lower.includes('plunges') ||
    lower.includes('tumble') ||
    lower.includes('tumbles') ||
    lower.includes('decline') ||
    lower.includes('declines') ||
    lower.includes('drop') ||
    lower.includes('drops') ||
    lower.includes('fall') ||
    lower.includes('falls') ||
    lower.includes('falling') ||
    lower.includes('down') ||
    lower.includes('52-week low') ||
    lower.includes('lows') ||
    lower.includes('bear') ||
    lower.includes('loss') ||
    lower.includes('losses') ||
    lower.includes('weak') ||
    lower.includes('weakness') ||
    lower.includes('selloff')
  ) {
    return 'Bearish';
  }

  // 6. Bullish sentiment indicators
  if (
    lower.includes('surge') ||
    lower.includes('surges') ||
    lower.includes('jump') ||
    lower.includes('jumps') ||
    lower.includes('gain') ||
    lower.includes('gains') ||
    lower.includes('rally') ||
    lower.includes('rallies') ||
    lower.includes('bull') ||
    lower.includes('52-week high') ||
    lower.includes('record high') ||
    lower.includes('upbeat') ||
    lower.includes('soar') ||
    lower.includes('soars')
  ) {
    return 'Bullish';
  }

  return 'General';
}

export const newsService = new NewsService();
