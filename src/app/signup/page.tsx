'use client';

import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/authClient';
import SignupForm, { type SignupFormValues } from '@/components/SignupForm';

export default function SignupPage() {
  const router = useRouter();

  async function handleSubmit(values: SignupFormValues) {
    const { name, email, password, bio } = values;
    await signUpWithEmail({ name, email, password, bio });
    router.push('/');
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create your BookClub account to join the club.
        </p>
      </header>

      <SignupForm onSubmit={handleSubmit} />
    </div>
  );
}
