'use client';

import { motion, useMotionTemplate, type MotionValue } from 'framer-motion';

const ERASER_RADIUS = 500;

type Props = {
  smoothX: MotionValue<number>;
  smoothY: MotionValue<number>;
};

export default function GrainBlurOverlay({ smoothX, smoothY }: Props) {
  const mask = useMotionTemplate`radial-gradient(circle ${ERASER_RADIUS}px at ${smoothX}px ${smoothY}px, transparent 0%, transparent 28%, rgba(0,0,0,0.35) 52%, rgba(0,0,0,0.82) 74%, black 100%)`;

  return (
    <>
      {/* 블러 레이어 */}
      <motion.div
        className="absolute inset-0 gpu pointer-events-none"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
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
