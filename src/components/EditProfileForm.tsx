'use client';

import { useEffect, useState } from 'react';
import NameBioFields from '@/components/NameBioFields';

export type EditProfileValues = {
  name: string;
  bio: string | null;
  avatar: File | null;
};

type EditProfileFormProps = {
  initialName: string;
  initialBio: string | null;
  initialAvatarUrl: string | null;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (values: EditProfileValues) => Promise<void>;
};

export default function EditProfileForm({
  initialName,
  initialBio,
  initialAvatarUrl,
  onCancel,
  onSave,
}: EditProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setBio(initialBio ?? '');
    setAvatar(null);
  }, [initialName, initialBio, initialAvatarUrl]);

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
      await onSave({
        name: normalizedName,
        bio: normalizedBio,
        avatar,
      });
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="edit-avatar">
          Avatar
        </label>
        {initialAvatarUrl && !avatar && (
          <img
            src={initialAvatarUrl}
            alt="Current avatar"
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        {avatar && (
          <p className="text-xs text-slate-400">
            Selected file: <span className="text-slate-200">{avatar.name}</span>
          </p>
        )}
        <input
          id="edit-avatar"
          type="file"
          accept="image/*"
          className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
        />
      </div>

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
