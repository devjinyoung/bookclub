import { supabaseBrowserClient } from "./supabaseClient";

interface SignupParams {
  name: string;
  email: string;
  password: string;
  bio?: string;
}

export async function signUpWithEmail({
  name,
  email,
  password,
  bio,
}: SignupParams) {
  const { data, error } = await supabaseBrowserClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        bio: bio ?? "",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (typeof document !== "undefined") {
    document.cookie = "bookclub-auth=1; path=/";
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

  if (typeof document !== "undefined") {
    console.log("setting cookie");
    document.cookie = "bookclub-auth=1; path=/";
  }

  return data;
}

