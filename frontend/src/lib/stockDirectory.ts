export interface StockItem {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
}

export const STOCK_DIRECTORY: StockItem[] = [
  // Honorary & Core Indian Tech / Fintech
  { symbol: 'GROWW', name: 'Groww (Billionbrains Garage Ventures)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'ZOMATO', name: 'Zomato Limited (Eternal)', exchange: 'NSE', sector: 'Consumer Tech' },
  { symbol: 'PAYTM', name: 'One97 Communications (Paytm)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'BSE', name: 'BSE Limited', exchange: 'NSE', sector: 'Exchange' },
  { symbol: 'CDSL', name: 'Central Depository Services (India)', exchange: 'NSE', sector: 'Financial Infrastructure' },
  { symbol: 'MCX', name: 'Multi Commodity Exchange of India', exchange: 'NSE', sector: 'Exchange' },

  // Indian Large Caps - Nifty 50
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy & Retail' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', sector: 'Capital Goods' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', exchange: 'NSE', sector: 'Materials' },
  { symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp of India Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', exchange: 'NSE', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd.', exchange: 'NSE', sector: 'Renewables' },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd.', exchange: 'NSE', sector: 'Power' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd.", exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories", exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'CIPLA', name: 'Cipla Limited', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd. (Royal Enfield)', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corp Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', exchange: 'NSE', sector: 'Materials' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },

  // Defence, Railway & High Momentum Indian Equities
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TRENT', name: 'Trent Ltd. (Westside / Zudio)', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'DMART', name: 'Avenue Supermarts (DMart)', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'TATACHEM', name: 'Tata Chemicals Ltd.', exchange: 'NSE', sector: 'Chemicals' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism', exchange: 'NSE', sector: 'Railways & Tourism' },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corp', exchange: 'NSE', sector: 'Railways & Finance' },
  { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', exchange: 'NSE', sector: 'Railways' },
  { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', exchange: 'NSE', sector: 'Renewables' },
  { symbol: 'YESBANK', name: 'Yes Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'VEDL', name: 'Vedanta Limited', exchange: 'NSE', sector: 'Metals & Mining' },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd.', exchange: 'NSE', sector: 'Electricals' },
  { symbol: 'HAVELLS', name: 'Havells India Ltd.', exchange: 'NSE', sector: 'Consumer Durables' },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd.', exchange: 'NSE', sector: 'Automotive Tech' },
  { symbol: 'COFORGE', name: 'Coforge Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'DLF', name: 'DLF Limited', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd.', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'PFC', name: 'Power Finance Corporation', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'RECLTD', name: 'REC Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'IOC', name: 'Indian Oil Corporation', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'NMDC', name: 'NMDC Limited', exchange: 'NSE', sector: 'Mining' },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd.', exchange: 'NSE', sector: 'Metals' },

  // Major US Tech Titans & Global Equities
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Consumer Tech' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Software & Cloud' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', sector: 'Internet' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'E-Commerce & Cloud' },
  { symbol: 'META', name: 'Meta Platforms Inc. (Facebook/Instagram)', exchange: 'NASDAQ', sector: 'Social Media & AI' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'EV & Clean Energy' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', sector: 'Entertainment' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', sector: 'AI & Defence Software' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', sector: 'Crypto Infrastructure' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE', sector: 'Mobility & Delivery' },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', sector: 'Entertainment' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Ltd.', exchange: 'NYSE', sector: 'E-Commerce' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', exchange: 'NYSE', sector: 'Enterprise Software' },
  { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', sector: 'Cloud & Database' },
  { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', sector: 'Creative Software' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'QCOM', name: 'Qualcomm Incorporated', exchange: 'NASDAQ', sector: 'Wireless & Chips' },
  { symbol: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', sector: 'Chip Architecture' },
  { symbol: 'MU', name: 'Micron Technology, Inc.', exchange: 'NASDAQ', sector: 'Memory & Storage' },
  { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', exchange: 'NASDAQ', sector: 'AI Server Hardware' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings, Inc.', exchange: 'NASDAQ', sector: 'Cybersecurity' },
  { symbol: 'PANW', name: 'Palo Alto Networks, Inc.', exchange: 'NASDAQ', sector: 'Cybersecurity' },
  { symbol: 'NOW', name: 'ServiceNow, Inc.', exchange: 'NYSE', sector: 'Enterprise Workflow' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', sector: 'Data Cloud' },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', exchange: 'NASDAQ', sector: 'Fintech' },
  { symbol: 'HOOD', name: 'Robinhood Markets, Inc.', exchange: 'NASDAQ', sector: 'Fintech Brokerage' },
  { symbol: 'SOFI', name: 'SoFi Technologies, Inc.', exchange: 'NASDAQ', sector: 'Fintech Banking' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA', sector: 'Index ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', exchange: 'NASDAQ', sector: 'Index ETF' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Payments' },
  { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', sector: 'Payments' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Banking' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Retail' },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', exchange: 'NASDAQ', sector: 'Retail' },
];

const STOCK_MAP = new Map<string, StockItem>();
STOCK_DIRECTORY.forEach((item) => {
  STOCK_MAP.set(item.symbol.toUpperCase(), item);
});

export function getStockName(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  const item = STOCK_MAP.get(clean);
  if (item) return item.name;
  return clean;
}

export function getStockItem(symbol: string): StockItem | undefined {
  return STOCK_MAP.get(symbol.trim().toUpperCase());
}

export function searchLocalStocks(query: string): StockItem[] {
  const q = query.trim().toUpperCase();
  if (!q) return STOCK_DIRECTORY.slice(0, 15);

  const exactSym: StockItem[] = [];
  const startSym: StockItem[] = [];
  const containSym: StockItem[] = [];
  const nameMatch: StockItem[] = [];

  for (const item of STOCK_DIRECTORY) {
    const sym = item.symbol.toUpperCase();
    const name = item.name.toUpperCase();

    if (sym === q) {
      exactSym.push(item);
    } else if (sym.startsWith(q)) {
      startSym.push(item);
    } else if (sym.includes(q)) {
      containSym.push(item);
    } else if (name.includes(q)) {
      nameMatch.push(item);
    }
  }

  return [...exactSym, ...startSym, ...containSym, ...nameMatch].slice(0, 15);
}
