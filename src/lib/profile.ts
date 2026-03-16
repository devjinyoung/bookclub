import { supabaseBrowserClient } from './supabaseClient';

export async function getCurrentUser() {
  return supabaseBrowserClient.auth.getUser();
}

export async function getProfileById(userId: string) {
  const { data, error } = await supabaseBrowserClient
    .from('profiles')
    .select('id, name, bio, avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
