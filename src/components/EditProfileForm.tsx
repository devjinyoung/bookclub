'use client';

import { useEffect, useState } from 'react';
import NameBioFields from '@/components/NameBioFields';

export type EditProfileValues = {
  name: string;
  bio: string | null;
};

type EditProfileFormProps = {
  initialName: string;
  initialBio: string | null;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (values: EditProfileValues) => Promise<void>;
};

export default function EditProfileForm({
  initialName,
  initialBio,
  onCancel,
  onSave,
}: EditProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setBio(initialBio ?? '');
  }, [initialName, initialBio]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError('Name is required.');
      return;
    }

    const normalizedBio = bio.trim() ? bio.trim() : null;

    setIsSubmitting(true);
    try {
      await onSave({ name: normalizedName, bio: normalizedBio });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while updating your profile.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm"
    >
      <NameBioFields
        nameId="edit-name"
        nameValue={name}
        onNameChange={setName}
        nameRequired
        bioId="edit-bio"
        bioValue={bio}
        onBioChange={setBio}
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

