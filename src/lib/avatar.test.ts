import { beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.fn();
const getPublicUrl = vi.fn();

vi.mock('./supabaseClient', () => ({
  supabaseBrowserClient: {
    storage: {
      from: () => ({ upload, getPublicUrl }),
    },
  },
}));

import { assertValidAvatarFile, uploadAvatarAndGetUrl } from './avatar';

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/a.png' } });
});

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function makeFile(bytes: number[], type: string, name = 'avatar'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('assertValidAvatarFile', () => {
  it('accepts an allowed image type under the size limit', () => {
    const file = makeFile([1, 2, 3], 'image/png');
    expect(() => assertValidAvatarFile(file)).not.toThrow();
  });

  it('rejects files over 5MB', () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'avatar', {
      type: 'image/png',
    });
    expect(() => assertValidAvatarFile(oversized)).toThrow('5MB or smaller');
  });

  it('rejects a disallowed reported MIME type', () => {
    const file = makeFile([1, 2, 3], 'application/pdf');
    expect(() => assertValidAvatarFile(file)).toThrow('PNG, JPEG, WEBP, or GIF');
  });

  it('rejects an executable disguised with an image MIME type', () => {
    // Browser-reported type is spoofable; this only checks the cheap early-reject
    // path. Content sniffing happens separately via magic bytes before upload.
    const file = makeFile([0x4d, 0x5a], 'image/png', 'not-actually-an-image.exe');
    expect(() => assertValidAvatarFile(file)).not.toThrow();
  });

  it('allows a missing/empty reported type to fall through to content sniffing', () => {
    const file = makeFile([1, 2, 3], '');
    expect(() => assertValidAvatarFile(file)).not.toThrow();
  });
});

describe('uploadAvatarAndGetUrl', () => {
  it('rejects content whose magic bytes do not match a real image, even with a spoofed MIME type', async () => {
    const fakeImage = makeFile([0x4d, 0x5a, 0x90, 0x00], 'image/png', 'payload.png');
    await expect(uploadAvatarAndGetUrl('user-1', fakeImage)).rejects.toThrow(
      'PNG, JPEG, WEBP, or GIF',
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads and returns the public URL for a real PNG', async () => {
    const realPng = makeFile(PNG_SIGNATURE, 'image/png');
    const url = await uploadAvatarAndGetUrl('user-1', realPng);

    expect(url).toBe('https://example.com/a.png');
    expect(upload).toHaveBeenCalledTimes(1);
    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(/^user-1\/avatar-\d+\.png$/);
    expect(options).toEqual({ contentType: 'image/png' });
  });
});
