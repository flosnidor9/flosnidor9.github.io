'use client';

import Image from '@/components/ArchiveImage';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

function PhotoPage({ album, dimensions, page, side }: { album: GalleryAlbum; dimensions: PhotoDimensions; page?: ReaderPage; side: 'left' | 'right' }) {
  const photo = page?.photo;
  const wideHalf = page?.wideHalf;
  const size = photo ? dimensions[photo.id] : undefined;
  const photoWidth = size?.width ?? 1600;
  const photoHeight = size?.height ?? 1200;
  const photoAreaRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const area = photoAreaRef.current;
    if (!area) return;

    const fitFrame = () => {
      const { width, height } = area.getBoundingClientRect();
      if (!width || !height) return;
      const framePhotoWidth = wideHalf ? photoWidth / 2 : photoWidth;
      const scale = Math.min(width / framePhotoWidth, height / photoHeight);
      setFrameSize({ width: (framePhotoWidth * scale / width) * 100, height: (photoHeight * scale / height) * 100 });
    };

    fitFrame();
    const observer = new ResizeObserver(fitFrame);
    observer.observe(area);
    return () => observer.disconnect();
  }, [photoHeight, photoWidth, wideHalf]);

  return (
    <div className={`album-reader-page album-reader-page-${side}${wideHalf ? ' album-reader-page-wide' : ''}`}>
      {photo ? <>
        <div ref={photoAreaRef} className={`album-reader-photo${wideHalf ? ` album-reader-photo-wide album-reader-photo-wide-${wideHalf}` : ''}`}>
          {wideHalf ? (
            <div className={`album-reader-photo-frame album-reader-photo-wide-frame album-reader-photo-wide-frame-${wideHalf}`} style={frameSize ? { width: `${frameSize.width}%`, height: `${frameSize.height}%` } : undefined}>
              <Image src={photo.src} alt={photo.alt || `${album.title} 사진`} fill sizes="(max-width: 640px) 44vw, 34rem" className="object-contain" />
            </div>
          ) : (
            <div className="album-reader-photo-frame" style={frameSize ? { width: `${frameSize.width}%`, height: `${frameSize.height}%` } : undefined}>
              <Image src={photo.src} alt={photo.alt || `${album.title} 사진`} fill sizes="(max-width: 640px) 44vw, 34rem" className="object-contain" />
            </div>
          )}
        </div>
        <p className="album-reader-credit">
          {photo.copyright.url ? <a href={photo.copyright.url} target="_blank" rel="noreferrer">© {photo.copyright.name}</a> : `© ${photo.copyright.name}`}
        </p>
      </> : <span className="album-reader-empty">The end</span>}
    </div>
  );
}

function Panorama({ album, dimensions, photo }: { album: GalleryAlbum; dimensions: PhotoDimensions; photo: GalleryPhoto }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const size = dimensions[photo.id];
  const photoWidth = size?.width ?? 1600;
  const photoHeight = size?.height ?? 900;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fitFrame = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / photoWidth, height / photoHeight);
      setFrameSize({ width: (photoWidth * scale / width) * 100, height: (photoHeight * scale / height) * 100 });
    };
    fitFrame();
    const observer = new ResizeObserver(fitFrame);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [photoHeight, photoWidth]);

  return (
    <div ref={stageRef} className="album-reader-panorama">
      <div className="album-reader-photo-frame" style={frameSize ? { width: `${frameSize.width}%`, height: `${frameSize.height}%` } : undefined}>
        <Image src={photo.src} alt={photo.alt || `${album.title} 사진`} fill sizes="(max-width: 640px) 88vw, 68rem" className="object-contain" />
      </div>
    </div>
  );
}

export default function AlbumReader({ album, onClose }: Props) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [turning, setTurning] = useState(false);
  const [targetSpreadRevealed, setTargetSpreadRevealed] = useState(false);
  const [dimensions, setDimensions] = useState<PhotoDimensions>(() =>
    Object.fromEntries(
      album.photos
        .filter((p) => p.width && p.height)
        .map((p) => [p.id, { width: p.width!, height: p.height! }])
    )
  );
  const readerPages = useMemo(() => makeReaderPages(album.photos, dimensions), [album.photos, dimensions]);
  const maxPage = Math.max(0, Math.ceil(readerPages.length / 2) - 1);
  const currentPage = Math.min(page, maxPage);
  const currentFirstPhotoIndex = currentPage * 2;
  const spreadPage = turning && targetSpreadRevealed ? currentPage + direction : currentPage;
  const firstPhotoIndex = spreadPage * 2;
  const leftPage = readerPages[firstPhotoIndex];
  const rightPage = readerPages[firstPhotoIndex + 1];
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
    setTargetSpreadRevealed(false);
    setTurning(true);
  }, [currentPage, maxPage, turning]);

  const finishTurn = () => {
    setPage((current) => Math.min(maxPage, Math.max(0, current + direction)));
    setTargetSpreadRevealed(false);
    setTurning(false);
  };

  const revealTargetSpreadAtFold = (latest: Record<string, string | number>) => {
    const rotation = latest.rotateY;
    if (typeof rotation === 'number' && Math.abs(rotation) >= 90) setTargetSpreadRevealed(true);
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
              <PhotoPage album={album} dimensions={dimensions} page={leftPage} side="left" />
              <PhotoPage album={album} dimensions={dimensions} page={rightPage} side="right" />
              {isWideSpread && leftPage.photo ? <Panorama album={album} dimensions={dimensions} photo={leftPage.photo} /> : null}
            </div>
            {turning ? <motion.div className={`album-reader-flip ${direction > 0 ? 'album-reader-flip-forward' : 'album-reader-flip-backward'}`} initial={{ rotateY: 0 }} animate={{ rotateY: direction > 0 ? -180 : 180 }} transition={{ duration: PAGE_TURN_DURATION, ease: PAGE_TURN_EASING }} onUpdate={revealTargetSpreadAtFold} onAnimationComplete={finishTurn}>
              <div className="album-reader-flip-face album-reader-flip-front"><PhotoPage album={album} dimensions={dimensions} page={readerPages[direction > 0 ? currentFirstPhotoIndex + 1 : currentFirstPhotoIndex]} side={direction > 0 ? 'right' : 'left'} /></div>
              <div className="album-reader-flip-face album-reader-flip-back"><PhotoPage album={album} dimensions={dimensions} page={readerPages[direction > 0 ? currentFirstPhotoIndex + 2 : currentFirstPhotoIndex - 1]} side={direction > 0 ? 'left' : 'right'} /></div>
            </motion.div> : null}
            <button type="button" className="album-reader-turn album-reader-turn-previous" onClick={() => turnPage(currentPage - 1)} disabled={currentPage === 0 || turning} aria-label="이전 페이지" />
            <button type="button" className="album-reader-turn album-reader-turn-next" onClick={() => turnPage(currentPage + 1)} disabled={currentPage === maxPage || turning} aria-label="다음 페이지" />
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
