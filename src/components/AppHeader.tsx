'use client';

import { useEffect, useState, type Key } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  Modal,
  Separator,
} from '@heroui/react';
import EditProfileForm from '@/components/EditProfileForm';
import { getProfileById, type Profile, updateProfile } from '@/lib/profile';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function getScreenLabel(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/nominations')) return 'Books';
  if (pathname.startsWith('/members')) return 'Members';
  if (pathname.startsWith('/archive')) return 'Archives';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/login')) return 'Log in';
  if (pathname.startsWith('/signup')) return 'Sign up';
  return 'BookClub';
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || '?'
  );
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const label = getScreenLabel(pathname);
  const hideBackButton = pathname === '/login' || pathname === '/signup';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        getProfileById(user.id).then((data) => {
          setProfile(data);
        });
      }
    });
  }, []);

  const avatarName = profile?.name ?? 'User';
  const avatarInitials = getInitials(avatarName);
  const ownProfileHref = profile?.id ? `/profile/${profile.id}` : null;

  async function handleLogout() {
    try {
      await supabaseBrowserClient.auth.signOut();
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'bookclub-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      router.replace('/login');
    }
  }
  function onDropdownAction(key: Key) {
    const action = String(key);
    if (action === 'view-profile' && ownProfileHref) {
      router.push(ownProfileHref);
    }
    if (action === 'edit-profile' && profile?.id) {
      setIsEditProfileModalOpen(true);
    }
    if (action === 'logout') {
      handleLogout();
    }
  }

  return (
    <header className="sticky top-0 z-10 flex w-full max-w-md items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <button
        type="button"
        onClick={() => router.back()}
        className={`ml-2 flex shrink-0 items-center gap-2 py-3 pr-4 text-slate-400 transition-colors hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          hideBackButton ? 'invisible pointer-events-none' : ''
        }`}
        aria-label="Go back"
        aria-hidden={hideBackButton}
        tabIndex={hideBackButton ? -1 : 0}
      >
        <BackIcon />
      </button>
      <h1 className="truncate text-center font-semibold text-slate-50">{label}</h1>
      <div className="mr-2 flex w-[52px] shrink-0 justify-end">
        {hideBackButton ? (
          <div className="h-8 w-8" aria-hidden />
        ) : (
          <Dropdown>
            <DropdownTrigger>
              <Avatar size="md" className="my-3">
                {profile?.avatar_url ? (
                  <Avatar.Image src={profile.avatar_url} alt={`${avatarName} avatar`} />
                ) : null}
                <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
              </Avatar>
            </DropdownTrigger>
            <DropdownPopover
              placement="bottom end"
              className="bg-slate-900 text-base text-slate-300"
            >
              <DropdownMenu aria-label="User menu" onAction={onDropdownAction}>
                <DropdownItem id="view-profile" isDisabled={!ownProfileHref}>
                  View my profile
                </DropdownItem>
                <DropdownItem id="edit-profile" isDisabled={!profile?.id}>
                  Edit profile
                </DropdownItem>
                <Separator />
                <DropdownItem id="logout" className="text-red-400">
                  Log out
                </DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
        )}
      </div>
      {profile && (
        <Modal>
          <Modal.Backdrop isOpen={isEditProfileModalOpen} onOpenChange={setIsEditProfileModalOpen}>
            <Modal.Container placement="center">
              <Modal.Dialog className="sm:max-w-[420px] bg-slate-900">
                <Modal.Header>
                  <Modal.Heading>Edit profile</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <EditProfileForm
                    initialName={profile.name}
                    initialBio={profile.bio}
                    initialAvatarUrl={profile.avatar_url}
                    onCancel={() => setIsEditProfileModalOpen(false)}
                    onSave={async ({ name, bio, avatar }) => {
                      const updated = await updateProfile({
                        userId: profile.id,
                        name,
                        bio,
                        avatar,
                      });
                      setProfile(updated);
                      setIsEditProfileModalOpen(false);
                      router.push('/');
                    }}
                  />
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </header>
  );
}
