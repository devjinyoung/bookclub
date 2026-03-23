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
  avatar?: File | null;
};

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

async function uploadAvatarAndGetUrl(userId: string, avatar: File): Promise<string> {
  const extension = getFileExtension(avatar);
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabaseBrowserClient.storage.from('avatars').upload(path, avatar, {
    contentType: avatar.type || undefined,
  });

  if (error) {
    throw error;
  }

  const { data } = supabaseBrowserClient.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

function getFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) {
    return fromName;
  }

  const fromType = file.type.split('/').pop()?.toLowerCase();
  if (fromType) {
    if (fromType === 'jpeg') return 'jpg';
    return fromType;
  }

  return 'png';
}
