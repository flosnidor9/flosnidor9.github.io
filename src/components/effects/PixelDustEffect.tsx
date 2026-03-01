'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

type Particle = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  delay: number;
};

type Props = {
  isActive: boolean;
  originRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
};

const PARTICLE_COUNT = 40;
const COLORS = [
  'rgba(147, 197, 253, 0.9)', // blue-300
  'rgba(196, 181, 253, 0.9)', // purple-300
  'rgba(167, 243, 208, 0.9)', // green-300
  'rgba(253, 186, 116, 0.9)', // orange-300
  'rgba(252, 211, 77, 0.9)',  // yellow-300
];

export default function PixelDustEffect({ isActive, originRef, targetRef, onComplete }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (isActive && originRef.current && targetRef.current) {
      const originRect = originRef.current.getBoundingClientRect();
      const targetRect = targetRef.current.getBoundingClientRect();

      const newParticles: Particle[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // 버튼 영역 내 랜덤 시작점
        const startX = originRect.left + Math.random() * originRect.width;
        const startY = originRect.top + Math.random() * originRect.height;

        // 타임라인 영역 내 랜덤 종료점
        const endX = targetRect.left + Math.random() * targetRect.width;
        const endY = targetRect.top + Math.random() * Math.min(targetRect.height, 200);

        newParticles.push({
          id: i,
          x: startX,
          y: startY,
          targetX: endX,
          targetY: endY,
          size: 3 + Math.random() * 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.2,
        });
      }

      setParticles(newParticles);
      setCompletedCount(0);
    } else if (!isActive) {
      setParticles([]);
      setCompletedCount(0);
    }
  }, [isActive, originRef, targetRef]);

  useEffect(() => {
    if (completedCount >= PARTICLE_COUNT && onComplete) {
      onComplete();
    }
  }, [completedCount, onComplete]);

  const handleAnimationComplete = () => {
    setCompletedCount((prev) => prev + 1);
  };

  return (
    <AnimatePresence>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            position: 'fixed',
            left: particle.x,
            top: particle.y,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            left: particle.targetX,
            top: particle.targetY,
            scale: [1, 1.5, 0.5, 0],
            opacity: [1, 1, 0.8, 0],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            delay: particle.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={handleAnimationComplete}
          style={{
            position: 'fixed',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}
    </AnimatePresence>
  );
}
