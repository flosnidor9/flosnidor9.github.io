export const DEFAULT_GALLERY_ALBUM_THEME_COLOR = '#c87993';

export function galleryAlbumThemeColor(value?: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : DEFAULT_GALLERY_ALBUM_THEME_COLOR;
}
