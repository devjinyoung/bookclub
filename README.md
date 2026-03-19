# Book Club

A small web app for running a book club: pick a current book, nominate and vote on next picks, track reading status, and browse an archive. Built with Next.js and Supabase.

## Tech

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Supabase** (auth + database)
- **Tailwind CSS 4**

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Create `.env.local` with:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run start`| Run production server    |
| `npm run lint` | Run ESLint               |
| `npm run format:fix` | Format with Prettier |
