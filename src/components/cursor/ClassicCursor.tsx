'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';

/**
 * 고전 스타일 화살표 커서
 * Windows 95/98 스타일의 레트로 마우스 포인터
 */
export default function ClassicCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(true);
  const [isClicking, setIsClicking] = useState(false);

  // 마우스 위치 (즉각 반응)
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    setIsVisible(true);
  }, [cursorX, cursorY]);

  // 마우스 진입/이탈
  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);

  // 클릭 핸들러
  const handleMouseDown = useCallback(() => setIsClicking(true), []);
  const handleMouseUp = useCallback(() => setIsClicking(false), []);

  // 포인터 디바이스 감지
  useEffect(() => {
    const hasFinPointer = window.matchMedia('(pointer: fine)').matches;
    const hasTouchPoints = navigator.maxTouchPoints > 0;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
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
      }}
    >
      <motion.svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4))',
        }}
        animate={{
          scale: isClicking ? 0.85 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 25,
        }}
      >
        {/* 검은 테두리 (외곽선) */}
        <path
          d="M4 4 L4 26 L12 18.5 L16.5 28.5 L19.5 27 L15 17.5 L24 16.5 Z"
          fill="#000000"
          stroke="none"
        />
        {/* 흰색 내부 */}
        <path
          d="M6.5 6.5 L6.5 23 L12.5 17 L16.5 25.5 L17.5 25 L13.5 16.5 L21 15.5 Z"
          fill="#FFFFFF"
          stroke="none"
        />
      </motion.svg>
    </motion.div>
  );
}
