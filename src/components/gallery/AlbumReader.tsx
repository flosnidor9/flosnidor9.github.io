'use client';

import Image from '@/components/ArchiveImage';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GalleryAlbum, GalleryPhoto } from '@/lib/data/gallery';

type Props = { album: GalleryAlbum; onClose: () => void };
type PhotoDimensions = Record<string, { width: number; height: number }>;
type ReaderPage = { photo?: GalleryPhoto; wideHalf?: 'left' | 'right' };

const WIDE_SPREAD_ASPECT_RATIO = 1.65;
const PAGE_TURN_DURATION = 0.96;
const PAGE_TURN_EASING = [0.16, 0.72, 0.22, 1] as const;

function isWidePhoto(photo: GalleryPhoto, dimensions: PhotoDimensions) {
  const size = dimensions[photo.id];
  return size ? size.width / size.height >= WIDE_SPREAD_ASPECT_RATIO : false;
}

function makeReaderPages(photos: GalleryPhoto[], dimensions: PhotoDimensions): ReaderPage[] {
  const pages: ReaderPage[] = [];
  const remaining = [...photos];

  while (remaining.length > 0) {
    const photo = remaining.shift()!;
    if (!isWidePhoto(photo, dimensions)) {
      pages.push({ photo });
      continue;
    }

    // A panorama must begin on a left leaf. Pull the next single image forward
    // to fill an unfinished spread before it, rather than splitting the panorama
    // across two page turns.
    if (pages.length % 2 !== 0) {
      const nextSingleIndex = remaining.findIndex((candidate) => !isWidePhoto(candidate, dimensions));
      const nextSingle = nextSingleIndex === -1 ? undefined : remaining.splice(nextSingleIndex, 1)[0];
      pages.push(nextSingle ? { photo: nextSingle } : {});
    }

    pages.push(
      { photo, wideHalf: 'left' },
      { photo, wideHalf: 'right' },
    );
  }

  return pages;
}

function PhotoPage({ album, page, side }: { album: GalleryAlbum; page?: ReaderPage; side: 'left' | 'right' }) {
  const photo = page?.photo;
  const wideHalf = page?.wideHalf;

  return (
    <div className={`album-reader-page album-reader-page-${side}${wideHalf ? ' album-reader-page-wide' : ''}`}>
      {photo ? <>
        <div className={`album-reader-photo${wideHalf ? ` album-reader-photo-wide album-reader-photo-wide-${wideHalf}` : ''}`}>
          <Image src={photo.src} alt={photo.alt || `${album.title} 사진`} fill sizes="(max-width: 640px) 44vw, 34rem" className="object-contain" />
        </div>
        <p className="album-reader-credit">
          {photo.copyright.url ? <a href={photo.copyright.url} target="_blank" rel="noreferrer">© {photo.copyright.name}</a> : `© ${photo.copyright.name}`}
        </p>
      </> : <span className="album-reader-empty">The end</span>}
    </div>
  );
}

export default function AlbumReader({ album, onClose }: Props) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [turning, setTurning] = useState(false);
  const [dimensions, setDimensions] = useState<PhotoDimensions>({});
  const readerPages = useMemo(() => makeReaderPages(album.photos, dimensions), [album.photos, dimensions]);
  const maxPage = Math.max(0, Math.ceil(readerPages.length / 2) - 1);
  const currentPage = Math.min(page, maxPage);
  const firstPhotoIndex = currentPage * 2;
  const isForwardTurn = turning && direction > 0;
  const isBackwardTurn = turning && direction < 0;
  const leftPage = readerPages[isBackwardTurn ? firstPhotoIndex - 2 : firstPhotoIndex];
  const rightPage = readerPages[isForwardTurn ? firstPhotoIndex + 3 : firstPhotoIndex + 1];
  const isWideSpread = leftPage?.wideHalf === 'left'
    && rightPage?.wideHalf === 'right'
    && leftPage.photo?.id === rightPage.photo?.id;

  useEffect(() => {
    let cancelled = false;
    album.photos.forEach((photo) => {
      const image = new globalThis.Image();
      image.onload = () => {
        if (cancelled) return;
        setDimensions((current) => current[photo.id] ? current : {
          ...current,
          [photo.id]: { width: image.naturalWidth, height: image.naturalHeight },
        });
      };
      image.src = photo.src;
    });
    return () => { cancelled = true; };
  }, [album.photos]);

  const turnPage = useCallback((next: number) => {
    if (turning || next < 0 || next > maxPage || next === currentPage) return;
    const nextDirection = next > currentPage ? 1 : -1;
    setDirection(nextDirection);
    setTurning(true);
  }, [currentPage, maxPage, turning]);

  const finishTurn = () => {
    setPage((current) => Math.min(maxPage, Math.max(0, current + direction)));
    setTurning(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') turnPage(currentPage + 1);
      if (event.key === 'ArrowLeft') turnPage(currentPage - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage, onClose, turnPage]);

  return (
    <AnimatePresence>
      <motion.div className="album-reader-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.section className="album-reader" initial={{ opacity: 0, scale: 0.9, rotateX: 8 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} exit={{ opacity: 0, scale: 0.92, rotateX: 6 }} transition={{ type: 'spring', stiffness: 230, damping: 25 }} aria-label={`${album.title} 앨범`} onClick={(event) => event.stopPropagation()}>
          <div className={`album-reader-book${isWideSpread ? ' album-reader-book-wide-spread' : ''}`}>
            <div className="album-reader-spread">
              <PhotoPage album={album} page={leftPage} side="left" />
              <PhotoPage album={album} page={rightPage} side="right" />
            </div>
            {turning ? <motion.div className={`album-reader-flip ${direction > 0 ? 'album-reader-flip-forward' : 'album-reader-flip-backward'}`} initial={{ rotateY: 0 }} animate={{ rotateY: direction > 0 ? -180 : 180 }} transition={{ duration: PAGE_TURN_DURATION, ease: PAGE_TURN_EASING }} onAnimationComplete={finishTurn}>
              <div className="album-reader-flip-face album-reader-flip-front"><PhotoPage album={album} page={readerPages[direction > 0 ? firstPhotoIndex + 1 : firstPhotoIndex]} side={direction > 0 ? 'right' : 'left'} /></div>
              <div className="album-reader-flip-face album-reader-flip-back"><PhotoPage album={album} page={readerPages[direction > 0 ? firstPhotoIndex + 2 : firstPhotoIndex - 1]} side={direction > 0 ? 'left' : 'right'} /></div>
            </motion.div> : null}
            <button type="button" className="album-reader-turn album-reader-turn-previous" onClick={() => turnPage(currentPage - 1)} disabled={currentPage === 0 || turning} aria-label="이전 페이지" />
            <button type="button" className="album-reader-turn album-reader-turn-next" onClick={() => turnPage(currentPage + 1)} disabled={currentPage === maxPage || turning} aria-label="다음 페이지" />
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
