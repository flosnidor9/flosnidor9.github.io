'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  animate,
} from 'framer-motion';

const CURSOR_SIZE = 12;         // 기본 커서 크기 (px)
const HOVER_SCALE = 2.5;        // 호버 시 확대 배율
const MAX_STRETCH = 2.0;        // 최대 늘어남 비율
const VELOCITY_DAMPING = 120;   // 속도 감쇠 계수

/**
 * 리퀴드 벡터 포인터
 * - 부드러운 스프링 추적
 * - 이동 방향으로 쫀득한 왜곡
 * - 호버/클릭 인터랙션
 * - 정지 시 심장박동 효과
 * - 히어로 섹션/모바일에서는 숨김
 */
export default function LiquidCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(true);
  const [isOverHero, setIsOverHero] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const breathingRef = useRef<ReturnType<typeof animate> | null>(null);

  // 마우스 위치 (즉각 반응)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 부드러운 스프링 추적
  const springConfig = { stiffness: 300, damping: 28, mass: 0.4 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  // 속도 계산
  const velocityX = useVelocity(cursorX);
  const velocityY = useVelocity(cursorY);

  // 이동 방향 각도 (라디안 → 도)
  const rotation = useTransform(
    [velocityX, velocityY],
    ([vx, vy]: number[]) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < 10) return 0;
      return Math.atan2(vy, vx) * (180 / Math.PI);
    }
  );

  // 속도 기반 늘어남 (이동 방향으로)
  const stretch = useTransform(
    [velocityX, velocityY],
    ([vx, vy]: number[]) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      return 1 + Math.min(speed / VELOCITY_DAMPING, MAX_STRETCH - 1);
    }
  );

  // 늘어날 때 수직 방향으로 압축 (부피 보존)
  const squeeze = useTransform(stretch, (s) => 1 / Math.sqrt(s));

  // 심장박동 효과용 스케일
  const breathScale = useMotionValue(1);

  // 심장박동 시작
  const startBreathing = useCallback(() => {
    breathingRef.current = animate(breathScale, [1, 1.2, 1, 1.1, 1], {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    });
  }, [breathScale]);

  // 심장박동 중지
  const stopBreathing = useCallback(() => {
    if (breathingRef.current) {
      breathingRef.current.stop();
      breathingRef.current = null;
    }
    breathScale.set(1);
  }, [breathScale]);

  // 유휴 상태 타이머 리셋
  const resetIdleTimer = useCallback(() => {
    stopBreathing();

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      startBreathing();
    }, 2000);
  }, [startBreathing, stopBreathing]);

  // 히어로 섹션 위인지 체크 (실제로 보이는 최상위 요소 기준)
  const checkIfOverHero = useCallback((clientX: number, clientY: number) => {
    // 실제 커서 위치의 최상위 요소 확인
    const topElement = document.elementFromPoint(clientX, clientY);
    if (!topElement) {
      setIsOverHero(false);
      return;
    }

    // data-hide-cursor 속성이 있거나 cursor-none 클래스가 있는 요소인지 체크
    const heroElement =
      (topElement as HTMLElement).closest?.('[data-hide-cursor]') ||
      (topElement as HTMLElement).closest?.('.cursor-none');

    // 뮤직 플레이어, 카드, 유리 패널 위에 있으면 커서 표시
    const isOverInteractive =
      (topElement as HTMLElement).closest?.('.glass-player-panel') ||
      (topElement as HTMLElement).closest?.('.featured-card') ||
      (topElement as HTMLElement).closest?.('.mac-glass-window') ||
      (topElement as HTMLElement).closest?.('button') ||
      (topElement as HTMLElement).closest?.('a');

    setIsOverHero(!!heroElement && !isOverInteractive);
  }, []);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
    setIsVisible(true);
    resetIdleTimer();
    checkIfOverHero(e.clientX, e.clientY);
  }, [mouseX, mouseY, resetIdleTimer, checkIfOverHero]);

  // 마우스 진입/이탈
  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);

  // 클릭 핸들러
  const handleMouseDown = useCallback(() => setIsClicking(true), []);
  const handleMouseUp = useCallback(() => setIsClicking(false), []);

  // 포인터 디바이스 감지 (마우스 vs 터치)
  useEffect(() => {
    // CSS media query로 정밀 포인터(마우스) 감지
    const hasFinPointer = window.matchMedia('(pointer: fine)').matches;
    // 터치 포인트 체크
    const hasTouchPoints = navigator.maxTouchPoints > 0;
    // coarse pointer (터치) 체크
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // 정밀 포인터가 있고 coarse가 primary가 아닌 경우만 커서 표시
    // (터치 + 마우스 둘 다 있는 기기에서는 마우스 사용 시 표시)
    const shouldShowCursor = hasFinPointer && !hasCoarsePointer;

    // 또는 터치만 있는 기기에서는 숨김
    setIsPointerDevice(shouldShowCursor || (hasFinPointer && !hasTouchPoints));

    // 미디어 쿼리 변경 감지
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPointerDevice(e.matches && !window.matchMedia('(pointer: coarse)').matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 호버 감지 (클릭 가능한 요소)
  useEffect(() => {
    if (!isPointerDevice) return;

    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        window.getComputedStyle(target).cursor === 'pointer';

      setIsHovering(!!isClickable);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousemove', checkHover);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousemove', checkHover);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      stopBreathing();
    };
  }, [isPointerDevice, handleMouseMove, handleMouseEnter, handleMouseLeave, handleMouseDown, handleMouseUp, stopBreathing]);

  // 포인터 디바이스가 아니면 렌더링 안함
  if (!isPointerDevice) {
    return null;
  }

  // 호버/클릭 상태에 따른 스케일 계산
  const interactionScale = isClicking ? 0.6 : isHovering ? HOVER_SCALE : 1;

  // 히어로 위거나 보이지 않으면 opacity 0
  const shouldShow = isVisible && !isOverHero;

  return (
    <>
      {/* 메인 커서 - 위치만 담당 */}
      <motion.div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          zIndex: 9999,
          opacity: shouldShow ? 1 : 0,
        }}
      >
        {/* 회전 레이어 - 이동 방향으로 회전 */}
        <motion.div
          className="w-full h-full"
          style={{
            rotate: rotation,
          }}
        >
          {/* 늘어남 레이어 - 로컬 X축 방향으로 늘어남 */}
          <motion.div
            className="w-full h-full"
            style={{
              scaleX: stretch,
              scaleY: squeeze,
            }}
          >
            {/* 내부 원 - 호버/클릭/심장박동 스케일 적용 */}
            <motion.div
              className="w-full h-full rounded-full"
              style={{
                background: '#ffffff',
                scale: breathScale,
                mixBlendMode: 'difference',
              }}
              animate={{
                scale: interactionScale,
              }}
              transition={{
                scale: {
                  type: 'spring',
                  stiffness: 500,
                  damping: 25,
                },
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 클릭 리플 이펙트 */}
      {isClicking && shouldShow && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none rounded-full"
          style={{
            width: CURSOR_SIZE * 2,
            height: CURSOR_SIZE * 2,
            x: cursorX,
            y: cursorY,
            translateX: '-50%',
            translateY: '-50%',
            zIndex: 9998,
            border: '1px solid rgba(255, 255, 255, 0.6)',
            mixBlendMode: 'difference',
          }}
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      )}
    </>
  );
}
