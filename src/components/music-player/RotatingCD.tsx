'use client';

import { motion, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import Image from 'next/image';

type Props = {
  albumArt: string;
  isPlaying: boolean;
  normX: MotionValue<number>;
  normY: MotionValue<number>;
};

/**
 * 회전하는 CD + 홀로그램 반사광 효과
 * - conic-gradient로 무지개빛 홀로그램
 * - normX/normY로 반사광 각도 변화
 * - isPlaying으로 회전 애니메이션 제어
 */
export default function RotatingCD({ albumArt, isPlaying, normX, normY }: Props) {
  // normX/normY를 각도로 변환 → 홀로그램 반사광 회전
  const holoRotate = useTransform(
    [normX, normY],
    ([x, y]: number[]) => (x + y) * 180 + 45,
  );

  // 홀로그램 그라데이션 - 각도에 따라 회전
  const holoGradient = useMotionTemplate`conic-gradient(
    from ${holoRotate}deg,
    rgba(255, 0, 128, 0.15) 0deg,
    rgba(255, 128, 0, 0.15) 60deg,
    rgba(255, 255, 0, 0.15) 120deg,
    rgba(0, 255, 128, 0.15) 180deg,
    rgba(0, 128, 255, 0.15) 240deg,
    rgba(128, 0, 255, 0.15) 300deg,
    rgba(255, 0, 128, 0.15) 360deg
  )`;

  // 반사 하이라이트 위치 (FeaturedCard 패턴 재사용)
  const reflectX = useTransform(normX, [-0.5, 0.5], [70, 30]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [30, 70]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)`;

  return (
    <div className="relative" style={{ width: '14rem', height: '14rem' }}>
      {/* CD 본체 - 앨범 아트 뒤에서 오른쪽으로 삐져나옴 */}
      <motion.div
        className="absolute gpu"
        style={{
          width: '14rem',
          height: '14rem',
          borderRadius: '50%',
          left: '3rem', // 앨범 아트 뒤에서 오른쪽으로 삐져나옴
        }}
        animate={{
          rotate: isPlaying ? 360 : 0,
        }}
        transition={{
          rotate: {
            duration: 4,
            ease: 'linear',
            repeat: Infinity,
          },
        }}
      >
        {/* CD 베이스 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at center, #1a1a1a 28%, #333 30%, #1a1a1a 32%, #222 100%)
            `,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        />

        {/* CD 트랙 라인 (동심원) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              repeating-radial-gradient(
                circle at center,
                transparent 30%,
                rgba(255,255,255,0.03) 31%,
                transparent 32%
              )
            `,
          }}
        />

        {/* 홀로그램 레이어 */}
        <motion.div
          className="absolute inset-0 rounded-full gpu"
          style={{
            background: holoGradient,
            mixBlendMode: 'screen',
          }}
        />

        {/* 반사 하이라이트 */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: reflectGradient,
          }}
        />

        {/* CD 중앙 홀 */}
        <div
          className="absolute rounded-full"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, #0a0a0a 40%, #1a1a1a 70%, #333 100%)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
          }}
        />
      </motion.div>

      {/* 앨범 아트 (CD 위에 겹침) */}
      <div
        className="absolute rounded-[1rem] overflow-hidden"
        style={{
          width: '12rem',
          height: '12rem',
          top: '1rem',
          left: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <Image
          src={albumArt}
          alt="Album Art"
          fill
          className="object-cover"
          unoptimized // YouTube 썸네일은 외부 URL
        />

        {/* 앨범 아트 반사 하이라이트 */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: reflectGradient,
          }}
        />
      </div>
    </div>
  );
}
