// Client-safe sector / industry / region map for popular tickers.
// Used by both the simulation Holding analyses and the real-portfolio page.
// Server-only Yahoo fallback lives in `portfolio-server.ts`.

export interface SectorMeta {
  sector: string
  industry: string
  region: string
}

export const KNOWN_SECTORS: Record<string, SectorMeta> = {
  // ── Mega-cap tech ──────────────────────────────────────────────────────────
  AAPL:  { sector: "Technology",            industry: "Consumer Electronics",  region: "US" },
  MSFT:  { sector: "Technology",            industry: "Software — Infrastructure", region: "US" },
  GOOG:  { sector: "Communication Services", industry: "Internet Content & Information", region: "US" },
  GOOGL: { sector: "Communication Services", industry: "Internet Content & Information", region: "US" },
  AMZN:  { sector: "Consumer Cyclical",     industry: "Internet Retail",       region: "US" },
  META:  { sector: "Communication Services", industry: "Internet Content & Information", region: "US" },
  NVDA:  { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  AMD:   { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  INTC:  { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  TSLA:  { sector: "Consumer Cyclical",     industry: "Auto Manufacturers",    region: "US" },
  NFLX:  { sector: "Communication Services", industry: "Entertainment",        region: "US" },
  DIS:   { sector: "Communication Services", industry: "Entertainment",        region: "US" },
  ORCL:  { sector: "Technology",            industry: "Software — Infrastructure", region: "US" },
  CRM:   { sector: "Technology",            industry: "Software — Application", region: "US" },
  ADBE:  { sector: "Technology",            industry: "Software — Infrastructure", region: "US" },
  CSCO:  { sector: "Technology",            industry: "Communication Equipment", region: "US" },
  IBM:   { sector: "Technology",            industry: "IT Services",           region: "US" },
  AVGO:  { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  QCOM:  { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  TXN:   { sector: "Technology",            industry: "Semiconductors",        region: "US" },
  // ── Financials ─────────────────────────────────────────────────────────────
  JPM:   { sector: "Financial Services",    industry: "Banks — Diversified",   region: "US" },
  BAC:   { sector: "Financial Services",    industry: "Banks — Diversified",   region: "US" },
  WFC:   { sector: "Financial Services",    industry: "Banks — Diversified",   region: "US" },
  GS:    { sector: "Financial Services",    industry: "Capital Markets",       region: "US" },
  MS:    { sector: "Financial Services",    industry: "Capital Markets",       region: "US" },
  C:     { sector: "Financial Services",    industry: "Banks — Diversified",   region: "US" },
  "BRK.B": { sector: "Financial Services",  industry: "Insurance — Diversified", region: "US" },
  "BRK-B": { sector: "Financial Services",  industry: "Insurance — Diversified", region: "US" },
  V:     { sector: "Financial Services",    industry: "Credit Services",       region: "US" },
  MA:    { sector: "Financial Services",    industry: "Credit Services",       region: "US" },
  AXP:   { sector: "Financial Services",    industry: "Credit Services",       region: "US" },
  BLK:   { sector: "Financial Services",    industry: "Asset Management",      region: "US" },
  SCHW:  { sector: "Financial Services",    industry: "Capital Markets",       region: "US" },
  PYPL:  { sector: "Financial Services",    industry: "Credit Services",       region: "US" },
  // ── Healthcare ─────────────────────────────────────────────────────────────
  JNJ:   { sector: "Healthcare", industry: "Drug Manufacturers — General", region: "US" },
  PFE:   { sector: "Healthcare", industry: "Drug Manufacturers — General", region: "US" },
  MRK:   { sector: "Healthcare", industry: "Drug Manufacturers — General", region: "US" },
  UNH:   { sector: "Healthcare", industry: "Healthcare Plans",             region: "US" },
  ABBV:  { sector: "Healthcare", industry: "Drug Manufacturers — General", region: "US" },
  LLY:   { sector: "Healthcare", industry: "Drug Manufacturers — General", region: "US" },
  TMO:   { sector: "Healthcare", industry: "Diagnostics & Research",       region: "US" },
  ABT:   { sector: "Healthcare", industry: "Medical Devices",              region: "US" },
  CVS:   { sector: "Healthcare", industry: "Healthcare Plans",             region: "US" },
  // ── Consumer ───────────────────────────────────────────────────────────────
  PG:    { sector: "Consumer Defensive", industry: "Household & Personal Products", region: "US" },
  KO:    { sector: "Consumer Defensive", industry: "Beverages — Non-Alcoholic",     region: "US" },
  PEP:   { sector: "Consumer Defensive", industry: "Beverages — Non-Alcoholic",     region: "US" },
  WMT:   { sector: "Consumer Defensive", industry: "Discount Stores",              region: "US" },
  COST:  { sector: "Consumer Defensive", industry: "Discount Stores",              region: "US" },
  MO:    { sector: "Consumer Defensive", industry: "Tobacco",                      region: "US" },
  PM:    { sector: "Consumer Defensive", industry: "Tobacco",                      region: "US" },
  HD:    { sector: "Consumer Cyclical",  industry: "Home Improvement Retail",      region: "US" },
  LOW:   { sector: "Consumer Cyclical",  industry: "Home Improvement Retail",      region: "US" },
  NKE:   { sector: "Consumer Cyclical",  industry: "Footwear & Accessories",       region: "US" },
  MCD:   { sector: "Consumer Cyclical",  industry: "Restaurants",                  region: "US" },
  SBUX:  { sector: "Consumer Cyclical",  industry: "Restaurants",                  region: "US" },
  TGT:   { sector: "Consumer Defensive", industry: "Discount Stores",              region: "US" },
  // ── Energy ─────────────────────────────────────────────────────────────────
  XOM:   { sector: "Energy", industry: "Oil & Gas Integrated", region: "US" },
  CVX:   { sector: "Energy", industry: "Oil & Gas Integrated", region: "US" },
  COP:   { sector: "Energy", industry: "Oil & Gas E&P",        region: "US" },
  OXY:   { sector: "Energy", industry: "Oil & Gas E&P",        region: "US" },
  MPC:   { sector: "Energy", industry: "Oil & Gas Refining & Marketing", region: "US" },
  PSX:   { sector: "Energy", industry: "Oil & Gas Refining & Marketing", region: "US" },
  // ── Industrials ────────────────────────────────────────────────────────────
  BA:    { sector: "Industrials", industry: "Aerospace & Defense", region: "US" },
  CAT:   { sector: "Industrials", industry: "Farm & Heavy Construction Machinery", region: "US" },
  GE:    { sector: "Industrials", industry: "Specialty Industrial Machinery", region: "US" },
  HON:   { sector: "Industrials", industry: "Conglomerates",       region: "US" },
  UPS:   { sector: "Industrials", industry: "Integrated Freight & Logistics", region: "US" },
  RTX:   { sector: "Industrials", industry: "Aerospace & Defense", region: "US" },
  LMT:   { sector: "Industrials", industry: "Aerospace & Defense", region: "US" },
  // ── Comms / Utilities ──────────────────────────────────────────────────────
  T:     { sector: "Communication Services", industry: "Telecom Services", region: "US" },
  VZ:    { sector: "Communication Services", industry: "Telecom Services", region: "US" },
  TMUS:  { sector: "Communication Services", industry: "Telecom Services", region: "US" },
  NEE:   { sector: "Utilities", industry: "Utilities — Regulated Electric", region: "US" },
  DUK:   { sector: "Utilities", industry: "Utilities — Regulated Electric", region: "US" },
  // ── Crypto-adjacent stocks ─────────────────────────────────────────────────
  COIN:  { sector: "Financial Services", industry: "Capital Markets",        region: "US" },
  MSTR:  { sector: "Technology",         industry: "Software — Application", region: "US" },
  MARA:  { sector: "Financial Services", industry: "Capital Markets",        region: "US" },
  RIOT:  { sector: "Financial Services", industry: "Capital Markets",        region: "US" },
  HOOD:  { sector: "Financial Services", industry: "Capital Markets",        region: "US" },
  // ── International (non-US) ─────────────────────────────────────────────────
  TSM:   { sector: "Technology",            industry: "Semiconductors",                 region: "APAC" },
  BABA:  { sector: "Consumer Cyclical",     industry: "Internet Retail",                region: "APAC" },
  BIDU:  { sector: "Communication Services", industry: "Internet Content & Information", region: "APAC" },
  NIO:   { sector: "Consumer Cyclical",     industry: "Auto Manufacturers",             region: "APAC" },
  ASML:  { sector: "Technology",            industry: "Semiconductor Equipment",        region: "EU" },
  NVO:   { sector: "Healthcare",            industry: "Drug Manufacturers — General",   region: "EU" },
  SHOP:  { sector: "Technology",            industry: "Software — Application",         region: "Americas" },
  // ── ETFs — sector "ETF / Diversified" or by sector slice ──────────────────
  SPY:   { sector: "ETF / Diversified", industry: "Large-Cap Blend",     region: "US" },
  VOO:   { sector: "ETF / Diversified", industry: "Large-Cap Blend",     region: "US" },
  IVV:   { sector: "ETF / Diversified", industry: "Large-Cap Blend",     region: "US" },
  VTI:   { sector: "ETF / Diversified", industry: "Total Market",        region: "US" },
  QQQ:   { sector: "ETF / Diversified", industry: "Tech-Heavy",          region: "US" },
  IWM:   { sector: "ETF / Diversified", industry: "Small-Cap Blend",     region: "US" },
  DIA:   { sector: "ETF / Diversified", industry: "Large-Cap Blend",     region: "US" },
  VEA:   { sector: "ETF / Diversified", industry: "Developed Markets",   region: "Global" },
  VXUS:  { sector: "ETF / Diversified", industry: "Total Intl Market",   region: "Global" },
  VWO:   { sector: "ETF / Diversified", industry: "Emerging Markets",    region: "EM-Asia" },
  EFA:   { sector: "ETF / Diversified", industry: "Developed Markets",   region: "Global" },
  EEM:   { sector: "ETF / Diversified", industry: "Emerging Markets",    region: "Global" },
  ARKK:  { sector: "ETF / Diversified", industry: "Disruptive Innovation", region: "US" },
  ARKG:  { sector: "ETF / Diversified", industry: "Genomic Innovation",  region: "US" },
  XLF:   { sector: "ETF / Sector",      industry: "Financials Sector",   region: "US" },
  XLK:   { sector: "ETF / Sector",      industry: "Technology Sector",   region: "US" },
  XLE:   { sector: "ETF / Sector",      industry: "Energy Sector",       region: "US" },
  XLV:   { sector: "ETF / Sector",      industry: "Healthcare Sector",   region: "US" },
  XLY:   { sector: "ETF / Sector",      industry: "Cons. Cyclical Sector", region: "US" },
  XLI:   { sector: "ETF / Sector",      industry: "Industrials Sector",  region: "US" },
  XLU:   { sector: "ETF / Sector",      industry: "Utilities Sector",    region: "US" },
  XLP:   { sector: "ETF / Sector",      industry: "Cons. Defensive Sector", region: "US" },
  XLB:   { sector: "ETF / Sector",      industry: "Materials Sector",    region: "US" },
  XLRE:  { sector: "ETF / Sector",      industry: "Real Estate Sector",  region: "US" },
  XLC:   { sector: "ETF / Sector",      industry: "Comms Sector",        region: "US" },
  TLT:   { sector: "ETF / Bonds",       industry: "Long-Term Treasury",  region: "US" },
  IEF:   { sector: "ETF / Bonds",       industry: "Mid-Term Treasury",   region: "US" },
  SHY:   { sector: "ETF / Bonds",       industry: "Short-Term Treasury", region: "US" },
  HYG:   { sector: "ETF / Bonds",       industry: "High-Yield Corp",     region: "US" },
  LQD:   { sector: "ETF / Bonds",       industry: "Investment-Grade Corp", region: "US" },
  AGG:   { sector: "ETF / Bonds",       industry: "Aggregate Bond",      region: "US" },
  BND:   { sector: "ETF / Bonds",       industry: "Aggregate Bond",      region: "US" },
  GLD:   { sector: "ETF / Commodities", industry: "Gold",                region: "Global" },
  SLV:   { sector: "ETF / Commodities", industry: "Silver",              region: "Global" },
  USO:   { sector: "ETF / Commodities", industry: "Oil",                 region: "Global" },
}

export function lookupKnownSector(symbol: string): { sector: string | null; industry: string | null; region: string | null } {
  const u = symbol.toUpperCase()
  const hit = KNOWN_SECTORS[u]
  return hit
    ? { sector: hit.sector, industry: hit.industry, region: hit.region }
    : { sector: null, industry: null, region: null }
}
