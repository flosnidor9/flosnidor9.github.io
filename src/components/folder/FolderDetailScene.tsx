'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { FolderData, PostData } from '@/lib/data/folders';

type Props = {
  folder: FolderData;
  posts: PostData[];
  content: string | null;
};

type StickerPos = { x: number; y: number; rotate: number };
type LayoutMap = Record<string, StickerPos>;

// ── Markdown 스타일 ───────────────────────────────────────────────────────────

const memoComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-mono text-[0.82rem] text-white/75 leading-relaxed mb-[0.4rem] last:mb-0">
      {children}
    </p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-mono text-[0.95rem] text-white/85 mb-[0.4rem] font-bold">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-mono text-[0.88rem] text-white/80 mb-[0.35rem] font-semibold">{children}</h2>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white/90 font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-white/70">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside font-mono text-[0.82rem] text-white/70 mb-[0.4rem] space-y-[0.2rem]">
      {children}
    </ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
};

const folderMarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-serif text-[1.25rem] md:text-[1.5rem] text-white/90 mb-[0.75rem]">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-serif text-[1.1rem] md:text-[1.25rem] text-white/85 mb-[0.5rem] mt-[1rem]">{children}</h2>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-sans text-[0.9rem] text-white/70 leading-relaxed mb-[0.75rem] last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-white/70 mb-[0.75rem] space-y-[0.25rem]">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="font-sans text-[0.85rem]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white/90 font-medium">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-white/80 italic">{children}</em>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-[2px] border-white/20 pl-[1rem] my-[0.75rem] text-white/60 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-white/10 my-[1rem]" />,
};

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function FolderDetailScene({ folder, posts, content }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMap>({});
  const [adminMode, setAdminMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // state와 별도로 항상 최신 layout을 가리키는 ref
  // (handleExport가 stale closure를 읽는 문제 방지)
  const layoutRef = useRef<LayoutMap>({});

  useEffect(() => setMounted(true), []);

  const firstImage = posts.find((p) => p.image)?.image;
  const bgImage = firstImage || folder.thumbnail;

  // 화면 방향 감지
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => setOrientation(mq.matches ? 'landscape' : 'portrait');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const storageKey = `sticker-layout-${folder.slug}-${orientation}`;
  const layoutFile = `/images/${folder.slug}/layout-${orientation}.json`;

  // layout state와 ref를 함께 갱신하는 헬퍼
  const applyLayout = useCallback((data: LayoutMap) => {
    layoutRef.current = data;
    setLayout(data);
  }, []);

  // orientation 전환 시 해당 방향 레이아웃으로 교체
  // layout-{orientation}.json 우선 → 없으면 localStorage → 없으면 기본 위치
  useEffect(() => {
    applyLayout({});
    fetch(layoutFile)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: LayoutMap) => applyLayout(data))
      .catch(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try { applyLayout(JSON.parse(stored)); } catch { /* ignore */ }
        }
      });
  }, [storageKey, layoutFile, applyLayout]);

  // Shift+E → 어드민 모드 토글
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === 'KeyE') setAdminMode((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDragEnd = useCallback(
    (slug: string, x: number, y: number, rotate: number) => {
      // ref를 즉시 갱신해 export가 항상 최신 값을 읽도록 보장
      const next = { ...layoutRef.current, [slug]: { x, y, rotate } };
      layoutRef.current = next;
      localStorage.setItem(storageKey, JSON.stringify(next));
      setLayout(next);
    },
    [storageKey],
  );

  const handleExport = () => {
    // layoutRef에서 읽어 stale closure 문제 완전 회피
    const fullLayout: LayoutMap = {};
    posts.forEach((post, i) => {
      fullLayout[post.slug] = layoutRef.current[post.slug] ?? {
        x: 0,
        y: 0,
        rotate: stickerMeta[i].rotate,
      };
    });
    navigator.clipboard.writeText(JSON.stringify(fullLayout, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setLayout({});
  };

  const stickerMeta = useMemo(
    () =>
      posts.map((_, i) => ({
        rotate: (seededRand(i * 127 + 311) - 0.5) * 10,
        offsetPct: seededRand(i * 269 + 183) * 42,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts.length],
  );

  return (
    <>
    <section className="min-h-screen w-full overflow-x-hidden cursor-none">
      {/* ── 배경 ── */}
      <div className="fixed inset-0 z-0">
        {bgImage && (
          <div className="absolute inset-0 hero-blur-bg">
            <Image src={bgImage} alt="" fill className="object-cover" priority />
          </div>
        )}
        <div className="absolute inset-0 liquid-bg opacity-60" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 grain-texture pointer-events-none" />
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="relative z-10 min-h-screen py-[3rem] md:py-[4rem] lg:py-[5rem]">
        {/* 헤더 */}
        <motion.header
          className="flex flex-col items-center text-center mb-[3rem] md:mb-[4rem] px-[1.5rem]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/"
            className="glass-card flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-full hover:bg-white/[0.12] transition-colors mb-[1.5rem]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <motion.h1
            className="font-serif text-[2rem] md:text-[2.5rem] lg:text-[3rem] text-white/90 leading-tight mb-[0.75rem]"
            layoutId={`folder-title-${folder.slug}`}
          >
            {folder.title}
          </motion.h1>
          <div className="flex items-center gap-[0.75rem] flex-wrap justify-center">
            {folder.tags.map((tag) => (
              <span key={tag} className="text-[0.75rem] text-white/50 bg-white/5 px-[0.75rem] py-[0.25rem] rounded-full">
                {tag}
              </span>
            ))}
            <span className="text-[0.75rem] text-white/30">{posts.length} items</span>
          </div>
        </motion.header>

        {/* 폴더 설명 */}
        {content && (
          <motion.article
            className="glass-card rounded-[1.25rem] p-[2rem] md:p-[2.5rem] mx-auto text-center"
            style={{ width: 'calc(100% - 3rem)', maxWidth: '40rem', marginBottom: '5rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <ReactMarkdown components={folderMarkdownComponents}>{content}</ReactMarkdown>
          </motion.article>
        )}

        {/* ── 스티커 보드 ── */}
        <div className="relative max-w-[72rem] mx-auto px-[1.5rem] md:px-[4rem]">
          {posts.map((post, i) => (
            <StickerItem
              key={post.slug}
              post={post}
              index={i}
              baseRotate={stickerMeta[i].rotate}
              offsetPct={stickerMeta[i].offsetPct}
              savedPos={layout[post.slug] ?? null}
              onDragEnd={handleDragEnd}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>

        <div className="h-[6rem] md:h-[8rem]" />
      </div>

      {/* ── 그레인 최상위 ── */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-20" />

      {/* 어드민 패널은 portal로 body에 직접 마운트 (overflow-x:hidden 클리핑 우회) */}

      {/* ── 라이트박스 ── */}
      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox
            src={selectedImage}
            alt={folder.title}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>
    </section>

    {/* ── 어드민 패널 — body에 portal로 탈출 (overflow-x:hidden 클리핑 우회) ── */}
    {mounted && createPortal(
      <AnimatePresence>
        {adminMode && (
          <motion.div
            className="fixed bottom-[2rem] right-[2rem] flex flex-col gap-[0.6rem] items-end"
            style={{ zIndex: 9999 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-mono text-[0.7rem] text-white/40 pr-[0.25rem]">
              Admin Mode · {orientation} · Shift+E to close
            </p>
            <button
              onClick={handleExport}
              className="glass-card rounded-[0.75rem] px-[1.25rem] py-[0.6rem] font-mono text-[0.8rem] text-white/80 hover:bg-white/[0.1] transition-colors"
            >
              {copied ? '✓ 복사됨' : `📋 layout-${orientation}.json 복사`}
            </button>
            <button
              onClick={handleReset}
              className="glass-card rounded-[0.75rem] px-[1.25rem] py-[0.6rem] font-mono text-[0.8rem] text-white/45 hover:bg-white/[0.1] transition-colors"
            >
              ↺ 배치 초기화
            </button>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}
    </>
  );
}

// ── 스티커 아이템 ─────────────────────────────────────────────────────────────

type StickerItemProps = {
  post: PostData;
  index: number;
  baseRotate: number;
  offsetPct: number;
  savedPos: StickerPos | null;
  onDragEnd: (slug: string, x: number, y: number, rotate: number) => void;
  onImageClick: (src: string) => void;
};

function StickerItem({ post, index, baseRotate, offsetPct, savedPos, onDragEnd, onImageClick }: StickerItemProps) {
  const marginLeft = `clamp(0px, ${offsetPct}%, calc(100% - 16rem))`;
  const rotate = savedPos?.rotate ?? baseRotate;

  const x = useMotionValue(savedPos?.x ?? 0);
  const y = useMotionValue(savedPos?.y ?? 0);

  // 초기화·orientation 전환 시 motion value 동기화
  useEffect(() => {
    x.set(savedPos?.x ?? 0);
    y.set(savedPos?.y ?? 0);
  }, [savedPos, x, y]);

  // onDragEnd 클로저 내에서 savedPos를 최신 값으로 읽기 위한 ref
  const savedPosRef = useRef(savedPos);
  useEffect(() => { savedPosRef.current = savedPos; }, [savedPos]);

  const [isDragging, setIsDragging] = useState(false);
  const wasDraggedRef = useRef(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.06 * index }}
      drag
      dragMomentum={false}
      style={{
        marginLeft,
        x,
        y,
        position: 'relative',
        zIndex: isDragging ? 100 : undefined,
        display: 'inline-flex',
        flexDirection: 'column',
        marginBottom: '4rem',
      }}
      onDragStart={() => {
        setIsDragging(true);
        wasDraggedRef.current = false;
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        // info.offset: 이번 드래그 제스처의 변위 (x.get()보다 신뢰할 수 있음)
        const moved = Math.abs(info.offset.x) > 3 || Math.abs(info.offset.y) > 3;
        if (moved) {
          wasDraggedRef.current = true;
          const prevX = savedPosRef.current?.x ?? 0;
          const prevY = savedPosRef.current?.y ?? 0;
          onDragEnd(post.slug, prevX + info.offset.x, prevY + info.offset.y, rotate);
        }
      }}
    >
      {post.image ? (
        <>
          {/* 스티커 이미지 */}
          <motion.button
            className="block w-[14rem] md:w-[20rem] will-change-transform cursor-none p-0"
            style={{
              rotate,
              lineHeight: 0,
              borderRadius: '0.75rem',
              filter: isDragging
                ? 'drop-shadow(0 20px 50px rgba(0,0,0,0.75))'
                : 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
              transition: 'filter 0.2s ease',
            }}
            whileHover={isDragging ? {} : { rotate: 0, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => {
              if (!wasDraggedRef.current) onImageClick(post.image!);
              wasDraggedRef.current = false;
            }}
          >
            <Image
              src={post.image}
              alt={post.slug}
              width={800}
              height={800}
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '0.75rem' }}
              sizes="(max-width: 768px) 14rem, 20rem"
              draggable={false}
            />
          </motion.button>

          {/* 메모 텍스트 */}
          {post.content && (
            <motion.div
              className="mt-[0.8rem] max-w-[16rem] md:max-w-[22rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * index + 0.25 }}
            >
              <ReactMarkdown components={memoComponents}>{post.content}</ReactMarkdown>
              <span className="font-mono text-[0.68rem] text-white/35 mt-[0.5rem] inline-block tracking-widest">
                #{post.slug}
              </span>
            </motion.div>
          )}
        </>
      ) : (
        /* 텍스트 전용 */
        <div style={{ rotate: `${rotate}deg` }}>
          <ReactMarkdown components={memoComponents}>{post.content!}</ReactMarkdown>
          <span className="font-mono text-[0.68rem] text-white/35 mt-[0.5rem] inline-block tracking-widest">
            #{post.slug}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── 라이트박스 ────────────────────────────────────────────────────────────────

type LightboxProps = { src: string; alt: string; onClose: () => void };

function ImageLightbox({ src, alt, onClose }: LightboxProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-none"
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
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
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="object-contain max-h-[85vh] w-auto"
          priority
        />
      </motion.div>
    </motion.div>
  );
}
