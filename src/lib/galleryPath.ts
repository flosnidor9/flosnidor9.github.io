function sanitizeSegments(segments: string[]): string[] {
  return segments.map((segment) => segment.trim()).filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

export function toGalleryPath(slug: string): string {
  const segments = sanitizeSegments(slug.split('/'));
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function fromGallerySegments(segments: string[]): string | null {
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    const normalized = sanitizeSegments(decoded).join('/');
    if (!normalized || normalized.includes('\0')) return null;
    return normalized;
  } catch {
    return null;
  }
}
