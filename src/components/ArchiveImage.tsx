/* eslint-disable @next/next/no-img-element -- Native rendering is required to preserve APNG animation. */
import NextImage, { type ImageProps } from 'next/image';

const ANIMATED_IMAGE_PATTERN = /\.(?:apng|gif)(?:[?#]|$)/i;
const FILL_IMAGE_CLASS = 'absolute inset-0 size-full';

function sourceUrl(src: ImageProps['src']) {
  if (typeof src === 'string') return src;
  return 'src' in src ? src.src : src.default.src;
}

function isAnimatedImage(src: ImageProps['src']) {
  return ANIMATED_IMAGE_PATTERN.test(sourceUrl(src));
}

/**
 * Preserves APNG and GIF animation with the browser's native image renderer
 * while retaining Next.js image optimization for every other image format.
 */
export default function ArchiveImage(props: ImageProps) {
  if (!isAnimatedImage(props.src)) {
    return <NextImage {...props} />;
  }

  const {
    alt,
    className,
    fill,
    height,
    priority,
    sizes,
    src,
    style,
    width,
    ...imageProps
  } = props;

  return (
    <img
      {...imageProps}
      src={sourceUrl(src)}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      fetchPriority={priority ? 'high' : undefined}
      className={fill ? `${FILL_IMAGE_CLASS} ${className ?? ''}` : className}
      style={style}
    />
  );
}
