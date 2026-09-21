export type MarketExchange = 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'UNKNOWN';

const US_EQUITIES = new Set(['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'WIT']);

export interface MarketSessionInfo {
  exchange: MarketExchange;
  isOpen: boolean;
  sessionState: 'REGULAR' | 'CLOSED' | 'PRE_MARKET_SOON';
  nextOpen: Date;
  minutesToOpen: number;
}

export class CalendarService {
  /**
   * Determine the primary exchange for a given symbol
   */
  getExchange(symbol: string): MarketExchange {
    const clean = symbol.trim().toUpperCase();
    if (US_EQUITIES.has(clean)) return 'NASDAQ';
    if (clean.endsWith('.NS') || !clean.includes('.')) return 'NSE';
    if (clean.endsWith('.BO')) return 'BSE';
    return 'UNKNOWN';
  }

  /**
   * Check if the market is open for a given symbol at a given date/time
   */
  isMarketOpen(symbol: string, now = new Date()): boolean {
    const session = this.getMarketSession(symbol, now);
    return session.isOpen;
  }

  /**
   * Calculate detailed session info including next open and minutes to open
   */
  getMarketSession(symbol: string, now = new Date()): MarketSessionInfo {
    const exchange = this.getExchange(symbol);
    const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    if (exchange === 'NASDAQ' || exchange === 'NYSE') {
      return this.getUsSession(now, exchange);
    } else {
      return this.getIndianSession(now, exchange);
    }
  }

  /**
   * NSE / BSE trading session:
   * Monday to Friday, 09:15 to 15:30 IST (UTC+5:30)
   * 09:15 IST = 03:45 UTC
   * 15:30 IST = 10:00 UTC
   */
  private getIndianSession(now: Date, exchange: MarketExchange): MarketSessionInfo {
    const day = now.getUTCDay();
    // Minutes since UTC midnight
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istOpenMinutes = 3 * 60 + 45; // 03:45 UTC = 09:15 IST
    const istCloseMinutes = 10 * 60;    // 10:00 UTC = 15:30 IST

    const isWeekday = day >= 1 && day <= 5;
    const isTradingHours = utcMinutes >= istOpenMinutes && utcMinutes < istCloseMinutes;
    const isOpen = isWeekday && isTradingHours;

    // Check if 5 minutes before open (03:40 UTC to 03:45 UTC)
    const isPreMarketSoon = isWeekday && utcMinutes >= istOpenMinutes - 5 && utcMinutes < istOpenMinutes;

    // Next open calculation
    const nextOpen = new Date(now);
    if (isWeekday && utcMinutes < istOpenMinutes) {
      nextOpen.setUTCHours(3, 45, 0, 0);
    } else {
      let daysToAdd = 1;
      if (day === 5) daysToAdd = 3; // Friday -> Monday
      else if (day === 6) daysToAdd = 2; // Saturday -> Monday
      else if (day === 0) daysToAdd = 1; // Sunday -> Monday
      nextOpen.setUTCDate(nextOpen.getUTCDate() + daysToAdd);
      nextOpen.setUTCHours(3, 45, 0, 0);
    }

    const minutesToOpen = Math.max(0, Math.round((nextOpen.getTime() - now.getTime()) / 60000));

    return {
      exchange,
      isOpen,
      sessionState: isOpen ? 'REGULAR' : isPreMarketSoon ? 'PRE_MARKET_SOON' : 'CLOSED',
      nextOpen,
      minutesToOpen,
    };
  }

  /**
   * US Equities trading session:
   * Monday to Friday, 09:30 to 16:00 US Eastern
   * Eastern is UTC-4 (EDT) or UTC-5 (EST). We compute based on US daylight saving.
   */
  private getUsSession(now: Date, exchange: MarketExchange): MarketSessionInfo {
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;

    // Check daylight saving time in US (approx: 2nd Sun March to 1st Sun Nov)
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-indexed: 2=March, 10=Nov
    const isDst = month > 2 && month < 10;
    const utcOffsetHours = isDst ? 4 : 5; // EDT is UTC-4, EST is UTC-5

    const usOpenUtcMinutes = (9 + utcOffsetHours) * 60 + 30; // 13:30 or 14:30 UTC
    const usCloseUtcMinutes = (16 + utcOffsetHours) * 60;    // 20:00 or 21:00 UTC

    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const isTradingHours = utcMinutes >= usOpenUtcMinutes && utcMinutes < usCloseUtcMinutes;
    const isOpen = isWeekday && isTradingHours;

    const isPreMarketSoon = isWeekday && utcMinutes >= usOpenUtcMinutes - 5 && utcMinutes < usOpenUtcMinutes;

    const nextOpen = new Date(now);
    if (isWeekday && utcMinutes < usOpenUtcMinutes) {
      nextOpen.setUTCHours(9 + utcOffsetHours, 30, 0, 0);
    } else {
      let daysToAdd = 1;
      if (day === 5) daysToAdd = 3;
      else if (day === 6) daysToAdd = 2;
      else if (day === 0) daysToAdd = 1;
      nextOpen.setUTCDate(nextOpen.getUTCDate() + daysToAdd);
      nextOpen.setUTCHours(9 + utcOffsetHours, 30, 0, 0);
    }

    const minutesToOpen = Math.max(0, Math.round((nextOpen.getTime() - now.getTime()) / 60000));

    return {
      exchange,
      isOpen,
      sessionState: isOpen ? 'REGULAR' : isPreMarketSoon ? 'PRE_MARKET_SOON' : 'CLOSED',
      nextOpen,
      minutesToOpen,
    };
  }

  /**
   * Are ANY tracked markets currently in regular trading hours?
   */
  isAnyMarketOpen(symbols: string[], now = new Date()): boolean {
    return symbols.some((sym) => this.isMarketOpen(sym, now));
  }
}

export const calendarService = new CalendarService();
