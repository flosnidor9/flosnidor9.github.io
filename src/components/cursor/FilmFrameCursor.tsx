'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';

/**
 * 필름 프레임 커서
 * 영화 필름 한 컷 모양의 커서 (양쪽에 스프로킷 구멍)
 */
export default function FilmFrameCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(true);
  const [isClicking, setIsClicking] = useState(false);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    setIsVisible(true);
  }, [cursorX, cursorY]);

  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);
  const handleMouseDown = useCallback(() => setIsClicking(true), []);
  const handleMouseUp = useCallback(() => setIsClicking(false), []);

  useEffect(() => {
    const hasFinPointer = window.matchMedia('(pointer: fine)').matches;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasTouchPoints = navigator.maxTouchPoints > 0;
    const shouldShowCursor = hasFinPointer && !hasCoarsePointer;

    setIsPointerDevice(shouldShowCursor || (hasFinPointer && !hasTouchPoints));

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPointerDevice(e.matches && !window.matchMedia('(pointer: coarse)').matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isPointerDevice) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPointerDevice, handleMouseMove, handleMouseEnter, handleMouseLeave, handleMouseDown, handleMouseUp]);

  if (!isPointerDevice) {
    return null;
  }

  return (
    <motion.div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none"
      style={{
        x: cursorX,
        y: cursorY,
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <motion.svg
        width="40"
        height="32"
        viewBox="0 0 40 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))',
        }}
        animate={{
          scale: isClicking ? 0.85 : 1,
          rotate: isClicking ? -3 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
      >
        {/* 필름 프레임 배경 */}
        <rect
          x="0"
          y="0"
          width="40"
          height="32"
          rx="2"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="1"
        />

        {/* 필름 이미지 영역 (중앙 밝은 부분) */}
        <rect
          x="8"
          y="4"
          width="24"
          height="24"
          rx="1"
          fill="rgba(255, 255, 255, 0.08)"
        />

        {/* 왼쪽 스프로킷 구멍들 */}
        <rect x="2" y="3" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="2" y="10" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="2" y="18" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="2" y="25" width="3" height="4" rx="0.5" fill="#0a0a0a" />

        {/* 오른쪽 스프로킷 구멍들 */}
        <rect x="35" y="3" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="35" y="10" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="35" y="18" width="3" height="4" rx="0.5" fill="#0a0a0a" />
        <rect x="35" y="25" width="3" height="4" rx="0.5" fill="#0a0a0a" />

        {/* 중앙 십자 포인터 */}
        <line x1="20" y1="12" x2="20" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="16" y1="16" x2="24" y2="16" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      </motion.svg>
    </motion.div>
  );
}
