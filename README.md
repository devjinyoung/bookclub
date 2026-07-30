# BookClub

A mobile-first web app for a small book club. Members track the club’s current read, nominate and vote on what to read next, browse past books, and level up as they finish club picks.

## What it does

- **Home** — See the current book, mark your reading status (Not Started / Reading / Read), and set or change the club’s pick via Google Books search
- **Nominations** — Nominate books with a short pitch and vote on others’ picks
- **Members** — Browse club members and their profiles
- **Archive** — Look back at previous club books
- **Profiles** — Edit your name, bio, and avatar; progress through reading levels (Grasshopper → Bookworm → Librarian → Shakespeare) based on club books marked as read

Auth is email + password via Supabase. All members have equal permissions; you can only edit your own profile and nomination pitches.

## Tech stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Framework | Next.js 16 (App Router), React 19      |
| Language  | TypeScript                             |
| Styling   | Tailwind CSS 4, HeroUI                 |
| Auth + DB | Supabase (PostgreSQL + Auth + Storage) |
| Book data | Google Books API                       |

## Prerequisites

- **Node.js 22+**
- A **Supabase** project with the app schema, RLS policies, and `avatars` storage bucket configured (see [`docs/TECH_SPEC.md`](./docs/TECH_SPEC.md) for the full schema)
- A **Google Books API** key ([Google Cloud Console](https://console.cloud.google.com/) → enable Books API → create an API key)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env.local` in the project root:

   ```env
   # Supabase (Project Settings → API)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Google Books (server-only — used by /api/books/search)
   GOOGLE_BOOKS_API_KEY=your-google-books-api-key
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up to create an account, or sign in if you already have one.

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start the Next.js dev server |
| `npm run build`      | Production build             |
| `npm run start`      | Run the production server    |
| `npm run lint`       | Run ESLint                   |
| `npm run format`     | Check Prettier formatting    |
| `npm run format:fix` | Format with Prettier         |

## Project layout

```
src/
  app/           # Routes (home, nominations, members, archive, profile, auth)
  components/    # UI (nav, book search, profile forms, etc.)
  contexts/      # Auth and profile providers
  lib/           # Supabase clients, domain helpers (books, nominations, levels)
middleware.ts    # Session refresh and auth redirects
```

For schema details, triggers, and RLS, see [`docs/TECH_SPEC.md`](./docs/TECH_SPEC.md).
