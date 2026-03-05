export function encodeGalleryPath(slug: string): string {
  return encodeURIComponent(slug);
}

export function decodeGalleryPath(encoded: string): string | null {
  try {
    const decoded = decodeURIComponent(encoded);
    if (!decoded || decoded.includes('\0')) return null;
    return decoded;
  } catch {
    return null;
  }
}
