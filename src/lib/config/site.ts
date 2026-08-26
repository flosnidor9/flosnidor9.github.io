const DEFAULT_SITE_URL = 'https://flosnidor9.github.io';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
export const SITE_ORIGIN = new URL(SITE_URL);
export const DEFAULT_OG_IMAGE_URL = new URL('/opengraph-image.png', SITE_ORIGIN).toString();
