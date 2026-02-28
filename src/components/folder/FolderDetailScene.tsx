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

// 좌표를 컨테이너 크기 대비 % 로 저장 (반응형 핵심)
type StickerPos = { xPct: number; yPct: number; rotate: number };
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

  const layoutRef = useRef<LayoutMap>({});
  // 스티커 보드 컨테이너 ref → dragConstraints에 사용
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const firstImage = posts.find((p) => p.image)?.image;
  const bgImage = firstImage || folder.thumbnail;

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

  const applyLayout = useCallback((data: LayoutMap) => {
    layoutRef.current = data;
    setLayout(data);
  }, []);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === 'KeyE') setAdminMode((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 드래그 완료 → % 좌표로 저장
  const handleDragEnd = useCallback(
    (slug: string, xPct: number, yPct: number, rotate: number) => {
      console.log(`💾 ${slug} 저장: X=${xPct.toFixed(1)}%, Y=${yPct.toFixed(1)}%`);
      const next = { ...layoutRef.current, [slug]: { xPct, yPct, rotate } };
      layoutRef.current = next;
      localStorage.setItem(storageKey, JSON.stringify(next));
      setLayout(next);
    },
    [storageKey],
  );

  // stickerMeta: 기본 위치(%) 포함
  const stickerMeta = useMemo(
    () =>
      posts.map((_, i) => {
        const count = posts.length;
        // 세로: 균등 분포 + 랜덤 지터
        const baseYPct = count > 1 ? (i / (count - 1)) * 76 + 5 : 45;
        const jitterY = (seededRand(i * 53 + 7) - 0.5) * 14;
        const defaultYPct = Math.max(3, Math.min(90, baseYPct + jitterY));
        // 가로: 5~72% (스티커 너비 여유 고려)
        const defaultXPct = seededRand(i * 269 + 183) * 67 + 5;
        return {
          rotate: (seededRand(i * 127 + 311) - 0.5) * 10,
          defaultXPct,
          defaultYPct,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts.length],
  );

  const handleExport = () => {
    const fullLayout: LayoutMap = {};
    posts.forEach((post, i) => {
      fullLayout[post.slug] = layoutRef.current[post.slug] ?? {
        xPct: stickerMeta[i].defaultXPct,
        yPct: stickerMeta[i].defaultYPct,
        rotate: stickerMeta[i].rotate,
      };
    });
    navigator.clipboard.writeText(JSON.stringify(fullLayout, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    layoutRef.current = {};
    setLayout({});
  };

  // 컨테이너 높이: 실제 배치된 이미지 위치(yPct)를 고려해 동적 계산
  const containerMinHeight = useMemo(() => {
    // 모든 스티커의 실제 Y 위치(%) 중 최댓값 찾기
    let maxYPct = 0;
    posts.forEach((post, i) => {
      const yPct = layout[post.slug]?.yPct ?? stickerMeta[i]?.defaultYPct ?? 50;
      maxYPct = Math.max(maxYPct, yPct);
    });

    // maxYPct가 컨테이너 높이의 %이므로, 실제 필요한 높이 역산
    // 예: maxYPct=80% → 컨테이너는 최소 스티커가 잘리지 않을 만큼 + 여유
    // 80%에 스티커가 있다면, 100%를 기준으로 환산하고 스티커 높이(약 20rem) + 여유(10rem) 추가
    const baseHeight = maxYPct > 0 ? (100 / maxYPct) * 100 : 100;
    const estimatedRem = (baseHeight / 100) * 60 + 30; // 기본 60rem 기준 + 하단 여유

    return `max(85vh, ${Math.max(estimatedRem, 60)}rem)`;
  }, [posts, layout, stickerMeta]);

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

        {/* ── 스티커 보드 (상대좌표 % 기반) ── */}
        <div
          ref={containerRef}
          className="relative w-full mx-auto px-[1.5rem] md:px-[4rem]"
          style={{ minHeight: containerMinHeight, maxWidth: '100%' }}
        >
          {posts.map((post, i) => (
            <StickerItem
              key={post.slug}
              post={post}
              index={i}
              baseRotate={stickerMeta[i].rotate}
              defaultXPct={stickerMeta[i].defaultXPct}
              defaultYPct={stickerMeta[i].defaultYPct}
              savedPos={layout[post.slug] ?? null}
              containerRef={containerRef}
              onDragEnd={handleDragEnd}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>

        <div className="h-[6rem] md:h-[8rem]" />
      </div>

      {/* ── 그레인 최상위 ── */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-20" />

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

    {/* ── 어드민 패널 — body에 portal로 탈출 ── */}
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

// ── 스티커 아이템 (절대 위치 % 기반) ─────────────────────────────────────────

type StickerItemProps = {
  post: PostData;
  index: number;
  baseRotate: number;
  defaultXPct: number;
  defaultYPct: number;
  savedPos: StickerPos | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDragEnd: (slug: string, xPct: number, yPct: number, rotate: number) => void;
  onImageClick: (src: string) => void;
};

function StickerItem({
  post, index, baseRotate, defaultXPct, defaultYPct,
  savedPos, containerRef, onDragEnd, onImageClick,
}: StickerItemProps) {
  const xPct = savedPos?.xPct ?? defaultXPct;
  const yPct = savedPos?.yPct ?? defaultYPct;
  const rotate = savedPos?.rotate ?? baseRotate;

  // 드래그 오프셋(px) — drag end 후 즉시 0으로 리셋
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 스티커 자체 크기 측정용 ref
  const stickerRef = useRef<HTMLDivElement>(null);

  // savedPos 외부 변경(JSON 로드, 초기화) 시 동기화
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [savedPos, x, y]);

  const [isDragging, setIsDragging] = useState(false);
  const dragDistanceRef = useRef(0);

  return (
    <motion.div
      ref={stickerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.06 * index }}
      drag
      dragMomentum={false}
      dragElastic={0.04}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
        zIndex: isDragging ? 100 : 10,
        display: 'inline-flex',
        flexDirection: 'column',
        touchAction: 'none',
        willChange: 'transform',
      }}
      onDragStart={() => {
        setIsDragging(true);
        dragDistanceRef.current = 0;
      }}
      onDrag={(_, info) => {
        // 드래그 누적 거리 추적
        dragDistanceRef.current = Math.max(
          dragDistanceRef.current,
          Math.abs(info.offset.x) + Math.abs(info.offset.y)
        );
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        const moved = dragDistanceRef.current > 8;
        if (moved) {
          const container = containerRef.current;
          const stickerRect = stickerRef.current?.getBoundingClientRect();
          if (!container || !stickerRect) return;

          // padding을 제외한 실제 콘텐츠 영역 사용
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;

          // 컨테이너의 padding 값 계산
          const computedStyle = window.getComputedStyle(container);
          const paddingLeft = parseFloat(computedStyle.paddingLeft);
          const paddingTop = parseFloat(computedStyle.paddingTop);

          // 실제 드래그 가능 영역 (padding 제외)
          const contentWidth = containerWidth - paddingLeft - parseFloat(computedStyle.paddingRight);
          const contentHeight = containerHeight - paddingTop - parseFloat(computedStyle.paddingBottom);

          console.log(`🔍 Container: ${containerWidth}px (content: ${contentWidth}px), Sticker: ${stickerRect.width}px`);

          // 스티커 크기를 콘텐츠 영역 대비 %로 계산
          const stickerWidthPct = (stickerRect.width / contentWidth) * 100;
          const stickerHeightPct = (stickerRect.height / contentHeight) * 100;

          // 픽셀 이동량 → % 변환 (콘텐츠 영역 기준)
          const deltaXPct = (info.offset.x / contentWidth) * 100;
          const deltaYPct = (info.offset.y / contentHeight) * 100;

          // 중앙 정렬이므로 스티커 절반만큼 여유 확보
          const maxXPct = 100 - stickerWidthPct / 2;
          const newXPct = Math.max(stickerWidthPct / 2, Math.min(maxXPct, xPct + deltaXPct));
          const newYPct = Math.max(stickerHeightPct / 2, Math.min(100 - stickerHeightPct / 2, yPct + deltaYPct));

          console.log(`📍 ${post.slug}: X=${xPct.toFixed(1)}% → ${newXPct.toFixed(1)}% (최대 ${maxXPct.toFixed(1)}%)`);

          // motion value 먼저 리셋 → CSS left/top 업데이트와 동일 프레임에서 처리
          x.set(0);
          y.set(0);
          onDragEnd(post.slug, newXPct, newYPct, rotate);
        }
        // 짧은 지연 후 드래그 거리 리셋 (클릭 이벤트 차단용)
        setTimeout(() => {
          dragDistanceRef.current = 0;
        }, 100);
      }}
    >
      {post.image ? (
        <>
          {/* 스티커 이미지 — clamp로 반응형 크기 */}
          <motion.button
            className="block will-change-transform cursor-none p-0"
            style={{
              rotate,
              lineHeight: 0,
              borderRadius: '0.75rem',
              width: 'clamp(8rem, 18vw, 20rem)',
              filter: isDragging
                ? 'drop-shadow(0 20px 50px rgba(0,0,0,0.75))'
                : 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
              transition: 'filter 0.2s ease',
            }}
            whileHover={isDragging ? {} : { rotate: 0, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => {
              // 드래그 거리가 8px 미만일 때만 클릭으로 인식
              if (dragDistanceRef.current <= 8) {
                onImageClick(post.image!);
              }
            }}
          >
            <Image
              src={post.image}
              alt={post.slug}
              width={800}
              height={800}
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '0.75rem' }}
              sizes="(max-width: 480px) 8rem, (max-width: 1280px) 18vw, 20rem"
              draggable={false}
            />
          </motion.button>

          {/* 메모 텍스트 */}
          {post.content && (
            <motion.div
              className="mt-[0.8rem] text-center"
              style={{ maxWidth: 'clamp(9rem, 20vw, 22rem)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * index + 0.25 }}
            >
              <ReactMarkdown components={memoComponents}>{post.content}</ReactMarkdown>
            </motion.div>
          )}
        </>
      ) : (
        /* 텍스트 전용 */
        <div style={{ rotate: `${rotate}deg` }}>
          <ReactMarkdown components={memoComponents}>{post.content!}</ReactMarkdown>
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
