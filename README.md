# Striker-Board

Weighted confluence scoreboard for stock tickers. Keep separate trades on the home desk, then open a new trade to score confluence, lock bias, and read the strike window.

## Getting started

```bash
cd /Users/neo/Desktop/Striker-Board
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it scores

```
score = winning-side points / (weight × 3.0) × 100
5m = 0.9 · 15m = 1.0 · 30m = 1.1
Category bias = best of 3 timeframe votes
```

Bands: **80+ Prime** · **60–79 Valid** · **below 60 Watch**.

Checklist names, weights, and items are editable in the board. Your session persists in the browser.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion.
