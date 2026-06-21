-- NFT price views (ported from the original Go/SQLite app).
-- Applied via `pnpm tsx scripts/apply-nft-views.ts`. Not managed by drizzle-kit.
-- `date` columns are real DATE types here, so no DATE() casting is needed.

DROP VIEW IF EXISTS v_prices_per_date;
DROP VIEW IF EXISTS v_combined_price_per_date;

-- Per-token fiat prices per day.
CREATE VIEW v_prices_per_date AS
WITH
    eur_rates AS (SELECT date, sol_exchange_rate AS eur_rate FROM exchange_rates WHERE currency = 'EUR'),
    usd_rates AS (SELECT date, sol_exchange_rate AS usd_rate FROM exchange_rates WHERE currency = 'USD'),
    gbp_rates AS (SELECT date, sol_exchange_rate AS gbp_rate FROM exchange_rates WHERE currency = 'GBP'),
    sek_rates AS (SELECT date, sol_exchange_rate AS sek_rate FROM exchange_rates WHERE currency = 'SEK')
SELECT
    s.date AS date,
    s.token AS token,
    s.sol AS sol,
    s.sol * eur.eur_rate AS eur,
    s.sol * usd.usd_rate AS usd,
    s.sol * gbp.gbp_rate AS gbp,
    s.sol * sek.sek_rate AS sek
FROM sol_rates s
LEFT JOIN eur_rates eur ON s.date = eur.date
LEFT JOIN usd_rates usd ON s.date = usd.date
LEFT JOIN gbp_rates gbp ON s.date = gbp.date
LEFT JOIN sek_rates sek ON s.date = sek.date
WHERE s.sol > 0
    AND eur.eur_rate > 0
    AND usd.usd_rate > 0
    AND gbp.gbp_rate > 0
    AND sek.sek_rate > 0;

-- Combined price (sum of all tokens) per day.
CREATE VIEW v_combined_price_per_date AS
WITH
    eur_rates AS (SELECT date, sol_exchange_rate AS eur_rate FROM exchange_rates WHERE currency = 'EUR'),
    usd_rates AS (SELECT date, sol_exchange_rate AS usd_rate FROM exchange_rates WHERE currency = 'USD'),
    gbp_rates AS (SELECT date, sol_exchange_rate AS gbp_rate FROM exchange_rates WHERE currency = 'GBP'),
    sek_rates AS (SELECT date, sol_exchange_rate AS sek_rate FROM exchange_rates WHERE currency = 'SEK')
SELECT
    s.date AS date,
    SUM(s.sol) AS sol,
    SUM(s.sol) * eur.eur_rate AS eur,
    SUM(s.sol) * usd.usd_rate AS usd,
    SUM(s.sol) * gbp.gbp_rate AS gbp,
    SUM(s.sol) * sek.sek_rate AS sek
FROM sol_rates s
LEFT JOIN eur_rates eur ON s.date = eur.date
LEFT JOIN usd_rates usd ON s.date = usd.date
LEFT JOIN gbp_rates gbp ON s.date = gbp.date
LEFT JOIN sek_rates sek ON s.date = sek.date
GROUP BY s.date, eur.eur_rate, usd.usd_rate, gbp.gbp_rate, sek.sek_rate
HAVING SUM(s.sol) IS NOT NULL
    AND eur.eur_rate IS NOT NULL
    AND usd.usd_rate IS NOT NULL
    AND gbp.gbp_rate IS NOT NULL
    AND sek.sek_rate IS NOT NULL;
