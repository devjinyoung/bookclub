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

export type UpdateProfileParams = {
  userId: string;
  name: string;
  bio: string | null;
};

export async function updateProfile({ userId, name, bio }: UpdateProfileParams) {
  const { data, error } = await supabaseBrowserClient
    .from('profiles')
    .update({
      name,
      bio,
    })
    .eq('id', userId)
    .select('id, name, bio, avatar_url')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
