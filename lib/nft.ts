// Shared NFT pricing constants and types (safe for client + server).

// Magic Eden collection symbols. Owning all three grants Tomorrowland pre-sale access.
export const TOKEN_SYMBOLS = [
    "tomorrowland_winter",
    "tomorrowland_love_unity",
    "the_reflection_of_love",
] as const;

export type TokenSymbol = (typeof TOKEN_SYMBOLS)[number];

export const TOKEN_LABELS: Record<TokenSymbol, string> = {
    tomorrowland_winter: "Tomorrowland Winter",
    tomorrowland_love_unity: "Love & Unity",
    the_reflection_of_love: "Reflection of Love",
};

// SOL is the base; the rest are fiat conversions stored in exchange_rates.
export const CURRENCIES = ["SOL", "EUR", "USD", "GBP", "SEK"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Magic Eden floor prices include a 2.5% taker fee on purchase.
export const TAKER_FEE = 1.025;

// A price history series keyed by currency, aligned to `dates`.
export interface PriceHistory {
    dates: string[];
    currencies: Record<Currency, number[]>;
}

// Latest snapshot prices for a token (or the combined basket), fee-adjusted.
export type CurrentPrices = Record<Currency, number>;

// Chart selection: an individual token or the combined basket of all three.
export type PriceKey = TokenSymbol | "combined";

export const PRICE_KEY_LABELS: Record<PriceKey, string> = {
    combined: "All 3 (Combined)",
    ...TOKEN_LABELS,
};

// Display formatting per currency.
export const CURRENCY_FORMAT: Record<
    Currency,
    { symbol: string; suffix?: boolean; decimals: number }
> = {
    SOL: { symbol: "◎", decimals: 2 },
    EUR: { symbol: "€", decimals: 0 },
    USD: { symbol: "$", decimals: 0 },
    GBP: { symbol: "£", decimals: 0 },
    SEK: { symbol: " kr", suffix: true, decimals: 0 },
};

export function formatPrice(value: number, currency: Currency): string {
    const fmt = CURRENCY_FORMAT[currency];
    const num = value.toLocaleString("en-US", {
        minimumFractionDigits: fmt.decimals,
        maximumFractionDigits: fmt.decimals,
    });
    return fmt.suffix ? `${num}${fmt.symbol}` : `${fmt.symbol}${num}`;
}
