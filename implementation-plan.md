## BookClub App – Implementation Plan

### Phase 1 – Project & Infrastructure

- **P1.1 Bootstrap Next.js app**
  - Scaffold Next.js 14 (App Router) with TypeScript, Tailwind, React Compiler.
  - Confirm `npm run dev` works locally.
  - Initialize Git repo and push to `devjinyoung/bookclub`.

- **P1.2 Supabase & environment variables**
  - Create Supabase project and enable email/password auth + automatic RLS.
  - Add env vars in `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `GOOGLE_BOOKS_API_KEY` (later)
  - Install `@supabase/supabase-js`.
  - Create shared Supabase client helper in `src/lib/supabaseClient.ts`.

- **P1.3 Database schema & RLS**
  - Create tables: `profiles`, `books`, `current_book`, `archived_books`, `reading_statuses`, `nominations`, `votes`, `activity_log`.
  - Add singleton constraint for `current_book`.
  - Implement trigger to auto-create `profiles` on new auth user.
  - Configure RLS policies as per spec.
  - Create `avatars` storage bucket with public read, authenticated write.

- **P1.4 Base app layout**
  - Setup global layout with Tailwind and fonts.
  - Implement authenticated shell with bottom navigation:
    - `/` (Dashboard)
    - `/nominations`
    - `/archive`
    - `/members`
    - `/profile/[userId]`
  - Add `/login` and `/signup` routes and basic auth-guard redirect logic.

### Phase 2 – Auth & Profiles

- **P2.1 Sign up flow (`/signup`)**
  - Create signup form: name, email, password, optional bio and avatar upload.
  - Pass `name` and `bio` via `raw_user_meta_data` so trigger can populate `profiles`.
  - On success, redirect to Dashboard.

- **P2.2 Login flow (`/login`)**
  - Email/password login UI with inline error handling.
  - “Forgot password?” link with “Coming soon” placeholder.

- **P2.3 Auth-required routing**
  - Middleware or layout-based guard:
    - Unauthenticated users redirected to `/login` for all app routes.
    - Already-authenticated users redirected away from `/login` and `/signup` to `/`.

- **P2.4 Profile data & avatar upload**
  - Fetch `profiles` data for current user and others.
  - Implement avatar upload to `avatars` bucket and save URL to `profiles.avatar_url`.
  - Implement initials-avatar fallback.

### Phase 3 – Current Book & Archive

- **P3.1 Dashboard current book section**
  - Show current book (cover, title, author) from `current_book` + `books`.
  - Show status breakdown: X Read · X Reading · X Not Started.
  - Allow logged-in user to set their status via control:
    - `Not Started` → delete `reading_statuses` record.
    - `Reading` / `Read` → upsert `reading_statuses`.

- **P3.2 Set/Edit current book flow**
  - Dashboard button: “Set Current Book” / “Edit Current Book”.
  - Confirmation modal messages for setting vs editing.
  - Search modal using Google Books API:
    - Cache book in `books` if not present.
    - If editing, archive previous current book into `archived_books`.
    - If selected book is in `nominations`, delete nomination and cascade votes.
    - Update `current_book` row (no insert) with new `book_id`, `set_by`, `set_at`.
    - Insert `activity_log` entry `current_book_changed`.

- **P3.3 Archive page (`/archive`)**
  - List archived books with month/year, cover, title, author.
  - Per-book reading status control (same upsert/delete logic as above, no activity log).
  - Simple reverse-chronological ordering, no filters in MVP.

### Phase 4 – Nominations & Voting

- **P4.1 Google Books search API route**
  - Implement `GET /api/books/search?q={query}` that:
    - Uses `GOOGLE_BOOKS_API_KEY` on the server only.
    - Maps Google Books fields into app-friendly shape.

- **P4.2 Nominations page (`/nominations`)**
  - Show nomination cards sorted by vote count (desc).
  - Each card: cover, title, author, nominator, pitch, votes, upvote button.
  - Badge “Your nomination” for owned nominations and show “Edit Pitch” button.

- **P4.3 Nominate & edit flows**
  - “Nominate a Book” modal:
    - Search bar with debounced Google Books search.
    - Book select + pitch textarea.
    - Validation:
      - Already nominated → “This book has already been nominated…”
      - Already in `archived_books` → “This book has already been read by the club.”
  - “Edit Pitch” inline or modal editing for the owner only.

- **P4.4 Voting with Realtime**
  - Upvote button to insert/delete `votes` records (toggle).
  - Prevent self-voting via RLS.
  - Hook Supabase Realtime on `nominations` and `votes` for live counts and resorting.

### Phase 5 – Gamification & Activity Feed

- **P5.1 Level calculation utility**
  - Implement `getLevelInfo(booksRead)` as specified.
  - Implement SQL / Supabase query to count read club books (current + archived).

- **P5.2 Progress & members UI**
  - Dashboard “Your Progress” section: level, books read, books to next level.
  - Members page: list members with avatar, level, and total books read; link to profiles.

- **P5.3 Level-up modal**
  - Detect level changes client-side when reading status becomes `read`.
  - Show modal with new level, message, and dismiss button.

- **P5.4 Activity feed**
  - Insert `activity_log` entries using service role (server-side only) for:
    - `book_read` (current book marked as read).
    - `book_nominated`.
    - `current_book_changed`.
  - Dashboard activity feed showing last ~20 events in reverse chronological order.

### Phase 6 – Polish & Deployment

- **P6.1 UI & UX polish**
  - Mobile-first design with persistent bottom navigation.
  - Empty states for Dashboard, Nominations, Archive.

- **P6.2 Robustness**
  - Loading and error states for all data-fetching views.
  - Form validation and user-friendly error messages.

- **P6.3 Deployment**
  - Deploy frontend to Vercel connected to `devjinyoung/bookclub`.
  - Configure environment variables in Vercel.
  - Ensure Supabase project is in production-ready state with the same schema/RLS.

