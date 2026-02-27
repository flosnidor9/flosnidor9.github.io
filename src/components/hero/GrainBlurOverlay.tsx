'use client';

import { motion, useMotionTemplate, useTransform, type MotionValue } from 'framer-motion';

type Props = {
  smoothX: MotionValue<number>;
  smoothY: MotionValue<number>;
};

export default function GrainBlurOverlay({ smoothX, smoothY }: Props) {
  // 커서(x, y)를 135° 대각선 축에 투영 → 그라디언트 위치(%) 계산
  // 135° 그라디언트의 길이 ≈ (W + H) * √2/2, 투영값 ≈ (x + y) / (W + H) * 100
  const diagPos = useTransform([smoothX, smoothY], ([x, y]: number[]) => {
    if (x === -9999) return 50; // 초기 상태(마우스/자이로 X) → 중앙에 표시
    const W = window.innerWidth;
    const H = window.innerHeight;
    return (x + y) / (W + H) * 100;
  });

  // 라디얼 이레이저와 동일한 페더 비율을 대각선 밴드에 적용
  const mask = useMotionTemplate`linear-gradient(135deg,
    black                           0%,
    black                           calc(${diagPos}% - 30%),
    rgba(0,0,0,0.82)                calc(${diagPos}% - 22%),
    rgba(0,0,0,0.35)                calc(${diagPos}% - 14%),
    transparent                     calc(${diagPos}% -  4%),
    transparent                     calc(${diagPos}% +  4%),
    rgba(0,0,0,0.35)                calc(${diagPos}% + 14%),
    rgba(0,0,0,0.82)                calc(${diagPos}% + 22%),
    black                           calc(${diagPos}% + 30%),
    black                           100%
  )`;

  return (
    <>
      {/* 블러 레이어 — 미세 쿨톤 틴트로 서리 유리 색감 */}
      <motion.div
        className="absolute inset-0 gpu pointer-events-none"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          background: 'rgba(208, 218, 235, 0.055)',
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      {/* 그레인 레이어 */}
      <motion.div
        className="absolute inset-0 grain-texture gpu pointer-events-none"
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </>
  );
}
