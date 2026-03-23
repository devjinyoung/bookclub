import { supabaseBrowserClient } from './supabaseClient';

interface SignupParams {
  name: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: File | null;
}

export async function signUpWithEmail({
  name,
  email,
  password,
  bio,
  avatar,
}: SignupParams) {
  const normalizedBio = bio ?? '';

  const { data, error } = await supabaseBrowserClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        bio: normalizedBio,
      },
    },
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (userId) {
    const avatarUrl = avatar ? await uploadAvatarAndGetUrl(userId, avatar) : null;

    const { error: profileError } = await supabaseBrowserClient
      .from('profiles')
      .update({
        name,
        bio: normalizedBio,
        avatar_url: avatarUrl,
      })
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }
  }

  if (typeof document !== 'undefined') {
    document.cookie = 'bookclub-auth=1; path=/';
  }

  return data;
}

async function uploadAvatarAndGetUrl(userId: string, avatar: File): Promise<string> {
  const extension = getFileExtension(avatar);
  const path = `${userId}/avatar.${extension}`;

  const { error } = await supabaseBrowserClient.storage.from('avatars').upload(path, avatar, {
    upsert: true,
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

interface SignInParams {
  email: string;
  password: string;
}

export async function signInWithEmail({ email, password }: SignInParams) {
  const { data, error } = await supabaseBrowserClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (typeof document !== 'undefined') {
    console.log('setting cookie');
    document.cookie = 'bookclub-auth=1; path=/';
  }

  return data;
}
