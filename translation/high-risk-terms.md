# High-Risk Terms — Side-by-Side Reference

Pre-filled translations for the 15 finance terms most likely to be mistranslated by machine translation (Claude Haiku 4.5 produced the current `dictionary/{lang}.json` files).

**For reviewers:** validate each row against your local financial press. Where two options are listed, pick the one your target audience reads in mainstream coverage (Bloomberg local edition, brokerage UIs, finance Telegram/Twitter). Mark `[OK]` or replace.

**For implementers:** once validated, propagate fixes back into `src/data/dictionary/{lang}.json` and `messages/{lang}.json`. Do not re-run the auto-translator over reviewed entries — it will overwrite human edits.

---

## Convention key

- **Loanword (kept in EN)** = term is read and written in English in local press
- **Transliterated** = English word written in target script (e.g., "шорт", "stop-loss" → "stop-loss")
- **Native** = a target-language word that means the same concept
- `[VERIFY]` = pre-filled best guess, reviewer must confirm against current local convention
- **Register** = formality level expected in retail-trading context

---

## 1. Bull market

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | бычий рынок | растущий рынок | "бычий" is universal in RU finance media |
| TR | boğa piyasası | yükseliş piyasası | "boğa piyasası" dominates BIST/Midas content |
| ES | mercado alcista | mercado toro | "alcista" is standard; "toro" is used colloquially in LATAM trading content |

**MT trap:** Don't translate "bull" as the animal noun in isolation — the metaphor must read as a market term.

## 2. Bear market

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | медвежий рынок | падающий рынок | Universal |
| TR | ayı piyasası | düşüş piyasası | "ayı piyasası" dominates |
| ES | mercado bajista | mercado oso | "bajista" is standard |

## 3. Hawkish (central bank stance)

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | ястребиная риторика | жёсткая позиция / "ястреб" | "ястребиный" is established in RU central-bank coverage |
| TR | şahin (sıkılaştırma yanlısı) | sıkı para politikası taraftarı | "şahin" used as-is in TR finance media; parenthetical clarifies on first mention |
| ES | restrictivo / agresivo | "hawkish" (loanword) | ES press splits — Bloomberg ES uses "restrictivo"; finance Twitter often keeps "hawkish" |

**MT trap:** "Hawkish" → bird-of-prey noun is wrong context. Must convey monetary-tightening bias.

## 4. Dovish (central bank stance)

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | голубиная риторика | мягкая позиция / "голубь" | Mirrors "ястребиная"; standard pairing |
| TR | güvercin (gevşeme yanlısı) | gevşek para politikası taraftarı | Mirrors "şahin" |
| ES | acomodaticio / expansivo | "dovish" (loanword) | "acomodaticio" is the IMF/ECB-Spanish term |

## 5. Short (verb — "to sell short")

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | шортить / открыть короткую позицию | продать в короткую | "шортить" is informal but universal in RU retail; "открыть короткую позицию" is the formal broker-UI term |
| TR | açığa satış yapmak | açığa satmak | Standard TR brokerage term |
| ES | vender en corto / abrir posición corta | "shortear" (LATAM slang) | "vender en corto" is standard; LATAM retail Twitter uses "shortear" |

**MT trap:** Most MT engines invent a verb from the adjective "short" (literally "to make brief"). The financial verb has no English-cognate root in any of these languages.

## 6. Long position

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | длинная позиция / лонг | покупка | "лонг" is informal retail-trader speak |
| TR | uzun pozisyon | alış pozisyonu | "uzun pozisyon" is standard |
| ES | posición larga | posición compradora | "larga" is universal |

## 7. Short position

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | короткая позиция / шорт | позиция на продажу | Mirrors "лонг" |
| TR | kısa pozisyon / açık pozisyon | satış pozisyonu | "açık pozisyon" emphasizes the open-short connotation |
| ES | posición corta | posición vendedora | "corta" is universal |

## 8. Short squeeze

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | шорт-сквиз | сжатие коротких позиций | Transliteration is dominant in RU finance media post-2021 (GME) |
| TR | short squeeze (loanword) | açığa satış sıkışması | TR press almost exclusively uses the EN loanword |
| ES | short squeeze (loanword) | estrangulamiento de cortos | ES press uses the EN term in headlines; the native form in body text |

**MT trap:** Literal translation as "short compression" is meaningless to readers.

## 9. Yield curve

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | кривая доходности | — | Standard, no variation |
| TR | getiri eğrisi | verim eğrisi | "getiri eğrisi" is preferred in finance press; "verim eğrisi" is academic |
| ES | curva de tipos | curva de rendimientos | Spain prefers "curva de tipos"; LATAM prefers "curva de rendimientos" — pick by audience |

## 10. Spread (bid-ask)

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | спред | разница цен | "спред" dominates retail; "разница" in academic context |
| TR | spread / makas | alış-satış farkı | "makas" is colloquial Turkish; "spread" in formal UI |
| ES | spread / diferencial | horquilla de precios | "spread" common in trading apps; "diferencial" in financial press |

## 11. Drawdown

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | просадка | максимальная просадка (for "max drawdown") | Universal in RU retail-trading |
| TR | düşüş / maksimum düşüş | drawdown (loanword) | "düşüş" is generic; mark as "maksimum düşüş" when meaning max DD |
| ES | drawdown / caída máxima | retroceso máximo | "drawdown" loanword common in trading Twitter; "caída máxima" in formal contexts |

## 12. Stop-loss

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | стоп-лосс | стоп-приказ | "стоп-лосс" universal in retail UIs |
| TR | zarar durdur / stop-loss | zararı kes | Most TR brokers use "zarar durdur" in the UI label |
| ES | stop-loss / orden de pérdida limitada | stop de pérdidas | EN loanword most common in trading apps |

## 13. Take-profit

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | тейк-профит | приказ на фиксацию прибыли | "тейк-профит" universal in retail |
| TR | kâr al / take-profit | kâr realizasyonu | "kâr al" is the standard UI label |
| ES | take-profit / orden de toma de beneficios | toma de ganancias | EN loanword most common |

## 14. Leverage

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | плечо / кредитное плечо | левередж | "плечо" universal in RU retail; "кредитное плечо" in formal docs |
| TR | kaldıraç | leverage (loanword) | "kaldıraç" is universal native term |
| ES | apalancamiento | — | Standard, no variation |

## 15. Volatility

| Lang | Recommended | Alternative | Notes |
|---|---|---|---|
| RU | волатильность | — | Standard, no variation |
| TR | volatilite | oynaklık | "volatilite" dominant in finance media; "oynaklık" in academic Turkish |
| ES | volatilidad | — | Standard |

---

## Reviewer worksheet

For each row above, mark one of:

- `[OK]` — recommended translation is correct as-is for the target audience
- `[USE: <alternative>]` — replace with the alternative listed
- `[USE: <your version>]` — propose a different term not listed (please add the source: which broker/news outlet)
- `[KEEP EN]` — leave the English term in the target-language file (loanword)

After review, return this file annotated, plus a list of any *additional* high-risk terms encountered while reading `dictionary/{lang}.json` end-to-end.

---

## Compliance phrasings — separate review

For these regulatory/risk phrases, **do not use the dictionary auto-translation.** Copy the exact phrasing from a licensed local broker's footer in your target market.

| EN phrase | What to source from | Markets |
|---|---|---|
| "Not financial advice" | Local broker disclaimer text | All |
| "Past performance does not guarantee future results" | Local broker disclaimer text | All |
| "Capital at risk" / "Risk of loss" | Local broker risk warning | All |
| "Trading derivatives carries a high level of risk" | Local broker margin/leverage warning | TR, ES (CFD-heavy markets) |
| "Crypto assets are not regulated by [...]" | Local crypto-broker disclaimer | TR, ES, RU |

Suggested sources to copy from:

- **TR:** Midas, Garanti BBVA Trader, İş Yatırım — footer text
- **ES:** XTB España, Interactive Brokers España, BBVA Trader — risk warnings page
- **RU:** Tinkoff Investments, BCS, Finam — risk disclosure documents

Send these copied phrasings back along with the term review and we'll insert them into the locale files verbatim.
