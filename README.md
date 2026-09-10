# 🏀 Courtside Basketball Tournament Statistics System

A complete, production-ready, high-speed basketball tournament stat-tracking application designed for **live single-operator courtside use** on desktop, tablet, or laptop.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **Supabase PostgreSQL + RLS + Realtime**. Fully Vercel compatible.

---

## ⚡ Features & Courtside Design

* **Courtside Operator Mode**: One-tap score & stat recording (PTS, 3PM, FGM, FTM, O-REB, D-REB, AST, STL, BLK, TO, FOUL).
* **Keyboard Shortcut Support**: Full `Ctrl+Z` / `Cmd+Z` keybinding for instant undo.
* **Instant Undo Button**: One-tap undo for accidental button presses during high-speed game play.
* **Side-by-Side Dual Team Interface**: View both Team A & Team B active rosters on one screen without switching tabs on desktop/tablet.
* **Live Game Clock**: Integrated quarter timer with start/pause and period selector.
* **Database Persistence & Realtime**: State automatically syncs with Supabase.
* **Automated Advanced Metrics**:
  * **Game & Tournament MVP Formula**: `(PTS * 1.5) + (REB * 1.2) + (AST * 1.5) + (STL * 2) + (BLK * 2) - (TO * 1.5) - (FOUL * 0.5)`
  * **Best Defender Formula**: `(STL * 3) + (BLK * 3) + (D-REB * 1.5) - (FOUL * 1.0)`
* **Printable Game Reports**: Clean print stylesheet formatted for PDF generation or physical printing.
* **Completed Game Locking & Reopen**: Protect completed match stats with atomic locked status; administrator can reopen if revisions are needed.
* **Search & Filter History**: Filter game history by team name, game number, date, or player name.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- A free [Supabase](https://supabase.com) project

### 2. Database Setup (Supabase)
1. Open your Supabase project dashboard -> **SQL Editor**.
2. Copy the contents of [`supabase/schema.sql`](file:///C:/Users/JOSHUA%20PINTO/.gemini/antigravity-ide/scratch/basketball-stats/supabase/schema.sql) into the query editor and run it.
3. This sets up tables (`tournaments`, `games`, `players`, `player_game_stats`), atomic Postgres RPC functions (`increment_player_stat`, `undo_player_stat`, `finalize_game`), Row Level Security (RLS) policies, and performance indexes.

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Running Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployment to Vercel

1. Push this repository to GitHub or import directly into Vercel.
2. Set Environment Variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Click **Deploy**.

---

## 📄 License
MIT
