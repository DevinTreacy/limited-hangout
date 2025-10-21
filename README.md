
# Limited Hangout

Next.js + Tailwind site (Vercel-ready) with:
- /about — group photo + description
- /videos — grid of embeds (edit `data/videos.json`)
- /shows — auto-updating from Google Sheets (or demo mode)
- /socials — group + individual links (edit `data/socials.ts`)

## Quick Start
```bash
npm install
cp .env.local.example .env.local
npm run dev
# open http://localhost:3000
```

## Google Sheets (Live Mode)
1) In `.env.local`, set `DEMO_MODE=false` and fill:
```
GOOGLE_SHEETS_API_KEY=YOUR_KEY
GOOGLE_SHEETS_SHEET_ID=YOUR_SHEET_ID
GOOGLE_SHEETS_RANGE=Shows!A:E
```
2) Google Sheet tab must have headers in row 1:
```
member | date | time | venue | link
```
3) Deploy on Vercel and add the same env vars in the project settings.

## GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/limited-hangout.git
git branch -M main
git push -u origin main
```
