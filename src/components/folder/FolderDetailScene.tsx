'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { FolderData, PostData } from '@/lib/data/folders';

type Props = {
  folder: FolderData;
  posts: PostData[];
  content: string | null;
  backHref?: string;
  backLabel?: string;
};

type LightboxState = {
  src: string;
  scrollY: number;
};

const memoComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-sans text-[0.82rem] text-black/70 leading-relaxed mb-[0.4rem] last:mb-0">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-mono text-[0.95rem] text-black/85 mb-[0.4rem] font-bold">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-mono text-[0.88rem] text-black/80 mb-[0.35rem] font-semibold">{children}</h2>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-black/90 font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="text-black/70">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside font-mono text-[0.82rem] text-black/70 mb-[0.4rem] space-y-[0.2rem]">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
};

const folderMarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-serif text-[1.25rem] md:text-[1.5rem] text-black/90 mb-[0.75rem] text-center">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-serif text-[1.1rem] md:text-[1.25rem] text-black/85 mb-[0.5rem] mt-[1rem] text-center">{children}</h2>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-sans text-[0.9rem] text-black/70 leading-relaxed mb-[0.75rem] last:mb-0 text-center">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-black/70 mb-[0.75rem] space-y-[0.25rem] text-center">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="font-sans text-[0.85rem] text-center">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-black/90 font-medium">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="text-black/80 italic">{children}</em>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-[2px] border-black/20 pl-[1rem] my-[0.75rem] text-black/60 italic text-center">{children}</blockquote>
  ),
  hr: () => <hr className="border-black/10 my-[1rem]" />,
};

function resolveOrderedPosts(allPosts: PostData[], orderedSlugs: string[] | null): PostData[] {
  if (!orderedSlugs || orderedSlugs.length === 0) return allPosts;

  const bySlug = new Map(allPosts.map((post) => [post.slug, post] as const));
  const ordered = orderedSlugs.map((slug) => bySlug.get(slug)).filter((post): post is PostData => Boolean(post));
  const remaining = allPosts.filter((post) => !orderedSlugs.includes(post.slug));
  return [...ordered, ...remaining];
}

export default function FolderDetailScene({ folder, posts, content, backHref = '/bubbleHome/gallery', backLabel = 'Back' }: Props) {
  const [selectedImage, setSelectedImage] = useState<LightboxState | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const [thumbnailSlug, setThumbnailSlug] = useState<string | null>(null);
  const [thumbnailCopied, setThumbnailCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [orderedPosts, setOrderedPosts] = useState<PostData[]>(posts);
  const [storedOrder, setStoredOrder] = useState<string[] | null>(null);
  const [fileOrder, setFileOrder] = useState<string[] | null>(null);
  const [isManualOrder, setIsManualOrder] = useState(false);

  const storageKey = `gallery-order-${folder.slug}`;
  const encodedSlug = folder.slug
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const orderJsonUrl = `/images/${encodedSlug}/order.json`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setStoredOrder(null);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      setStoredOrder(parsed);
    } catch {
      setStoredOrder(null);
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    fetch(orderJsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error('no order file');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('invalid order data');
        setFileOrder(data);
      })
      .catch(() => {
        if (!cancelled) setFileOrder(null);
      });

    return () => {
      cancelled = true;
    };
  }, [orderJsonUrl]);

  useEffect(() => {
    const orderToApply = fileOrder ?? storedOrder;
    if (isManualOrder) {
      return;
    }

    if (orderToApply && orderToApply.length > 0) {
      setOrderedPosts(resolveOrderedPosts(posts, orderToApply));
    } else {
      setOrderedPosts(posts);
    }
  }, [fileOrder, isManualOrder, posts, storedOrder]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'KeyE') {
        event.preventDefault();
        setEditMode((prev) => !prev);
      }
      if (event.shiftKey && event.code === 'KeyT') {
        event.preventDefault();
        setThumbnailMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (thumbnailSlug) return;

    const currentThumbnailPost = posts.find((post) => post.image === folder.thumbnail);
    if (currentThumbnailPost) {
      setThumbnailSlug(currentThumbnailPost.slug);
    }
  }, [folder.thumbnail, posts, thumbnailSlug]);

  useEffect(() => {
    if (!isManualOrder) return;
    const slugs = orderedPosts.map((post) => post.slug);
    localStorage.setItem(storageKey, JSON.stringify(slugs));
    setStoredOrder(slugs);
  }, [isManualOrder, orderedPosts, storageKey]);

  useEffect(() => {
    if (!selectedImage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedImage]);

  const postCountLabel = useMemo(() => `${orderedPosts.length} items`, [orderedPosts.length]);

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(orderedPosts.map((post) => post.slug), null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReorder = (next: PostData[]) => {
    setIsManualOrder(true);
    setOrderedPosts(next);
  };

  const handleResetOrder = () => {
    localStorage.removeItem(storageKey);
    setStoredOrder(null);
    setIsManualOrder(false);
  };

  const selectedThumbnailPost = orderedPosts.find((post) => post.slug === thumbnailSlug && post.image);
  const selectedThumbnailFile =
    selectedThumbnailPost?.image
      ? decodeURIComponent(selectedThumbnailPost.image.split('/').pop() ?? '')
      : null;
  const thumbnailJson = selectedThumbnailFile
    ? JSON.stringify({ thumbnail: selectedThumbnailFile }, null, 2)
    : null;

  const handleCopyThumbnailJson = async () => {
    if (!thumbnailJson) return;
    await navigator.clipboard.writeText(thumbnailJson);
    setThumbnailCopied(true);
    setTimeout(() => setThumbnailCopied(false), 2000);
  };

  return (
    <>
      <section className="relative min-h-screen w-full cursor-none pb-[3rem] md:pb-[4rem]">
        <motion.header
          className="flex flex-col items-center text-center mb-[3rem] md:mb-[4rem] px-[1.5rem] md:px-[2rem] pt-[5rem]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="w-full max-w-[64rem] mx-auto mb-[1rem] flex">
            <Link
              href={backHref}
              className="inline-flex items-center gap-[0.4rem] rounded-full border border-black/40 bg-white/5 px-[0.75rem] py-[0.45rem] text-[0.82rem] text-black/75 transition-colors hover:bg-white/10"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{backLabel}</span>
            </Link>
          </div>
          <motion.h1
            className="font-serif text-[2rem] md:text-[2.5rem] lg:text-[3rem] text-black/90 leading-tight mb-[0.75rem]"
            layoutId={`folder-title-${folder.slug}`}
          >
            {folder.title}
          </motion.h1>
          <div className="flex items-center gap-[0.75rem] flex-wrap justify-center">
            {folder.tags.map((tag) => (
              <span key={tag} className="text-[0.75rem] text-black/50 bg-white/5 px-[0.75rem] py-[0.25rem] rounded-full">
                {tag}
              </span>
            ))}
            <span className="text-[0.75rem] text-black/30">{postCountLabel}</span>
          </div>
        </motion.header>

        {content && (
          <div className="flex justify-center w-full mb-[5rem] px-[1.5rem]">
            <motion.article
              className="glass-card rounded-[1.25rem] p-[2rem] md:p-[2.5rem] w-full max-w-[40rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <ReactMarkdown components={folderMarkdownComponents}>{content}</ReactMarkdown>
            </motion.article>
          </div>
        )}

        {!editMode ? (
          <div className="w-full px-[1rem] md:px-[2rem] lg:px-[3rem]">
            <div className="mx-auto grid max-w-[110rem] grid-cols-1 items-start gap-[1rem] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-[1.25rem]">
              {orderedPosts.map((post, index) => (
                <GalleryMasonryCard
                  key={post.slug}
                  post={post}
                  index={index}
                  onImageClick={(src) => setSelectedImage({ src, scrollY: window.scrollY })}
                  thumbnailMode={thumbnailMode}
                  isSelectedThumbnail={post.slug === thumbnailSlug}
                  onSelectThumbnail={() => setThumbnailSlug(post.slug)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full px-[1rem] md:px-[2rem] lg:px-[3rem]">
            <div className="mx-auto max-w-[56rem]">
              <Reorder.Group axis="y" values={orderedPosts} onReorder={handleReorder} className="space-y-[0.85rem]">
                {orderedPosts.map((post, index) => (
                  <EditableOrderCard key={post.slug} post={post} index={index} />
                ))}
              </Reorder.Group>
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox
            src={selectedImage.src}
            alt={folder.title}
            scrollY={selectedImage.scrollY}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {(editMode || thumbnailMode) && (
              <motion.div
                className="fixed bottom-[1.25rem] right-[1.25rem] flex flex-col gap-[0.55rem] items-end"
                style={{ zIndex: 9999 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25 }}
              >
                {editMode ? (
                  <>
                    <p className="font-mono text-[0.7rem] text-black/45 pr-[0.2rem]">Reorder mode · Shift+E to close</p>
                    <button
                      onClick={handleCopyJson}
                      className="glass-card rounded-[0.8rem] px-[1rem] py-[0.55rem] font-mono text-[0.8rem] text-black/85 hover:bg-white/[0.1] transition-colors"
                    >
                      {copied ? 'Copied JSON' : 'Copy JSON'}
                    </button>
                    <button
                      onClick={handleResetOrder}
                      className="glass-card rounded-[0.8rem] px-[1rem] py-[0.55rem] font-mono text-[0.75rem] text-black/55 hover:bg-white/[0.1] transition-colors"
                    >
                      Reset Order
                    </button>
                  </>
                ) : null}

                {thumbnailMode ? (
                  <>
                    <p className="font-mono text-[0.7rem] text-black/45 pr-[0.2rem]">Thumbnail mode · Shift+T to close</p>
                    <p className="font-mono text-[0.68rem] text-black/35 pr-[0.2rem]">
                      save to: /public/images/{folder.slug}/folder.json
                    </p>
                    <button
                      onClick={handleCopyThumbnailJson}
                      disabled={!thumbnailJson}
                      className="glass-card rounded-[0.8rem] px-[1rem] py-[0.55rem] font-mono text-[0.8rem] text-black/85 hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {thumbnailCopied ? 'Copied folder.json' : 'Copy folder.json'}
                    </button>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

type GalleryMasonryCardProps = {
  post: PostData;
  index: number;
  onImageClick: (src: string) => void;
  thumbnailMode: boolean;
  isSelectedThumbnail: boolean;
  onSelectThumbnail: () => void;
};

function GalleryMasonryCard({
  post,
  index,
  onImageClick,
  thumbnailMode,
  isSelectedThumbnail,
  onSelectThumbnail,
}: GalleryMasonryCardProps) {
  const handleImageClick = () => {
    if (!post.image) return;
    if (thumbnailMode) {
      onSelectThumbnail();
      return;
    }
    onImageClick(post.image);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.03, 0.3) }}
    >
      {post.image ? (
        <>
          <motion.button
            type="button"
            className="group relative w-full overflow-hidden rounded-3xl p-0"
            style={{ lineHeight: 0 }}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={handleImageClick}
          >
            <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[0_1.4rem_3.5rem_rgba(6,8,12,0.5)]" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(80%_120%_at_50%_0%,rgba(120,255,230,0.16),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {thumbnailMode ? (
              <div className="pointer-events-none absolute left-[0.75rem] top-[0.75rem] rounded-full bg-white/55 px-[0.7rem] py-[0.35rem] font-mono text-[0.68rem] text-black/90">
                {isSelectedThumbnail ? 'Selected thumbnail' : 'Click to set thumbnail'}
              </div>
            ) : null}
            <Image
              src={post.image}
              alt={post.slug}
              width={post.width ?? 1200}
              height={post.height ?? 900}
              className={`h-auto w-full rounded-3xl object-contain brightness-[0.94] transition duration-300 group-hover:brightness-105 ${
                thumbnailMode && isSelectedThumbnail ? 'ring-[0.16rem] ring-cyan-200/75 ring-inset' : ''
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 20vw"
              draggable={false}
              loading={index < 8 ? 'eager' : 'lazy'}
              priority={index < 8}
            />
          </motion.button>

          {post.content && (
            <motion.div className="mt-[0.65rem] px-[0.2rem] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ReactMarkdown components={memoComponents}>{post.content}</ReactMarkdown>
            </motion.div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-white/[0.04] px-[1rem] py-[0.8rem]">
          <ReactMarkdown components={memoComponents}>{post.content!}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
}

type EditableOrderCardProps = {
  post: PostData;
  index: number;
};

function EditableOrderCard({ post, index }: EditableOrderCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item value={post} className="list-none" dragListener={false} dragControls={dragControls}>
      <motion.article
        layout
        className="glass-card flex items-center gap-[0.75rem] rounded-2xl px-[0.7rem] py-[0.7rem] md:gap-[0.9rem]"
        style={{
          boxShadow: '0 1rem 2.4rem rgba(0,0,0,0.35)',
        }}
      >
        <button
          type="button"
          onPointerDown={(event) => dragControls.start(event)}
          className="inline-flex h-[1.9rem] w-[1.9rem] shrink-0 items-center justify-center rounded-full bg-white/10 text-black/70 hover:bg-white/15"
          aria-label={`Reorder ${post.slug}`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
        </button>

        {post.image ? (
          <Image src={post.image} alt={post.slug} width={80} height={80} className="h-[3.8rem] w-[3.8rem] rounded-2xl object-contain" draggable={false} />
        ) : (
          <div className="h-[3.8rem] w-[3.8rem] rounded-2xl bg-white/10" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[0.72rem] text-black/45">{index + 1}</p>
          <p className="truncate font-mono text-[0.83rem] text-black/80">{post.slug}</p>
        </div>
      </motion.article>
    </Reorder.Item>
  );
}

type LightboxProps = { src: string; alt: string; scrollY: number; onClose: () => void };

function ImageLightbox({ src, alt, scrollY, onClose }: LightboxProps) {
  return (
    <motion.div
      className="absolute left-0 right-0 z-50 flex h-screen items-center justify-center cursor-none"
      style={{ top: `${scrollY}px` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <button
        className="absolute top-[1.5rem] right-[1.5rem] glass-card w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center z-10 hover:bg-white/[0.12] transition-colors"
        onClick={onClose}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black/70">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <motion.div
        className="relative max-w-[90vw] max-h-[85vh] rounded-[1rem] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image src={src} alt={alt} width={1200} height={800} className="object-contain max-h-[85vh] w-auto" priority />
      </motion.div>
    </motion.div>
  );
}

