import { supabaseBrowserClient } from './supabaseClient';
import { uploadAvatarAndGetUrl } from './avatar';

export type UpdateProfileParams = {
  userId: string;
  name: string;
  bio: string | null;
  avatar?: File | null;
};

export interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at?: string | null;
}

export async function getCurrentUser() {
  return supabaseBrowserClient.auth.getUser();
}

export async function getProfileById(userId: string) {
  const { data, error } = await supabaseBrowserClient
    .from('profiles')
    .select('id, name, bio, avatar_url, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile({ userId, name, bio, avatar }: UpdateProfileParams) {
  let avatarUrl: string | null | undefined;

  if (avatar) {
    avatarUrl = await uploadAvatarAndGetUrl(userId, avatar);
  }

  const updates: {
    name: string;
    bio: string | null;
    avatar_url?: string | null;
  } = {
    name,
    bio,
  };

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  const { data, error } = await supabaseBrowserClient
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, name, bio, avatar_url')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
