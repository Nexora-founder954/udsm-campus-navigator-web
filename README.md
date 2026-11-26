# UDSM Campus Navigator: starter

## What is here
- `supabase/migrations/001_schema.sql`: all 12 tables, roles (user/editor/admin), RLS, storage notes, signup trigger.
- `lib/routing.ts`: walking router over verified pathways only; steps come from route geometry; returns `null` (no invented route) when unconnected.
- `components/CampusMap.tsx`: Leaflet map, real GPS, tap-to-pick start, destination select, route line, steps.
- `lib/i18n.ts`: English / Kiswahili strings.

## Setup
1. `npx create-next-app@latest udsm-navigator --ts --tailwind --app`, then copy these files in.
2. `npm i leaflet @supabase/supabase-js && npm i -D @types/leaflet`
3. Create a Supabase project, run the SQL, copy `.env.example` to `.env.local`.
4. Make yourself admin: `update profiles set role='admin' where id='<your auth uid>';`
5. Load `CampusMap` with `dynamic(() => import(...), { ssr: false })`.

## Still to build (in this order)
1. Verify UDSM centre, buildings and paths from the official map; enter them via the admin UI or SQL.
2. Admin dashboard (`/admin`, server-side role check via middleware).
3. Search with abbreviations (pg_trgm index is ready), photo gallery, correction form.
4. PWA manifest and service worker.

## Data rule
Nothing is seeded. Locations stay `verified=false` and `published=false` until an admin confirms them.
