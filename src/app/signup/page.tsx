'use client';
import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/authClient';
import SignupForm, { type SignupFormValues } from '@/components/SignupForm';

export default function SignupPage() {
  const router = useRouter();

  async function handleSubmit(values: SignupFormValues) {
    const { name, email, password, bio, avatar } = values;
    await signUpWithEmail({ name, email, password, bio, avatar });
    router.push('/');
  }

  return (
    <div className="space-y-6">
      <SignupForm onSubmit={handleSubmit} />
    </div>
  );
}
