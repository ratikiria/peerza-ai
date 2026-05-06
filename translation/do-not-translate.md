# Do-Not-Translate List

Reference for human reviewers of `messages/{lang}.json` and `src/data/dictionary/{lang}.json`.

If a string in either file matches anything in this document, **leave it exactly as it appears in English**. Do not translate, transliterate, or reformat. Tickers and abbreviations are universal across markets — translating them breaks links, search, and recognition.

If you find a translated version of any of these in the target-language file, that is a bug — replace it with the original English form.

---

## 1. Tickers and instrument symbols

Always uppercase Latin letters, optionally with a `$` prefix in social posts.

Pattern: 1–5 uppercase letters, sometimes with a numeric or dot suffix.

Examples that must stay as-is:

| Asset class | Examples |
|---|---|
| US equities | AAPL, MSFT, NVDA, TSLA, GOOGL, META, AMZN |
| US ETFs | SPY, QQQ, IWM, VOO, VTI, DXY, GLD, TLT |
| Indices | SPX, NDX, DJI, VIX, RUT |
| Forex pairs | EURUSD, GBPUSD, USDJPY, USDTRY, USDRUB, USDGEL |
| Crypto | BTC, ETH, SOL, USDT, USDC, DOGE |
| Futures | ES, NQ, YM, CL, GC, SI |
| Social mentions | $AAPL, $TSLA, $BTC |

---

## 2. Universal financial abbreviations

These are read identically in EN/RU/TR/ES financial press. Do not expand or translate.

| Abbreviation | Stands for | Note |
|---|---|---|
| NFP | Non-Farm Payrolls | Used as-is in all 4 languages |
| CPI | Consumer Price Index | Use as-is; full term may be localized in *definitions only* |
| Core CPI | — | "Core" stays in English |
| PPI | Producer Price Index | Used as-is |
| PCE | Personal Consumption Expenditures | Used as-is |
| Core PCE | — | Used as-is |
| GDP | Gross Domestic Product | Used as-is in headlines; localized in body text only |
| FOMC | Federal Open Market Committee | Used as-is |
| Fed | Federal Reserve | Used as-is (do not translate to "Федрезерв"-style unless context requires) |
| ECB | European Central Bank | Used as-is |
| BoE | Bank of England | Used as-is |
| BoJ | Bank of Japan | Used as-is |
| PBoC | People's Bank of China | Used as-is |
| PMI | Purchasing Managers' Index | Used as-is |
| ISM | Institute for Supply Management | Used as-is |
| QoQ / YoY / MoM | Quarter/Year/Month-over- | Used as-is |
| EPS | Earnings per Share | Used as-is |
| P/E | Price-to-Earnings ratio | Used as-is |
| ATH | All-Time High | Used as-is |
| ETF | Exchange-Traded Fund | Used as-is |
| IPO | Initial Public Offering | Used as-is |
| AMA | Ask Me Anything (community feature) | Used as-is |

---

## 3. Currency codes

ISO 4217 three-letter codes — **never translate**:

USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, RUB, TRY, GEL, INR, BRL, MXN, ARS, BTC, ETH, USDT, USDC

Currency *symbols* may be localized in position (before/after number) per language convention, but the code itself never changes.

---

## 4. Brand and product names

These are proper nouns — never translate, never transliterate (unless target language uses a different script, in which case keep Latin form):

- TradersHub
- Peerza.ai
- TradingView
- TradingView Advanced Charts
- Pillar 1 / Pillar 2 / Pillar 3 / Pillar 4 (internal taxonomy — keep in EN)

Third-party brand names that appear in content (do not translate):
- Bloomberg, Reuters, CNBC
- Robinhood, Public, eToro, Interactive Brokers, Schwab
- Binance, Coinbase, Kraken
- NYSE, NASDAQ, LSE, BIST, MOEX

---

## 5. Code-like UI patterns

These are technical tokens, not natural-language words:

| Pattern | Example | Rule |
|---|---|---|
| User mentions | `@username`, `@rati_kiria` | Keep `@` and the handle exactly |
| Hashtags | `#options`, `#earnings` | Keep `#` and the tag exactly (tag itself may be a localized hashtag, but `#` stays) |
| Cashtags | `$AAPL`, `$TSLA` | Keep `$` and the ticker exactly |
| URLs | `https://peerza.ai/feed` | Never translate or rewrite |
| Email addresses | `support@peerza.ai` | Keep exact |
| File paths | `/legal/terms` | Keep exact |
| Placeholders | `{count}`, `{username}`, `{ticker}` | Keep exact (these are interpolation slots) |
| ICU plural forms | `{count, plural, one {# user} other {# users}}` | Translate the words *inside* `{}`, never the syntax |

---

## 6. Country and exchange codes

Two-letter ISO country codes (US, GB, DE, JP, CN, RU, TR, ES, GE, IN, BR) and exchange codes stay in Latin caps regardless of target language.

---

## 7. Numbers and units inside translated strings

These tokens stay in original form even when surrounding text is translated:

- `bps` (basis points) — used as-is
- `bp` — used as-is
- `pp` (percentage points) — may be localized in long form, but `pp` itself stays
- `M`, `B`, `T` suffixes (1.2M, $4.5B) — keep the Latin letter; the *number* formatting follows local convention (see `messages/{lang}.json` review notes for decimal/thousands separators)

---

## 8. What CAN be translated even though it looks technical

Just so reviewers don't over-correct:

- Indicator full names ("Non-Farm Payrolls", "Consumer Price Index") in **definitions and explanatory body text** — these may be localized once on first mention, then abbreviated
- Country names in body text ("United States" → "США" / "ABD" / "EE.UU.")
- Generic verbs and UI actions ("Buy", "Sell", "Place Order", "Cancel") — translate
- Risk disclaimers — translate, but match local regulator phrasing (see `high-risk-terms.md` section on compliance)

---

**When in doubt:** keep it in English. Over-translation is harder to fix than under-translation because users have already memorized the wrong term.
