# BookClub App — Technical Specification

## 1. Product Overview

A web application for a single book club (≤30 members) to track their monthly reads, nominate and vote on future books, and gamify the reading experience through a level progression system. The app is built as a mobile-responsive web app with a bottom navigation bar — no native mobile app required.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth + Database + Backend | Supabase |
| Database | PostgreSQL (via Supabase) |
| Book Data | Google Books API |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Supabase |

---

## 3. Authentication & User Accounts

### Routes
- `/login` — Email + password sign-in form
- `/signup` — Registration form (see below)
- All other routes redirect unauthenticated users to `/login`

### Sign Up (`/signup`)
The signup form collects all basic profile data upfront:
- **Name** (required) — display name shown throughout the app
- **Email** (required)
- **Password** (required)
- **Bio** (optional) — short bio shown on the profile
- **Avatar** (optional) — upload a photo, or skip to use the auto-generated initials avatar

On successful sign up:
1. Supabase Auth creates the user
2. A `profiles` row is auto-created via a database trigger, populated with the submitted name and bio
3. Avatar is uploaded to Supabase Storage if provided
4. User is redirected to the Dashboard

### Sign In (`/login`)
- Email + password only — no OAuth providers in MVP
- On success, redirect to Dashboard
- Link to `/signup` for new members

### Forgot Password
Deferred to post-MVP. Add a placeholder "Forgot password?" link on `/login` that shows a "Coming soon" message.

### Permissions
- No admin role — all members have equal permissions
- The only permission boundary is ownership: members can only edit their own content (profile, nomination pitches)
- Row-level security (RLS) enforces this at the database level

---

## 4. Database Schema

### `profiles`
Extends Supabase's built-in `auth.users` table.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Foreign key → `auth.users.id` |
| name | text | Display name |
| avatar_url | text | Nullable — URL to uploaded image |
| bio | text | Nullable — short bio |
| created_at | timestamptz | Auto |

### `books`
A local cache of book data pulled from the Google Books API. Prevents redundant API calls.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| google_books_id | text | Unique — the Google Books volume ID |
| title | text | |
| author | text | |
| cover_image_url | text | Nullable |
| genre | text | Nullable |
| page_count | integer | Nullable |
| description | text | Nullable |
| created_at | timestamptz | Auto |

### `current_book`
Stores the club's current monthly read. Enforced to contain exactly one row at all times via a `singleton` constraint.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| book_id | uuid | Foreign key → `books.id` |
| set_by | uuid | Foreign key → `profiles.id` |
| set_at | timestamptz | Auto |
| singleton | boolean | Always `true` — enforces single-row constraint |

**Constraint:**
```sql
ALTER TABLE current_book ADD CONSTRAINT current_book_singleton UNIQUE (singleton);
```
This ensures only one row can ever exist. To change the current book, always `UPDATE` this row — never `INSERT`.

### `archived_books`
A record of every book that was previously the club's current book.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| book_id | uuid | Foreign key → `books.id` |
| month | integer | 1–12 |
| year | integer | e.g. 2026 |
| archived_at | timestamptz | Auto |

### `reading_statuses`
Tracks each member's reading progress for club books (current book and archived books only).

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → `profiles.id` |
| book_id | uuid | Foreign key → `books.id` |
| status | enum | `reading` \| `read` |
| updated_at | timestamptz | Auto |

**Constraints:** Unique on `(user_id, book_id)`.

**Important behavior:** The default "Not Started" state is UI-only — no database record is created for this state. A record is only inserted or upserted when a user selects `reading` or `read`. If no record exists for a user + book combination, the UI displays "Not Started."

**Eligible books:** Reading statuses are only tracked for books that are either the current book or in `archived_books`. The reading status UI is not shown for arbitrary books.

### `nominations`
Books nominated by members for future club reads. Once submitted, nominations are permanent — they can only be removed by the system when the nominated book becomes the current book.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| book_id | uuid | Foreign key → `books.id` |
| nominated_by | uuid | Foreign key → `profiles.id` |
| pitch | text | Short pitch from the nominator — editable after submission |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto — updated when pitch is edited |

**Constraints:**
- Unique on `book_id` — prevents duplicate nominations of the same book
- A book that exists in `archived_books` cannot be nominated (enforced at the application layer before insert)
- No user-initiated deletion — nominations are only removed by the system when a book becomes the current book

### `votes`
Upvotes on nominations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| nomination_id | uuid | Foreign key → `nominations.id` ON DELETE CASCADE |
| user_id | uuid | Foreign key → `profiles.id` |
| created_at | timestamptz | Auto |

**Constraints:** Unique on `(nomination_id, user_id)` — one vote per user per nomination.

**Business rule:** A user cannot vote on a nomination they created. Enforced via RLS:
```sql
auth.uid() != (SELECT nominated_by FROM nominations WHERE id = nomination_id)
```

**Cascade:** `ON DELETE CASCADE` on `nomination_id` — when a nomination is removed (system action when becoming current book), all its votes are automatically deleted.

### `activity_log`
Drives the activity feed on the Dashboard. Only three event types are tracked.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → `profiles.id` — who performed the action |
| action_type | enum | `book_read` \| `book_nominated` \| `current_book_changed` |
| metadata | jsonb | e.g. `{ "book_title": "Dune", "book_id": "..." }` |
| created_at | timestamptz | Auto |

**Events logged:**
- `book_read` — triggered only when a member updates the reading status of the **current book** to `read`
- `book_nominated` — triggered when a new nomination is submitted
- `current_book_changed` — triggered when any member sets a new current book

Reading status updates on **archived books** do not generate activity log entries.

---

## 5. Gamification System

Progress is tracked by the number of **club books** a member has marked as `read`. "Club books" means only books that are currently the club's current book or exist in `archived_books`. Marking an arbitrary non-club book as read (which is not possible per the UI) does not count.

### Level Thresholds

| Level | Books Required | Books to Next Level |
|---|---|---|
| 🐛 Bookworm | 0 | 2 |
| 📖 Scholar | 2 | 2 |
| 📚 Librarian | 4 | 6 |
| ✍️ Shakespeare | 10 | — (max level) |

### Level Calculation (client-side utility)

```typescript
type Level = 'Bookworm' | 'Scholar' | 'Librarian' | 'Shakespeare';

interface LevelInfo {
  level: Level;
  booksRead: number;
  booksToNextLevel: number | null; // null if max level
}

function getLevelInfo(booksRead: number): LevelInfo {
  if (booksRead >= 10) return { level: 'Shakespeare', booksRead, booksToNextLevel: null };
  if (booksRead >= 4)  return { level: 'Librarian',   booksRead, booksToNextLevel: 10 - booksRead };
  if (booksRead >= 2)  return { level: 'Scholar',     booksRead, booksToNextLevel: 4 - booksRead };
  return                      { level: 'Bookworm',    booksRead, booksToNextLevel: 2 - booksRead };
}
```

### Books Read Query
Count only club books marked as read:

```sql
SELECT COUNT(rs.id)
FROM reading_statuses rs
WHERE rs.user_id = $userId
  AND rs.status = 'read'
  AND (
    rs.book_id = (SELECT book_id FROM current_book LIMIT 1)
    OR rs.book_id IN (SELECT book_id FROM archived_books)
  );
```

### Level-Up Modal
When a user's `booksRead` count crosses a level threshold (detected client-side after a status update), display a congratulations modal:
- Show the new level name and icon
- Brief celebratory message (e.g. *"You've reached Scholar! Keep reading to unlock Librarian."*)
- Dismiss button
- For Shakespeare (max level): special message acknowledging it's the final level

---

## 6. External API Integration — Google Books

**Base URL:** `https://www.googleapis.com/books/v1/volumes`

**Search endpoint:** `GET /volumes?q={query}&key={API_KEY}`

**Flow:**
1. User types in the search bar (nomination flow or set current book flow)
2. App queries Google Books API via a Next.js API route (debounced ~300ms)
3. Results appear as a dropdown list (cover thumbnail, title, author)
4. User selects a book
5. App checks if `google_books_id` already exists in the local `books` table
6. If not, the book is inserted into `books` with all available metadata
7. The local `book_id` is then used for the nomination or current book update

**Fields to extract from Google Books response:**

| App Field | Google Books Path |
|---|---|
| title | `volumeInfo.title` |
| author | `volumeInfo.authors[0]` |
| cover_image_url | `volumeInfo.imageLinks.thumbnail` |
| genre | `volumeInfo.categories[0]` |
| page_count | `volumeInfo.pageCount` |
| description | `volumeInfo.description` |

**API route:** `GET /api/books/search?q={query}` — proxies the request server-side so the API key is never exposed to the client.

**next.config.js — required image domains:**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

---

## 7. Environment Variables

All required environment variables across the project:

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL (safe to expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key — NEVER expose to client
                                    # Used for server-side operations (activity log inserts,
                                    # system nomination deletions when current book changes)

# Google Books API
GOOGLE_BOOKS_API_KEY=               # Google Books API key — NEVER expose to client
                                    # Only used in /api/books/search route
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_BOOKS_API_KEY` must only ever be used in Next.js API routes or server components — never imported in client components.

---

## 8. Pages & Navigation

### Bottom Navigation Bar
A persistent bottom nav bar is present on all authenticated pages (mobile-first, also visible on desktop). Four tabs:

| Tab | Icon | Route |
|---|---|---|
| Home | 🏠 | `/` |
| Nominations | 📚 | `/nominations` |
| Members | 👥 | `/members` |
| Profile | 👤 | `/profile/[currentUserId]` |

The Profile tab always links to the logged-in user's own profile.

---

### 8.1 Dashboard (`/`)

The main landing page after login. Shows an overview of everything happening in the club.

**Sections:**

**Current Book**
- Displays book cover, title, and author
- Shows a breakdown of member reading statuses: X Read · X Reading · X Not Started
- The logged-in user can update their own reading status (Not Started / Reading / Read) directly from this section via a segmented control or dropdown
  - "Not Started" is the default display state — selecting it deletes the user's record for this book if one exists
  - Selecting "Reading" or "Read" upserts the record
- A **"Set Current Book"** button (if no book is set) or **"Edit Current Book"** button (if one exists) is available to any member
  - Clicking either opens a **confirmation modal** before proceeding to the search modal (see flow in Section 9)

**Empty state:** If no current book is set, display: *"No book set for this month yet — be the first to pick one!"* with a "Set Current Book" button.

**Top Nominations**
- Displays the top 3 nominations by vote count
- Each card shows: cover, title, author, vote count, and truncated pitch
- "See all nominations →" link navigates to `/nominations`

**Your Progress**
- Displays the user's current level with icon
- Shows total books read
- Shows books away from next level (e.g. *"1 book away from Scholar"*)
- At max level (Shakespeare): *"You've reached the highest level!"*

**Activity Feed**
- Reverse-chronological list of recent club activity (last 20 events)
- Three event types shown:
  - 📖 *"Sarah finished this month's book"* — only fires when current book is marked as Read
  - 📚 *"John nominated Dune"* — fires on new nomination
  - 🔄 *"The club is now reading The Alchemist"* — fires when current book changes

---

### 8.2 Nominations (`/nominations`)

Where members discover, vote on, nominate, and edit book nominations.

**Nomination List**
- All active nominations displayed as cards, sorted by vote count (descending) in real time
- Each card shows: book cover, title, author, nominator name, pitch, vote count, upvote button
- Nominations owned by the logged-in user are badged (*"Your nomination"*) and include an **Edit Pitch** button
- Upvote button toggles the vote — clicking again removes the vote
- Upvote button is hidden/disabled on the user's own nominations (cannot self-vote)
- Nominations are permanent — there is no delete button for any nomination

**Nominate a Book**
- Prominent "Nominate a Book" button at the top
- Opens a modal:
  1. Search bar querying Google Books API in real time (debounced)
  2. Results list — selecting a book populates the form
  3. Pitch text area (*"Why should the club read this?"*)
  4. Submit button
- Validation errors shown inline:
  - *"This book has already been nominated. Vote for it instead!"* — if `book_id` is in `nominations`
  - *"This book has already been read by the club."* — if `book_id` is in `archived_books`

**Edit Pitch**
- Only the nominator sees the "Edit Pitch" button on their cards
- Clicking opens an inline edit form or modal with the current pitch pre-filled
- Saving updates the `pitch` and `updated_at` fields on the nomination
- Cancelling discards changes

---

### 8.3 Archive (`/archive`)

A shared history of every book the club has read.

- All archived books displayed as cards in reverse-chronological order (most recent first)
- Each card shows: book cover, title, author, month/year read (e.g. *"February 2026"*)
- Each card includes the user's current reading status (Not Started / Reading / Read) as a control, so members can log whether they read past books
  - Default display: "Not Started" (no DB record needed)
  - Selecting "Reading" or "Read" upserts a record in `reading_statuses`
  - Reading status updates on archived books do **not** trigger activity log events
- No filtering or sorting in MVP

**Empty state:** *"No books in the archive yet — the club's reading history will appear here."*

---

### 8.4 Members (`/members`)

A directory of all club members.

- Displays all members as cards, sorted alphabetically by name
- Each card shows: avatar, name, level with icon (e.g. 📖 Scholar), and total books read
- Clicking a member's card navigates to their profile (`/profile/[userId]`)

**Empty state:** Not applicable — the logged-in user always appears at minimum.

---

### 8.5 Profile (`/profile/[userId]`)

Viewable by all club members. Editable only by the profile owner.

**Displays:**
- Avatar (uploaded photo or auto-generated initials avatar as fallback)
- Display name
- Bio
- Current level with icon
- Progress: books read total + books to next level (or max level message)
- List of club books they've marked as Read (from `reading_statuses`)
- List of nominations they've submitted (from `nominations`)

**Editing (own profile only):**
- Edit button reveals an edit form
- Editable fields: name, bio, avatar
- Avatar options: upload a photo, or regenerate the initials avatar
- Changes saved via Supabase Storage (avatar) and `profiles` table update

**Navigation:** Clicking any member name or avatar anywhere in the app links to their profile. The bottom nav Profile tab always links to the logged-in user's own profile.

---

## 9. Key User Flows

### Sign Up
1. User visits the club's shared URL → redirected to `/signup`
2. Fills in name, email, password, and optionally bio and avatar
3. Supabase Auth creates the user
4. A `profiles` row is auto-created via a database trigger
5. Redirected to the Dashboard

### Sign In
1. User visits `/login`, enters email and password
2. On success, redirected to Dashboard
3. On failure, inline error message shown

### Set / Edit Current Book
1. Member clicks "Set Current Book" or "Edit Current Book" on the Dashboard
2. **Confirmation modal appears:**
   - If setting: *"You're about to set the club's current book. The current nominations list will not be affected unless this book was nominated."*
   - If editing: *"You're about to replace the current book. The previous book will be moved to the archive."*
   - Confirm / Cancel buttons
3. On confirm: search modal opens with a Google Books search bar
4. Member selects a book → cached in `books` table if not already present
5. System checks: if editing, the previous `current_book` row's book is written to `archived_books` with current month/year
6. If the selected book exists in `nominations`, that nomination (and its votes) are deleted by the system
7. `current_book` row is **updated** (never inserted) with new `book_id`, `set_by`, `set_at`
8. Activity log entry created: `current_book_changed`
9. Dashboard updates in real time

### Nominate a Book
1. Member clicks "Nominate a Book" on the Nominations page
2. Searches for a book — Google Books results appear in real time
3. Selects a book (blocked with error if already nominated or already read by club)
4. Writes a pitch and submits
5. Book cached locally if not already present
6. Nomination inserted into `nominations`
7. Activity log entry created: `book_nominated`
8. Nomination appears at its ranked position on the list

### Edit a Nomination Pitch
1. Nominator clicks "Edit Pitch" on their nomination card
2. Edit form appears with current pitch pre-filled
3. Member updates pitch and saves
4. `pitch` and `updated_at` updated in `nominations`
5. Card reflects updated pitch immediately

### Vote on a Nomination
1. Member clicks the upvote button on a nomination card
2. If not yet voted: `votes` row inserted → vote count increments
3. If already voted: `votes` row deleted → vote count decrements (toggle)
4. Vote count updates in real time via Supabase Realtime
5. Nomination ranking re-sorts live

### Update Reading Status (Current Book)
1. Member selects a new status (Not Started / Reading / Read) on the Dashboard
2. If "Not Started": any existing `reading_statuses` record for this user + book is deleted
3. If "Reading" or "Read": `reading_statuses` is upserted
4. If status is "Read" and this causes a level-up: **level-up modal** is shown
5. If status is "Read": activity log entry created (`book_read`)
6. Dashboard reading status breakdown updates in real time

### Update Reading Status (Archived Book)
1. Member selects a status on an archived book card in `/archive`
2. Same upsert/delete logic as above
3. **No activity log entry is created**
4. If status is "Read" and this causes a level-up: **level-up modal** is shown

### Level-Up Modal
Triggered client-side when `getLevelInfo(newCount).level !== getLevelInfo(oldCount).level`:
1. Modal appears with new level icon and name
2. Message: *"Congratulations! You've reached [Level]!"* (or special message for Shakespeare)
3. Member dismisses the modal
4. Dashboard and Profile reflect the new level

---

## 10. Supabase Configuration Notes

### Auth
- Enable Email provider in Supabase Auth settings
- Email confirmation: disable for MVP simplicity

### Database Trigger — Auto-create Profile
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, bio)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'bio'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Key RLS Policies

**profiles** — Anyone (authenticated) can read. Only the owner can update.

**books** — Anyone (authenticated) can read. Authenticated users can insert (for caching).

**current_book** — Anyone (authenticated) can read. Any authenticated user can update (never insert after initial setup).

**archived_books** — Anyone (authenticated) can read. Insert only via service role (server-side).

**reading_statuses** — Anyone (authenticated) can read. Owner can insert, update, and delete their own records only.

**nominations** — Anyone (authenticated) can read. Authenticated users can insert. Owner can update `pitch` only (no delete by users). Delete only via service role (system action when current book is set).

**votes** — Anyone (authenticated) can read. Authenticated users can insert their own vote if they did not create the nomination. Users can delete their own vote.

**activity_log** — Anyone (authenticated) can read. Insert only via service role (never directly from client).

### Realtime
Enable Supabase Realtime on:
- `nominations` — live vote count and new nominations
- `votes` — live upvote toggling
- `current_book` — live current book updates on Dashboard
- `reading_statuses` — live reading status breakdown on Dashboard
- `activity_log` — live activity feed

### Storage
- Bucket: `avatars`
- Access: public read, authenticated write (users may only write to their own folder: `avatars/{userId}/`)

---

## 11. Post-MVP Considerations

The following were intentionally excluded from the MVP:

- **Forgot password** — Add a password reset flow using Supabase's built-in `resetPasswordForEmail` method and a `/reset-password` page
- **Per-member archive stats** — Show which members read each archived book on the Archive page
- **Archive filtering** — Filter by year or genre
- **Monthly discussion notes** — Attach a summary or notes to each archived book
- **Push / email notifications** — Notify members when a new book is set, when they level up, etc.
- **Tie-breaking** — Runoff vote or host-decides mechanic for tied nominations
- **Reading streaks** — Bonus recognition for reading consecutive months
- **Multi-club support** — Allow the app to serve multiple independent book clubs
- **OAuth** — Add Google or GitHub sign-in as an alternative to email/password
