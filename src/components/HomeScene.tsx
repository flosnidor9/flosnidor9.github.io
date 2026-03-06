'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import MacGlassWindow, { type MacGlassWindowHandle } from './hero/MacGlassWindow';
import Clock from './hero/Clock';
import GyroPermissionPrompt from './hero/GyroPermissionPrompt';
import SidebarMusicPlayer from './sidebar/SidebarMusicPlayer';
import { useGyroscope } from '@/hooks/useGyroscope';
import { musicTracks } from '@/lib/data/music';
import { pickHeroImage } from '@/lib/heroImage';

const TRANSLATE_RANGE = 30;
const TILT_RANGE = 2;

type Props = {
  imagePaths: string[];
  stickerPaths?: string[];
};

type StickerPosition = {
  src: string;
  x: number; // MacGlassWindow 중심 기준 상대 좌표 (-50 ~ 50, 0 = 중심)
  y: number; // MacGlassWindow 중심 기준 상대 좌표 (-50 ~ 50, 0 = 중심)
  size: number; // MacGlassWindow 크기 대비 % (예: 15 = MacGlassWindow의 15%)
  rotation: number;
  delay: number;
};

type StickerItemProps = {
  sticker: StickerPosition;
  index: number;
  editMode: boolean;
  sectionRef: React.RefObject<HTMLElement | null>;
  windowRect: DOMRect | null;
  onUpdate: (props: Partial<StickerPosition>) => void;
  resizingIndex: number | null;
  setResizingIndex: (index: number | null) => void;
  initialSize: number;
  setInitialSize: (size: number) => void;
};

export default function HomeScene({ imagePaths, stickerPaths = [] }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState(16 / 10);
  const [stickers, setStickers] = useState<StickerPosition[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fileOrder, setFileOrder] = useState<StickerPosition[] | null>(null);
  const [isManualOrder, setIsManualOrder] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [initialSize, setInitialSize] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const macGlassRef = useRef<MacGlassWindowHandle>(null);
  const [windowRect, setWindowRect] = useState<DOMRect | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const src = pickHeroImage(imagePaths);
    if (!src) return;

    setImageSrc(src);

    const img = new window.Image();
    img.onload = () => {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = src;
  }, [imagePaths]);

  // MacGlassWindow 위치/크기 추적
  useEffect(() => {
    const updateWindowRect = () => {
      // MacGlassWindow의 크기 계산이 완료될 때까지 대기
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = macGlassRef.current?.getRect();
          if (rect) setWindowRect(rect);
        });
      });
    };

    updateWindowRect();

    // 이벤트 리스너 등록
    const handleResize = () => {
      updateWindowRect();
      // 추가로 약간의 딜레이 후 한 번 더 업데이트 (브라우저 렌더링 완료 대기)
      setTimeout(updateWindowRect, 100);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    document.addEventListener('mozfullscreenchange', handleResize);
    document.addEventListener('MSFullscreenChange', handleResize);

    // 초기 렌더링 후 위치 확인
    const timer = setTimeout(updateWindowRect, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
      document.removeEventListener('mozfullscreenchange', handleResize);
      document.removeEventListener('MSFullscreenChange', handleResize);
      clearTimeout(timer);
    };
  }, [imageSrc, imageAspect]);

  // Shift+E 키보드 이벤트
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'KeyE') {
        event.preventDefault();
        setEditMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // stickers.json 파일 로드
  useEffect(() => {
    if (stickerPaths.length === 0) return;

    let cancelled = false;

    fetch('/images/Sticker/stickers.json')
      .then((res) => {
        if (!res.ok) throw new Error('no stickers file');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('invalid stickers data');
        console.log('✅ Loaded stickers.json:', data.length, 'items');
        setFileOrder(data);
      })
      .catch((err) => {
        console.log('⚠️ Failed to load stickers.json:', err.message);
        if (!cancelled) setFileOrder(null);
      });

    return () => {
      cancelled = true;
    };
  }, [stickerPaths]);

  // Sticker 위치 초기화 (파일 또는 랜덤)
  useEffect(() => {
    if (stickerPaths.length === 0) return;
    if (isManualOrder) return;

    // 파일이 있으면 파일 사용
    if (fileOrder && fileOrder.length > 0) {
      setStickers(fileOrder);
      return;
    }

    // 없으면 랜덤 생성 (MacGlassWindow 중심 기준)
    const positions: StickerPosition[] = stickerPaths.map((src, index) => {
      // MacGlassWindow 주변 4개 영역에 배치 (중앙은 피함)
      const zone = index % 4;
      let x = 0;
      let y = 0;

      switch (zone) {
        case 0: // 좌상
          x = Math.random() * 25 - 50; // -50 ~ -25
          y = Math.random() * 25 - 50; // -50 ~ -25
          break;
        case 1: // 우상
          x = Math.random() * 25 + 25; // 25 ~ 50
          y = Math.random() * 25 - 50; // -50 ~ -25
          break;
        case 2: // 좌하
          x = Math.random() * 25 - 50; // -50 ~ -25
          y = Math.random() * 25 + 25; // 25 ~ 50
          break;
        case 3: // 우하
          x = Math.random() * 25 + 25; // 25 ~ 50
          y = Math.random() * 25 + 25; // 25 ~ 50
          break;
      }

      return {
        src,
        x,
        y,
        size: 15, // 15% (MacGlassWindow 크기 대비, 모든 스티커 동일)
        rotation: 0,
        delay: index * 0.1,
      };
    });

    setStickers(positions);
  }, [stickerPaths, fileOrder, isManualOrder]);

  // ── 자이로센서 훅 ─────────────────────────────────────────
  const gyro = useGyroscope();
  const isGyroActive = gyro.permissionState === 'granted';

  // ── 패럴랙스 스프링 ───────────────────────────────────────
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const parallaxX = useSpring(normX, { stiffness: 60, damping: 20 });
  const parallaxY = useSpring(normY, { stiffness: 60, damping: 20 });
  const translateX = useTransform(parallaxX, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const translateY = useTransform(parallaxY, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const rotateY = useTransform(parallaxX, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]);
  const rotateX = useTransform(parallaxY, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]);

  // 자이로 활성화 시 → normX/normY를 자이로 값으로 구동
  useEffect(() => {
    if (!isGyroActive) return;
    const u1 = gyro.normX.on('change', (v) => normX.set(v));
    const u2 = gyro.normY.on('change', (v) => normY.set(v));
    return () => { u1(); u2(); };
  }, [isGyroActive, gyro.normX, gyro.normY, normX, normY]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    normX.set((e.clientX - rect.left) / rect.width - 0.5);
    normY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [normX, normY]);

  const onMouseLeave = useCallback(() => {
    normX.set(0);
    normY.set(0);
  }, [normX, normY]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isGyroActive) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    normX.set((t.clientX - rect.left) / rect.width - 0.5);
    normY.set((t.clientY - rect.top) / rect.height - 0.5);
  }, [isGyroActive, normX, normY]);

  const onTouchEnd = useCallback(() => {
    if (isGyroActive) return;
    normX.set(0);
    normY.set(0);
  }, [isGyroActive, normX, normY]);

  const track = musicTracks[0];

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(stickers, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <section
      ref={sectionRef}
      className={`h-screen w-full overflow-hidden ${editMode ? 'cursor-default' : 'cursor-none'}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        className="relative h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: '1000px' }}
      >
        {/* ═══ 레이어 1: 블러된 배경 (패럴랙스) ═══ */}
        {imageSrc && (
          <motion.div
            className="absolute inset-0"
            style={{
              translateX,
              translateY,
              rotateX,
              rotateY,
            }}
          >
            <div className="absolute inset-0 hero-blur-bg">
              <Image src={imageSrc} alt="" fill className="object-cover" priority />
            </div>
          </motion.div>
        )}

        {/* ═══ 레이어 2: 그레인 텍스처 ═══ */}
        <div className="absolute inset-0 grain-texture pointer-events-none" />

        {/* ═══ 레이어 3: Sticker 배치 ═══ */}
        {windowRect && stickers.map((sticker, index) => (
          <StickerItem
            key={sticker.src}
            sticker={sticker}
            index={index}
            editMode={editMode}
            sectionRef={sectionRef}
            windowRect={windowRect}
            onUpdate={(newProps) => {
              setIsManualOrder(true);
              setStickers((prev) =>
                prev.map((s, i) => (i === index ? { ...s, ...newProps } : s))
              );
            }}
            resizingIndex={resizingIndex}
            setResizingIndex={setResizingIndex}
            initialSize={initialSize}
            setInitialSize={setInitialSize}
          />
        ))}

        {/* ═══ 메인 레이아웃: 음악 플레이어 + 중앙 윈도우 ═══ */}
        <div className="relative h-full w-full flex items-center justify-center px-[2rem] md:px-[3rem] lg:px-[4rem]">
          {/* 좌측 사이드바: 음악 플레이어 */}
          <div className="hidden md:flex flex-col gap-[1rem] w-[12rem] lg:w-[14rem] flex-shrink-0 z-20">
            {track && (
              <SidebarMusicPlayer
                track={track}
                normX={parallaxX}
                normY={parallaxY}
              />
            )}
          </div>

          {/* 중앙: MacGlassWindow */}
          <div className="flex-1 flex items-center justify-center z-10 px-[1rem] md:px-[2rem]">
            <MacGlassWindow
              ref={macGlassRef}
              normX={parallaxX}
              normY={parallaxY}
              aspectRatio={imageAspect}
              imageSrc={imageSrc}
            />
          </div>

          {/* 우측 공간 (좌우 대칭 유지용) */}
          <div className="hidden md:block w-[12rem] lg:w-[14rem] flex-shrink-0" />
        </div>

        {/* ═══ 시계 (우측 하단) ═══ */}
        <Clock />

        {/* ═══ 모바일: 하단 음악 플레이어 (바 형태) ═══ */}
        <div className="md:hidden absolute bottom-[0.5rem] left-0 right-0 px-[0.75rem] z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {track && (
              <SidebarMusicPlayer
                track={track}
                normX={parallaxX}
                normY={parallaxY}
                variant="bar"
              />
            )}
          </motion.div>
        </div>

        {/* ═══ 그레인 (최상위) ═══ */}
        <div className="absolute inset-0 grain-texture pointer-events-none" style={{ zIndex: 30 }} />

        {/* ═══ 자이로 권한 요청 프롬프트 (iOS 모바일 전용) ═══ */}
        <AnimatePresence>
          {gyro.permissionState === 'unknown' && (
            <GyroPermissionPrompt onRequest={gyro.requestPermission} />
          )}
        </AnimatePresence>
      </motion.div>
    </section>

      {/* ═══ 편집 모드 UI (Portal) ═══ */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {editMode && (
              <motion.div
                className="fixed bottom-[1.25rem] right-[1.25rem] flex flex-col gap-[0.55rem] items-end"
                style={{ zIndex: 9999 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25 }}
              >
                <p className="font-mono text-[0.7rem] text-white/75 pr-[0.2rem] bg-black/40 px-[0.75rem] py-[0.3rem] rounded-full">
                  Sticker Edit Mode · Shift+E to close
                </p>
                <p className="font-mono text-[0.68rem] text-white/60 pr-[0.2rem] bg-black/40 px-[0.75rem] py-[0.25rem] rounded-full">
                  save to: /public/images/Sticker/stickers.json
                </p>
                <button
                  onClick={handleCopyJson}
                  className="glass-card rounded-[0.8rem] px-[1rem] py-[0.55rem] font-mono text-[0.8rem] text-black/85 hover:bg-white/[0.1] transition-colors"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                >
                  {copied ? 'Copied JSON' : 'Copy stickers.json'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function StickerItem({
  sticker,
  index,
  editMode,
  sectionRef,
  windowRect,
  onUpdate,
  resizingIndex,
  setResizingIndex,
  initialSize,
  setInitialSize,
}: StickerItemProps) {
  const stickerX = useMotionValue(0);
  const stickerY = useMotionValue(0);

  if (!windowRect) return null;

  // MacGlassWindow 중심 좌표 계산
  const centerX = windowRect.left + windowRect.width / 2;
  const centerY = windowRect.top + windowRect.height / 2;

  // 스티커 절대 위치 계산 (sticker.x, sticker.y는 -50~50 범위)
  const stickerLeft = centerX + (windowRect.width * sticker.x) / 100;
  const stickerTop = centerY + (windowRect.height * sticker.y) / 100;

  // 스티커 크기 계산 (MacGlassWindow 크기 대비)
  const stickerSize = (windowRect.width * sticker.size) / 100;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${stickerLeft}px`,
        top: `${stickerTop}px`,
        width: `${stickerSize}px`,
        height: `${stickerSize}px`,
        pointerEvents: editMode ? 'auto' : 'none',
        cursor: editMode ? 'grab' : 'default',
        zIndex: editMode ? 9000 : 40,
        x: stickerX,
        y: stickerY,
        transform: 'translate(-50%, -50%)', // 스티커 중심을 계산된 위치에 맞춤
      }}
      drag={editMode}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(event, info) => {
        if (!editMode || !windowRect) return;

        // 드래그 후 절대 위치
        const currentLeft = stickerLeft + stickerX.get();
        const currentTop = stickerTop + stickerY.get();

        // MacGlassWindow 중심에서의 상대 거리 (px)
        const offsetX = currentLeft - centerX;
        const offsetY = currentTop - centerY;

        // MacGlassWindow 크기 대비 %로 변환 (-50 ~ 50)
        const newX = (offsetX / windowRect.width) * 100;
        const newY = (offsetY / windowRect.height) * 100;

        // 업데이트
        onUpdate({
          x: Math.max(-100, Math.min(100, newX)),
          y: Math.max(-100, Math.min(100, newY)),
        });

        // motion value 리셋
        stickerX.set(0);
        stickerY.set(0);
      }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: sticker.delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Image
        src={sticker.src}
        alt=""
        fill
        className="object-contain"
        draggable={false}
        loading="lazy"
      />
      {editMode && (
        <>
          {/* 파일명 표시 */}
          <div className="absolute -top-[1.5rem] left-1/2 -translate-x-1/2 bg-black/60 text-white/90 px-[0.5rem] py-[0.2rem] rounded-md text-[0.7rem] font-mono pointer-events-none whitespace-nowrap">
            {decodeURIComponent(sticker.src.split('/').pop() ?? '')}
          </div>
          {/* 테두리 표시 */}
          <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-lg pointer-events-none" />
          {/* 크기 조절 핸들 */}
          <motion.div
            className="absolute -right-[0.5rem] -bottom-[0.5rem] w-[1.5rem] h-[1.5rem] bg-white/90 rounded-full border-2 border-black/30 cursor-nwse-resize z-10 flex items-center justify-center"
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={(event) => {
              event.stopPropagation();
              setResizingIndex(index);
              setInitialSize(sticker.size);
            }}
            onDrag={(event, info) => {
              event.stopPropagation();
              if (resizingIndex !== index || !windowRect) return;

              const delta = (info.offset.x + info.offset.y) / 2;

              // 픽셀 delta를 MacGlassWindow 너비 대비 %로 변환
              const deltaPercent = (delta / windowRect.width) * 100;
              const newSize = Math.max(3, initialSize + deltaPercent); // 최소 크기만 제한, 최대 크기 제한 제거

              onUpdate({ size: newSize });
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              setResizingIndex(null);
            }}
            whileHover={{ scale: 1.2 }}
            whileDrag={{ scale: 1.3 }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-black/70">
              <path d="M1 11L11 1M4 11L11 4M7 11L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
