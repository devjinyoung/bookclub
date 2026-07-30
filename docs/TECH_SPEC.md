# BookClub App — Technical Specification

## 1. Product Overview

A web application for a single book club (≤30 members) to track their monthly reads, nominate and vote on future books, and gamify the reading experience through a level progression system. The app is built as a mobile-responsive web app with a bottom navigation bar — no native mobile app required.

---

## 2. Tech Stack

| Layer                     | Technology                |
| ------------------------- | ------------------------- |
| Framework                 | Next.js 14+ (App Router)  |
| Language                  | TypeScript                |
| Styling                   | Tailwind CSS              |
| Auth + Database + Backend | Supabase                  |
| Database                  | PostgreSQL (via Supabase) |
| Book Data                 | Google Books API          |
| Hosting (Frontend)        | Vercel                    |
| Hosting (Backend)         | Supabase                  |

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

| Column     | Type        | Notes                                           |
| ---------- | ----------- | ----------------------------------------------- |
| id         | uuid        | Foreign key → `auth.users.id` ON DELETE CASCADE |
| name       | text        | Display name                                    |
| avatar_url | text        | Nullable — URL to uploaded image                |
| bio        | text        | Nullable — short bio                            |
| created_at | timestamptz | Auto                                            |
| updated_at | timestamptz | Auto — updated on any profile field change      |

### `books`

A local cache of book data pulled from the Google Books API. Prevents redundant API calls.

| Column          | Type        | Notes                               |
| --------------- | ----------- | ----------------------------------- |
| id              | uuid        | Primary key                         |
| google_books_id | text        | Unique — the Google Books volume ID |
| title           | text        |                                     |
| author          | text        |                                     |
| cover_image_url | text        | Nullable                            |
| genre           | text        | Nullable                            |
| page_count      | integer     | Nullable                            |
| description     | text        | Nullable                            |
| created_at      | timestamptz | Auto                                |

### `current_book`

Stores the club's current monthly read. Enforced to contain exactly one row at all times via a `singleton` constraint.

| Column    | Type        | Notes                                          |
| --------- | ----------- | ---------------------------------------------- |
| id        | uuid        | Primary key                                    |
| book_id   | uuid        | Foreign key → `books.id` RESTRICT              |
| set_by    | uuid        | Foreign key → `profiles.id` SET NULL           |
| set_at    | timestamptz | Auto                                           |
| singleton | boolean     | Always `true` — enforces single-row constraint |

**Constraint:**

```sql
ALTER TABLE current_book ADD CONSTRAINT current_book_singleton UNIQUE (singleton);
```

This ensures only one row can ever exist. To change the current book, always `UPDATE` this row — never `INSERT`.

### `archived_books`

A record of every book that was previously the club's current book.

| Column      | Type        | Notes                                                                 |
| ----------- | ----------- | --------------------------------------------------------------------- |
| id          | uuid        | Primary key                                                           |
| book_id     | uuid        | Foreign key → `books.id` RESTRICT                                     |
| month       | integer     | 1–12 — extracted from `current_book.set_at` of the outgoing book      |
| year        | integer     | e.g. 2026 — extracted from `current_book.set_at` of the outgoing book |
| archived_at | timestamptz | Auto                                                                  |

**Month/year source:** When a new current book is set, the outgoing book is archived using the `month` and `year` from `current_book.set_at` (the timestamp when the outgoing book was originally set as current) — not the current date at the time of archiving. This ensures the archive reflects when the club was actually reading the book. For example, if the March book was set on Feb 28, the archive entry stores month=2, year=2026. This is handled automatically by a Postgres trigger (see Section 10).

### `reading_statuses`

Tracks each member's reading progress for club books (current book and archived books only).

| Column     | Type        | Notes                                                      |
| ---------- | ----------- | ---------------------------------------------------------- |
| id         | uuid        | Primary key                                                |
| user_id    | uuid        | Foreign key → `profiles.id` ON DELETE CASCADE              |
| book_id    | uuid        | Foreign key → `books.id` RESTRICT                          |
| status     | enum        | `reading` \| `read`                                        |
| created_at | timestamptz | Auto — when the member first logged a status for this book |
| updated_at | timestamptz | Auto — updated on every status change                      |

**Constraints:** Unique on `(user_id, book_id)`.

**Important behavior:** The default "Not Started" state is UI-only — no database record is created for this state. A record is only inserted or upserted when a user selects `reading` or `read`. If no record exists for a user + book combination, the UI displays "Not Started."

**Eligible books:** Reading statuses are only tracked for books that are either the current book or in `archived_books`. The reading status UI is not shown for arbitrary books.

### `nominations`

Books nominated by members for future club reads. Once submitted, nominations are permanent — they can only be removed by the system when the nominated book becomes the current book.

| Column       | Type        | Notes                                                      |
| ------------ | ----------- | ---------------------------------------------------------- |
| id           | uuid        | Primary key                                                |
| book_id      | uuid        | Foreign key → `books.id` RESTRICT                          |
| nominated_by | uuid        | Foreign key → `profiles.id` SET NULL                       |
| pitch        | text        | Short pitch from the nominator — editable after submission |
| created_at   | timestamptz | Auto                                                       |
| updated_at   | timestamptz | Auto — updated when pitch is edited                        |

**Constraints:**

- Unique on `book_id` — prevents duplicate nominations of the same book
- `CHECK (char_length(pitch) <= 500)` — pitch capped at 500 characters
- A book that exists in `archived_books` cannot be nominated (enforced at the application layer before insert)
- No user-initiated deletion — nominations are only removed by the system when a book becomes the current book

**Note on `nominated_by` SET NULL:** If a member's profile is ever deleted, their nominations remain on the list (the community voted for them) but the nominator name will render as "Unknown member."

### `votes`

Upvotes on nominations.

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| id            | uuid        | Primary key                                      |
| nomination_id | uuid        | Foreign key → `nominations.id` ON DELETE CASCADE |
| user_id       | uuid        | Foreign key → `profiles.id` ON DELETE CASCADE    |
| created_at    | timestamptz | Auto                                             |

**Constraints:** Unique on `(nomination_id, user_id)` — one vote per user per nomination.

**Business rule:** A user cannot vote on a nomination they created. Enforced via RLS:

```sql
auth.uid() != (SELECT nominated_by FROM nominations WHERE id = nomination_id)
```

**Cascade on `nomination_id`:** When a nomination is removed (system action when it becomes the current book), all its votes are automatically deleted.

**Cascade on `user_id`:** When a member's profile is deleted, their votes are automatically deleted.

**Vote count computation:** Vote counts displayed on nomination cards are computed at query time via a COUNT subquery — no denormalized counter column is maintained. Counts are kept live via a Supabase Realtime subscription on the `votes` table. For ≤30 members this is performant without any extra complexity.

### `activity_log`

Drives the activity feed on the Dashboard. Only three event types are tracked.

| Column      | Type        | Notes                                                           |
| ----------- | ----------- | --------------------------------------------------------------- |
| id          | uuid        | Primary key                                                     |
| user_id     | uuid        | Foreign key → `profiles.id` SET NULL — who performed the action |
| action_type | enum        | `book_read` \| `book_nominated` \| `current_book_changed`       |
| metadata    | jsonb       | Event-specific payload — shape defined per event type below     |
| created_at  | timestamptz | Auto                                                            |

**Insert mechanism:** All activity log entries are written by Postgres triggers, never directly by the client. This means the client writes to `reading_statuses`, `nominations`, and `current_book` as normal — the triggers fire automatically server-side and insert into `activity_log`. No API routes or service role key are required for activity logging. Full trigger SQL is in Section 10.

**Events logged and their metadata shapes:**

`book_read` — fires when a member sets the **current book's** reading status to `read`:

```json
{ "book_id": "...", "book_title": "..." }
```

`book_nominated` — fires when a new nomination is inserted:

```json
{ "book_id": "...", "book_title": "...", "nomination_id": "..." }
```

`current_book_changed` — fires when the current book row is updated:

```json
{
  "new_book_id": "...",
  "new_book_title": "...",
  "previous_book_id": "...",
  "previous_book_title": "..."
}
```

Reading status updates on **archived books** do not generate activity log entries.

---

### Indexes

Primary keys and unique constraints are indexed automatically by Postgres. The following additional indexes should be created to support the app's most common queries:

```sql
-- Profile lookups by reading status (gamification level queries, profile page)
CREATE INDEX idx_reading_statuses_user_id ON reading_statuses (user_id);

-- Reading status breakdown per book (dashboard member status counts)
CREATE INDEX idx_reading_statuses_book_id ON reading_statuses (book_id);

-- Nomination lookup by book (duplicate/archived book check before nominating)
CREATE INDEX idx_nominations_book_id ON nominations (book_id);

-- Vote counts per nomination (nominations page sort)
CREATE INDEX idx_votes_nomination_id ON votes (nomination_id);

-- Activity feed (always fetched in descending order)
CREATE INDEX idx_activity_log_created_at ON activity_log (created_at DESC);
```

For a club of ≤30 members these indexes are not strictly required for performance, but they represent correct query patterns and are cheap to add upfront.

---

## 5. Gamification System

Progress is tracked by the number of **club books** a member has marked as `read`. "Club books" means only books that are currently the club's current book or exist in `archived_books`. Marking an arbitrary non-club book as read (which is not possible per the UI) does not count.

### Level Thresholds

| Level          | Books Required | Books to Next Level |
| -------------- | -------------- | ------------------- |
| 🐛 Bookworm    | 0              | 2                   |
| 📖 Scholar     | 2              | 2                   |
| 📚 Librarian   | 4              | 6                   |
| ✍️ Shakespeare | 10             | — (max level)       |

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
  if (booksRead >= 4) return { level: 'Librarian', booksRead, booksToNextLevel: 10 - booksRead };
  if (booksRead >= 2) return { level: 'Scholar', booksRead, booksToNextLevel: 4 - booksRead };
  return { level: 'Bookworm', booksRead, booksToNextLevel: 2 - booksRead };
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
- Brief celebratory message (e.g. _"You've reached Scholar! Keep reading to unlock Librarian."_)
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

| App Field       | Google Books Path                 |
| --------------- | --------------------------------- |
| title           | `volumeInfo.title`                |
| author          | `volumeInfo.authors[0]`           |
| cover_image_url | `volumeInfo.imageLinks.thumbnail` |
| genre           | `volumeInfo.categories[0]`        |
| page_count      | `volumeInfo.pageCount`            |
| description     | `volumeInfo.description`          |

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

| Tab         | Icon | Route                      |
| ----------- | ---- | -------------------------- |
| Home        | 🏠   | `/`                        |
| Nominations | 📚   | `/nominations`             |
| Members     | 👥   | `/members`                 |
| Profile     | 👤   | `/profile/[currentUserId]` |

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

**Empty state:** If no current book is set, display: _"No book set for this month yet — be the first to pick one!"_ with a "Set Current Book" button.

**Top Nominations**

- Displays the top 3 nominations by vote count
- Each card shows: cover, title, author, vote count, and truncated pitch
- "See all nominations →" link navigates to `/nominations`

**Your Progress**

- Displays the user's current level with icon
- Shows total books read
- Shows books away from next level (e.g. _"1 book away from Scholar"_)
- At max level (Shakespeare): _"You've reached the highest level!"_

**Activity Feed**

- Reverse-chronological list of recent club activity (last 20 events)
- Three event types shown:
  - 📖 _"Sarah finished this month's book"_ — only fires when current book is marked as Read
  - 📚 _"John nominated Dune"_ — fires on new nomination
  - 🔄 _"The club is now reading The Alchemist"_ — fires when current book changes

---

### 8.2 Nominations (`/nominations`)

Where members discover, vote on, nominate, and edit book nominations.

**Nomination List**

- All active nominations displayed as cards, sorted by vote count (descending) in real time
- Each card shows: book cover, title, author, nominator name, pitch, vote count, upvote button
- Nominations owned by the logged-in user are badged (_"Your nomination"_) and include an **Edit Pitch** button
- Upvote button toggles the vote — clicking again removes the vote
- Upvote button is hidden/disabled on the user's own nominations (cannot self-vote)
- Nominations are permanent — there is no delete button for any nomination

**Nominate a Book**

- Prominent "Nominate a Book" button at the top
- Opens a modal:
  1. Search bar querying Google Books API in real time (debounced)
  2. Results list — selecting a book populates the form
  3. Pitch text area (_"Why should the club read this?"_)
  4. Submit button
- Validation errors shown inline:
  - _"This book has already been nominated. Vote for it instead!"_ — if `book_id` is in `nominations`
  - _"This book has already been read by the club."_ — if `book_id` is in `archived_books`

**Edit Pitch**

- Only the nominator sees the "Edit Pitch" button on their cards
- Clicking opens an inline edit form or modal with the current pitch pre-filled
- Saving updates the `pitch` and `updated_at` fields on the nomination
- Cancelling discards changes

---

### 8.3 Archive (`/archive`)

A shared history of every book the club has read.

- All archived books displayed as cards in reverse-chronological order (most recent first)
- Each card shows: book cover, title, author, month/year read (e.g. _"February 2026"_)
- Each card includes the user's current reading status (Not Started / Reading / Read) as a control, so members can log whether they read past books
  - Default display: "Not Started" (no DB record needed)
  - Selecting "Reading" or "Read" upserts a record in `reading_statuses`
  - Reading status updates on archived books do **not** trigger activity log events
- No filtering or sorting in MVP

**Empty state:** _"No books in the archive yet — the club's reading history will appear here."_

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
   - If setting: _"You're about to set the club's current book. The current nominations list will not be affected unless this book was nominated."_
   - If editing: _"You're about to replace the current book. The previous book will be moved to the archive."_
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
2. Message: _"Congratulations! You've reached [Level]!"_ (or special message for Shakespeare)
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

**books** — Anyone (authenticated) can read. Authenticated users can insert (use upsert with `onConflict: 'google_books_id'` to handle duplicate caching gracefully).

**current_book** — Anyone (authenticated) can read. Any authenticated user can insert or update (insert for the first-ever current book; update for all subsequent changes).

**archived_books** — Anyone (authenticated) can read. No direct client insert — written exclusively by the `on_current_book_updated` trigger (runs as `SECURITY DEFINER`).

**reading_statuses** — Anyone (authenticated) can read. Owner can insert, update, and delete their own records only.

**nominations** — Anyone (authenticated) can read. Authenticated users can insert. Owner can update `pitch` only (no user-initiated delete). Deletion only via the `on_current_book_updated` trigger when the nominated book becomes the current book.

**votes** — Anyone (authenticated) can read. Authenticated users can insert their own vote, provided they did not create the nomination. Users can delete their own vote.

**activity_log** — Anyone (authenticated) can read. No direct client insert — written exclusively by Postgres triggers (all run as `SECURITY DEFINER`).

### Postgres Triggers

Three triggers handle all server-side automation: archiving, nomination cleanup, and activity logging. No API routes or service role key are needed for these operations.

---

**Trigger 1 — Archive previous book + remove nomination when current book changes**

Fires `AFTER UPDATE` on `current_book`. Handles two things atomically: archives the outgoing book using `set_at`'s month/year, and deletes any nomination for the incoming book.

```sql
CREATE OR REPLACE FUNCTION handle_current_book_updated()
RETURNS trigger AS $$
BEGIN
  -- Archive the outgoing book using the month/year it was set as current
  IF OLD.book_id IS NOT NULL THEN
    INSERT INTO archived_books (book_id, month, year)
    VALUES (
      OLD.book_id,
      EXTRACT(MONTH FROM OLD.set_at)::integer,
      EXTRACT(YEAR FROM OLD.set_at)::integer
    );
  END IF;

  -- Remove nomination for the incoming book if one exists (cascades votes)
  DELETE FROM nominations WHERE book_id = NEW.book_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_current_book_updated
  AFTER UPDATE ON current_book
  FOR EACH ROW EXECUTE PROCEDURE handle_current_book_updated();
```

---

**Trigger 2 — Log activity when current book changes**

Fires `AFTER UPDATE` on `current_book`.

```sql
CREATE OR REPLACE FUNCTION log_current_book_changed()
RETURNS trigger AS $$
BEGIN
  INSERT INTO activity_log (user_id, action_type, metadata)
  VALUES (
    NEW.set_by,
    'current_book_changed',
    jsonb_build_object(
      'new_book_id',        NEW.book_id,
      'new_book_title',     (SELECT title FROM books WHERE id = NEW.book_id),
      'previous_book_id',   OLD.book_id,
      'previous_book_title',(SELECT title FROM books WHERE id = OLD.book_id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_current_book_changed
  AFTER UPDATE ON current_book
  FOR EACH ROW EXECUTE PROCEDURE log_current_book_changed();
```

---

**Trigger 3 — Log activity when a nomination is submitted**

Fires `AFTER INSERT` on `nominations`.

```sql
CREATE OR REPLACE FUNCTION log_book_nominated()
RETURNS trigger AS $$
BEGIN
  INSERT INTO activity_log (user_id, action_type, metadata)
  VALUES (
    NEW.nominated_by,
    'book_nominated',
    jsonb_build_object(
      'book_id',       NEW.book_id,
      'book_title',    (SELECT title FROM books WHERE id = NEW.book_id),
      'nomination_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_nomination_created
  AFTER INSERT ON nominations
  FOR EACH ROW EXECUTE PROCEDURE log_book_nominated();
```

---

**Trigger 4 — Log activity when the current book is marked as read**

Fires `AFTER INSERT OR UPDATE` on `reading_statuses`. Only logs if the status is changing TO `read` AND the book is the current book (not an archived book).

```sql
CREATE OR REPLACE FUNCTION log_book_read()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'read'
     AND (OLD IS NULL OR OLD.status != 'read')
     AND NEW.book_id = (SELECT book_id FROM current_book LIMIT 1)
  THEN
    INSERT INTO activity_log (user_id, action_type, metadata)
    VALUES (
      NEW.user_id,
      'book_read',
      jsonb_build_object(
        'book_id',    NEW.book_id,
        'book_title', (SELECT title FROM books WHERE id = NEW.book_id)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reading_status_read
  AFTER INSERT OR UPDATE ON reading_statuses
  FOR EACH ROW EXECUTE PROCEDURE log_book_read();
```

---

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
