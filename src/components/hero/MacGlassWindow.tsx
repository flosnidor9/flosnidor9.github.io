'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionTemplate,
  useTransform,
  useSpring,
  type MotionValue,
} from 'framer-motion';

const TILT_RANGE = 12; // 틸트 각도 (도)
const PADDING = 60; // 화면 여백 (px)

type Props = {
  normX: MotionValue<number>;
  normY: MotionValue<number>;
  aspectRatio?: number; // 이미지 비율 (width / height)
  imageSrc?: string | null; // 유리창 안에 표시할 이미지
  children?: React.ReactNode;
};

/**
 * macOS 스타일 유리 패널
 * - Traffic Light 버튼 (빨강/노랑/초록)
 * - 홀로그램 반사 효과 (자이로/마우스 연동)
 * - 마우스/자이로에 따른 3D 틸트 (눌리는 효과)
 */
export default function MacGlassWindow({ normX, normY, aspectRatio = 16 / 10, imageSrc, children }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // 화면 크기와 이미지 비율을 비교해서 최대 크기 계산
  useEffect(() => {
    const calculateSize = () => {
      const maxWidth = window.innerWidth - PADDING * 2;
      const maxHeight = window.innerHeight - PADDING * 2;

      // 이미지가 최대한 크게 들어가도록 계산 (object-fit: contain 로직)
      const screenRatio = maxWidth / maxHeight;

      let contentWidth: number;
      let contentHeight: number;

      if (aspectRatio > screenRatio) {
        // 이미지가 화면보다 가로로 더 긴 경우 → 너비 기준
        contentWidth = maxWidth;
        contentHeight = maxWidth / aspectRatio;
      } else {
        // 이미지가 화면보다 세로로 더 긴 경우 → 높이 기준
        contentHeight = maxHeight;
        contentWidth = maxHeight * aspectRatio;
      }

      setWindowSize({
        width: contentWidth,
        height: contentHeight,
      });
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, [aspectRatio]);

  // 부드러운 스프링 적용
  const springConfig = { stiffness: 150, damping: 20 };
  const smoothX = useSpring(normX, springConfig);
  const smoothY = useSpring(normY, springConfig);

  // 홀로그램 하이라이트 위치 계산
  const highlightX = useTransform(smoothX, [-0.5, 0.5], [0, 100]);
  const highlightY = useTransform(smoothY, [-0.5, 0.5], [0, 100]);

  // 홀로그램 그라디언트 - 위치가 동적으로 변함
  const hologramGradient = useMotionTemplate`
    radial-gradient(
      ellipse 80% 60% at ${highlightX}% ${highlightY}%,
      rgba(255, 120, 180, 0.15) 0%,
      rgba(120, 200, 255, 0.10) 25%,
      rgba(180, 255, 120, 0.08) 50%,
      transparent 70%
    )
  `;

  // 3D 틸트 효과 - 마우스 위치가 눌리는 것처럼
  // normX 양수(오른쪽) → 오른쪽이 눌림 → rotateY 음수
  // normY 양수(아래) → 아래가 눌림 → rotateX 양수
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]);

  // 깊이감을 위한 Z축 이동
  const translateZ = useTransform(
    [smoothX, smoothY],
    ([x, y]: number[]) => {
      const distance = Math.sqrt(x * x + y * y);
      return -distance * 30; // 중앙에서 멀어질수록 뒤로
    }
  );

  // 동적 그림자 - 틸트 방향에 따라 변함
  const shadowX = useTransform(smoothX, [-0.5, 0.5], [30, -30]);
  const shadowY = useTransform(smoothY, [-0.5, 0.5], [30, -30]);
  const boxShadow = useMotionTemplate`
    ${shadowX}px ${shadowY}px 60px rgba(0, 0, 0, 0.4),
    0 10px 40px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
  `;

  return (
    <motion.div
      ref={windowRef}
      className="mac-glass-window"
      style={{
        width: windowSize.width || 'auto',
        height: windowSize.height || 'auto',
        rotateX,
        rotateY,
        translateZ,
        transformStyle: 'preserve-3d',
        boxShadow,
      }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 유리판 내부 - 선명한 이미지 */}
      <div
        className="relative w-full h-full overflow-hidden rounded-[1.5rem]"
      >
        {imageSrc && (
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
        {children}
      </div>

      {/* 홀로그램 반사 오버레이 */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[1.5rem]"
        style={{
          background: hologramGradient,
          mixBlendMode: 'overlay',
        }}
      />

      {/* 상단 엣지 하이라이트 */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        }}
      />
    </motion.div>
  );
}
