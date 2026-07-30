import { supabaseBrowserClient } from './supabaseClient';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function matchesMagicBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Detect image type from file contents (not the browser-reported MIME type). */
function detectImageExtension(bytes: Uint8Array): string | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchesMagicBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (matchesMagicBytes(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }
  // GIF: GIF87a / GIF89a
  if (
    matchesMagicBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matchesMagicBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return 'gif';
  }
  // WEBP: RIFF....WEBP
  if (
    matchesMagicBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function assertValidAvatarFile(file: File): void {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar must be 5MB or smaller.');
  }

  // Cheap early reject when the browser reports a disallowed type; contents are
  // still verified with magic bytes before upload.
  if (file.type && !ALLOWED_AVATAR_TYPES[file.type]) {
    throw new Error('Avatar must be a PNG, JPEG, WEBP, or GIF image.');
  }
}

async function resolveAvatarContentType(avatar: File): Promise<{ extension: string; contentType: string }> {
  assertValidAvatarFile(avatar);

  const header = new Uint8Array(await avatar.slice(0, 12).arrayBuffer());
  const extension = detectImageExtension(header);
  if (!extension) {
    throw new Error('Avatar must be a PNG, JPEG, WEBP, or GIF image.');
  }

  return { extension, contentType: EXTENSION_TO_MIME[extension] };
}

export async function uploadAvatarAndGetUrl(userId: string, avatar: File): Promise<string> {
  const { extension, contentType } = await resolveAvatarContentType(avatar);
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabaseBrowserClient.storage.from('avatars').upload(path, avatar, {
    contentType,
  });

  if (error) {
    throw error;
  }

  const { data } = supabaseBrowserClient.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
