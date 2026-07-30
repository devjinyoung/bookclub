import { supabaseBrowserClient } from './supabaseClient';
import { uploadAvatarAndGetUrl } from './avatar';

interface SignupParams {
  name: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: File | null;
}

export async function signUpWithEmail({ name, email, password, bio, avatar }: SignupParams) {
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

  return data;
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

  return data;
}
