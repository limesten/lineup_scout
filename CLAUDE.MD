# Project Overview

Tomorrowland Wizard: a multi-page Tomorrowland companion app. Top navbar (app/components/layout/Navbar.tsx) switches between pages.

Lineup (home, `/`): view lineup by year, weekend and date in Grid or Timetable view (horizontal and vertical).
Unique feature: press an artist name to get a spotify iframe of their top songs plus youtube live-set results, to quickly judge whether to attend that set.

NFT (`/nft`): floor-price chart for the 3 Tomorrowland access tokens (combined + per-token, multi-currency). Data ingested daily from Magic Eden (floor in SOL) + FX Rates API (SOL->fiat) into the `sol_rates`/`exchange_rates` tables; read via the `v_prices_per_date` / `v_combined_price_per_date` views (server/queries.ts). Daily refresh is a Vercel Cron (vercel.json) hitting `/api/nft/refresh`, authed with `CRON_SECRET`. Requires env: `FX_RATES_API_KEY`, `CRON_SECRET`. Postgres views are not managed by drizzle-kit; edit drizzle/nft-views.sql and re-apply with `pnpm tsx scripts/apply-nft-views.ts`.

# Tech Stack

pnpm
shadcn UI
next.js
tailwindcss
postgres with neon
drizzle ORM
vercel

# Architecture Notes

Use shadcn UI components whenever possible. Before creating a new component, search if shadcn ui component can be imported instead.

# Rules

Run pnpm run build before finishing larger changes to make sure there are no build errors.

Update this file as changes are being made to keep it up to date.
Keep it as short and concise as possible to not bloat context.
Do not include information that could be found quickly by searching the codebase.
