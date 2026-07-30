import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser/client-side Supabase client. Persists the session in cookies (not
// localStorage) so that middleware and route handlers can read and verify it.
export const supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
