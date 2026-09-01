# Opponent Analyst

Standalone scouting module, split out of `nexus-web`. Same Supabase project (BRI Super League data, `formation_lineups`/`formation_slot_positions` tables) — no auth gate, public by design (matches the current production behavior at `opponent-analyst.vercel.app`).

## Setup

```bash
npm install
cp .env.local.example .env.local   # already pre-filled with your real keys if copied from nexus-web
npm run dev
```

- `/` — team picker (links to every team in `liga_1_2026_2027`)
- `/scouting/[team]` — full scouting report for one team

## Deploying

Not yet a git repo. To move this to its own GitHub repo + Vercel project:

```bash
git init
git add .
git commit -m "Initial commit — opponent-analyst split from nexus-web"
git remote add origin <your-new-repo-url>
git push -u origin main
```

Then connect the new repo to Vercel (or repoint the existing `opponent-analyst.vercel.app` project's Git integration to this repo instead of nexus-web) and set the same `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars in Vercel's project settings.
