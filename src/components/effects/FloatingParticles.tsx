'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  xOffset: number;
  yOffset: number;
}

/**
 * 먼지처럼 떠다니는 파티클 효과
 * 배경에 작은 점들이 일렁이며 떠다님
 */
export default function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // 파티클 생성
    const newParticles: Particle[] = [];
    const particleCount = 80; // 파티클 개수 증가

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // 0 ~ 100% (vw)
        y: Math.random() * 100, // 0 ~ 100% (vh)
        size: 1.5 + Math.random() * 2.5, // 1.5 ~ 4px (작게)
        duration: 6 + Math.random() * 8, // 6 ~ 14초 (더 빠르게)
        delay: Math.random() * 5, // 0 ~ 5초
        xOffset: (Math.random() - 0.5) * 300, // -150 ~ 150px (3배 더 많이)
        yOffset: (Math.random() - 0.5) * 300, // -150 ~ 150px (3배 더 많이)
      });
    }

    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: '#ffffff',
          }}
          initial={{ opacity: 0.5 }}
          animate={{
            x: [0, particle.xOffset, 0],
            y: [0, particle.yOffset, 0],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
