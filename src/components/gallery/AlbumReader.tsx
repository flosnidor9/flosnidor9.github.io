'use client';

import Image from '@/components/ArchiveImage';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import type { GalleryAlbum, GalleryPhoto } from '@/lib/data/gallery';

type Props = { album: GalleryAlbum; onClose: () => void };

function PhotoPage({ album, photo, side }: { album: GalleryAlbum; photo?: GalleryPhoto; side: 'left' | 'right' }) {
  return (
    <div className={`album-reader-page album-reader-page-${side}`}>
      {photo ? <>
        <div className="album-reader-photo">
          <Image src={photo.src} alt={photo.alt || `${album.title} 사진`} fill sizes="(max-width: 640px) 88vw, 34rem" className="object-contain" />
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
  const [turnPhoto, setTurnPhoto] = useState<GalleryPhoto | undefined>();
  const maxPage = Math.max(0, Math.ceil(album.photos.length / 2) - 1);
  const firstPhotoIndex = page * 2;
  const isForwardTurn = turning && direction > 0;
  const isBackwardTurn = turning && direction < 0;
  const leftPhoto = album.photos[isBackwardTurn ? firstPhotoIndex - 2 : firstPhotoIndex];
  const rightPhoto = album.photos[isForwardTurn ? firstPhotoIndex + 3 : firstPhotoIndex + 1];

  const turnPage = useCallback((next: number) => {
    if (turning || next < 0 || next > maxPage) return;
    const nextDirection = next > page ? 1 : -1;
    setDirection(nextDirection);
    setTurnPhoto(album.photos[nextDirection > 0 ? firstPhotoIndex + 1 : firstPhotoIndex]);
    setTurning(true);
  }, [album.photos, firstPhotoIndex, maxPage, page, turning]);

  const finishTurn = () => {
    setPage((current) => current + direction);
    setTurning(false);
    setTurnPhoto(undefined);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') turnPage(page + 1);
      if (event.key === 'ArrowLeft') turnPage(page - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, page, turnPage]);

  return (
    <AnimatePresence>
      <motion.div className="album-reader-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.section
          className="album-reader"
          initial={{ opacity: 0, scale: 0.9, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.92, rotateX: 6 }}
          transition={{ type: 'spring', stiffness: 230, damping: 25 }}
          aria-label={`${album.title} 앨범`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="album-reader-book">
            <div className="album-reader-spread">
              <PhotoPage album={album} photo={leftPhoto} side="left" />
              <PhotoPage album={album} photo={rightPhoto} side="right" />
            </div>
            {turning ? <motion.div className={`album-reader-flip ${direction > 0 ? 'album-reader-flip-forward' : 'album-reader-flip-backward'}`} initial={{ rotateY: 0 }} animate={{ rotateY: direction > 0 ? -180 : 180 }} transition={{ duration: 0.96, ease: [0.16, 0.72, 0.22, 1] }} onAnimationComplete={finishTurn}>
                <div className="album-reader-flip-face album-reader-flip-front"><PhotoPage album={album} photo={turnPhoto} side={direction > 0 ? 'right' : 'left'} /></div>
                <div className="album-reader-flip-face album-reader-flip-back"><PhotoPage album={album} photo={album.photos[direction > 0 ? firstPhotoIndex + 2 : firstPhotoIndex - 1]} side={direction > 0 ? 'left' : 'right'} /></div>
              </motion.div> : null}
            <button type="button" className="album-reader-turn album-reader-turn-previous" onClick={() => turnPage(page - 1)} disabled={page === 0 || turning} aria-label="이전 페이지" />
            <button type="button" className="album-reader-turn album-reader-turn-next" onClick={() => turnPage(page + 1)} disabled={page === maxPage || turning} aria-label="다음 페이지" />
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
